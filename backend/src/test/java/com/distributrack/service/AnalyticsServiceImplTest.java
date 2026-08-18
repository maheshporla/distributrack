package com.distributrack.service;

import com.distributrack.dto.response.AnalyticsResponse;
import com.distributrack.dto.response.DeliveryAnalyticsResponse;
import com.distributrack.dto.response.PaymentAnalyticsResponse;
import com.distributrack.dto.response.SalesAnalyticsResponse;
import com.distributrack.entity.*;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.*;
import com.distributrack.service.impl.AnalyticsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AnalyticsServiceImplTest {

    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final InventoryRepository inventoryRepository = mock(InventoryRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final WarehouseRepository warehouseRepository = mock(WarehouseRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);

    private final AnalyticsServiceImpl analyticsService = new AnalyticsServiceImpl(
            productRepository,
            inventoryRepository,
            orderRepository,
            orderItemRepository,
            paymentRepository,
            deliveryRepository,
            warehouseRepository,
            userRepository
    );

    private User shopkeeper;

    @BeforeEach
    void setUp() {
        shopkeeper = User.builder()
                .id(1L)
                .fullName("Shop One")
                .email("shop1@test.com")
                .phone("9000000000")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();
    }

    private Order order(Long id, OrderStatus status, String amount) {
        return Order.builder()
                .id(id)
                .orderNumber("ORD-" + id)
                .shopkeeper(shopkeeper)
                .status(status)
                .totalAmount(new BigDecimal(amount))
                .orderDate(LocalDateTime.of(2026, 8, 1, 10, 0))
                .build();
    }

    private Payment payment(Order order, PaymentStatus status, String amount) {
        return Payment.builder()
                .id(order.getId() * 10L)
                .order(order)
                .amount(new BigDecimal(amount))
                .paymentMethod("CASH")
                .paymentStatus(status)
                .transactionId("TXN-" + order.getId())
                .build();
    }

    @Test
    void revenueOnlyCountsDeliveredAndCompletedOrders() {

        List<Order> orders = List.of(
                order(1L, OrderStatus.PENDING, "100"),
                order(2L, OrderStatus.REJECTED, "200"),
                order(3L, OrderStatus.CANCELLED, "300"),
                order(4L, OrderStatus.DELIVERED, "400"),
                order(5L, OrderStatus.COMPLETED, "500")
        );

        when(orderRepository.findAll()).thenReturn(orders);
        when(paymentRepository.findAll()).thenReturn(List.of());
        when(inventoryRepository.findAll()).thenReturn(List.of());
        when(deliveryRepository.findAll()).thenReturn(List.of());

        AnalyticsResponse analytics = analyticsService.getAnalytics();

        // Only DELIVERED (400) + COMPLETED (500) count — once each.
        assertEquals(new BigDecimal("900"), analytics.getTotalRevenue());
        assertEquals(1L, analytics.getDeliveredOrders());
        assertEquals(1L, analytics.getCompletedOrders());
        assertEquals(1L, analytics.getPendingOrders());
        assertEquals(1L, analytics.getCancelledOrders());
    }

    @Test
    void paidAndOutstandingSplit() {

        Order paidOrder = order(1L, OrderStatus.COMPLETED, "1000");
        Order unpaidOrder = order(2L, OrderStatus.DELIVERED, "500");
        Order refundedOrder = order(3L, OrderStatus.COMPLETED, "700");

        when(orderRepository.findAll()).thenReturn(
                List.of(paidOrder, unpaidOrder, refundedOrder));
        when(paymentRepository.findAll()).thenReturn(
                List.of(
                        payment(paidOrder, PaymentStatus.SUCCESS, "1000"),
                        payment(refundedOrder, PaymentStatus.REFUNDED, "700")
                ));
        when(inventoryRepository.findAll()).thenReturn(List.of());
        when(deliveryRepository.findAll()).thenReturn(List.of());

        AnalyticsResponse analytics = analyticsService.getAnalytics();
        PaymentAnalyticsResponse paymentAnalytics = analyticsService.getPaymentAnalytics();

        // Paid = SUCCESS only (1000); refunded excluded from paid.
        assertEquals(new BigDecimal("1000"), analytics.getPaidAmount());
        assertEquals(new BigDecimal("700"), analytics.getRefundedPaymentAmount());

        // Outstanding = unpaid (500) + refunded (700) order totals.
        assertEquals(new BigDecimal("1200"), analytics.getOutstandingAmount());
        assertEquals(new BigDecimal("1200"), paymentAnalytics.getOutstandingAmount());
    }

    @Test
    void activeDeliveriesCountsAssignedAndOutForDelivery() {

        Delivery assigned = Delivery.builder()
                .id(1L)
                .deliveryStatus(DeliveryStatus.ASSIGNED)
                .build();
        Delivery outForDelivery = Delivery.builder()
                .id(2L)
                .deliveryStatus(DeliveryStatus.OUT_FOR_DELIVERY)
                .build();
        Delivery delivered = Delivery.builder()
                .id(3L)
                .deliveryStatus(DeliveryStatus.DELIVERED)
                .build();
        Delivery cancelled = Delivery.builder()
                .id(4L)
                .deliveryStatus(DeliveryStatus.CANCELLED)
                .build();

        when(orderRepository.findAll()).thenReturn(List.of());
        when(paymentRepository.findAll()).thenReturn(List.of());
        when(inventoryRepository.findAll()).thenReturn(List.of());
        when(deliveryRepository.findAll()).thenReturn(
                List.of(assigned, outForDelivery, delivered, cancelled));

        DeliveryAnalyticsResponse response = analyticsService.getDeliveryAnalytics();

        assertEquals(4L, response.getTotalDeliveries());
        assertEquals(2L, response.getActiveDeliveries());
        assertEquals(1L, response.getDeliveredCount());
        assertEquals(1L, response.getCancelledCount());
    }

    @Test
    void salesAnalyticsTopProductsByQuantity() {

        Order order = order(1L, OrderStatus.COMPLETED, "1000");

        Product rice = Product.builder()
                .id(1L).productName("Rice 5kg").price(BigDecimal.valueOf(500)).build();
        Product oil = Product.builder()
                .id(2L).productName("Oil 1L").price(BigDecimal.valueOf(200)).build();

        List<OrderItem> items = List.of(
                OrderItem.builder().id(1L).order(order).product(rice)
                        .quantity(3).price(BigDecimal.valueOf(500))
                        .subtotal(BigDecimal.valueOf(1500)).build(),
                OrderItem.builder().id(2L).order(order).product(oil)
                        .quantity(1).price(BigDecimal.valueOf(200))
                        .subtotal(BigDecimal.valueOf(200)).build()
        );

        when(orderRepository.findAll()).thenReturn(List.of(order));
        when(orderItemRepository.findAll()).thenReturn(items);
        when(paymentRepository.findAll()).thenReturn(List.of());

        SalesAnalyticsResponse response = analyticsService.getSalesAnalytics(null, null);

        assertEquals(2, response.getTopProducts().size());
        // Rice (3 units) ranks above Oil (1 unit).
        assertEquals("Rice 5kg", response.getTopProducts().get(0).getProductName());
        assertEquals(3L, response.getTopProducts().get(0).getQuantity());
        assertEquals(1, response.getSalesTrend().size());
        assertEquals(new BigDecimal("1000"), response.getSalesTrend().get(0).getRevenue());
    }
}
