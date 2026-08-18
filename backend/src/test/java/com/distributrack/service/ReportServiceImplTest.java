package com.distributrack.service;

import com.distributrack.dto.response.OrdersReportResponse;
import com.distributrack.dto.response.PaymentReportResponse;
import com.distributrack.dto.response.SalesReportResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.service.impl.ReportServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReportServiceImplTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final InventoryRepository inventoryRepository = mock(InventoryRepository.class);
    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);

    private final ReportServiceImpl reportService = new ReportServiceImpl(
            orderRepository,
            inventoryRepository,
            deliveryRepository,
            paymentRepository
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

    private Order order(Long id, OrderStatus status, String amount, LocalDateTime date) {
        return Order.builder()
                .id(id)
                .orderNumber("ORD-" + id)
                .shopkeeper(shopkeeper)
                .status(status)
                .totalAmount(new BigDecimal(amount))
                .orderDate(date)
                .build();
    }

    @Test
    void salesReportFiltersByDateRange() {

        Order inside = order(1L, OrderStatus.COMPLETED, "100",
                LocalDateTime.of(2026, 8, 10, 10, 0));
        Order before = order(2L, OrderStatus.COMPLETED, "200",
                LocalDateTime.of(2026, 7, 1, 10, 0));
        Order after = order(3L, OrderStatus.COMPLETED, "300",
                LocalDateTime.of(2026, 9, 1, 10, 0));

        when(orderRepository.findAll()).thenReturn(List.of(inside, before, after));

        SalesReportResponse response = reportService.getSalesReport(
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31));

        assertEquals(1L, response.getTotalOrders());
        assertEquals(new BigDecimal("100"), response.getTotalRevenue());
        assertEquals(1, response.getRows().size());
        assertEquals("ORD-1", response.getRows().get(0).getOrderNumber());
    }

    @Test
    void salesReportRevenueExcludesNonCompleted() {

        Order pending = order(1L, OrderStatus.PENDING, "100",
                LocalDateTime.of(2026, 8, 10, 10, 0));
        Order cancelled = order(2L, OrderStatus.CANCELLED, "200",
                LocalDateTime.of(2026, 8, 11, 10, 0));
        Order delivered = order(3L, OrderStatus.DELIVERED, "300",
                LocalDateTime.of(2026, 8, 12, 10, 0));

        when(orderRepository.findAll()).thenReturn(List.of(pending, cancelled, delivered));

        SalesReportResponse response = reportService.getSalesReport(null, null);

        assertEquals(3L, response.getTotalOrders());
        // Only the DELIVERED order counts as revenue.
        assertEquals(new BigDecimal("300"), response.getTotalRevenue());
        assertEquals(1L, response.getCompletedOrders());
    }

    @Test
    void ordersReportCountsEveryLifecycleState() {

        Order pending = order(1L, OrderStatus.PENDING, "10",
                LocalDateTime.of(2026, 8, 1, 10, 0));
        Order approved = order(2L, OrderStatus.APPROVED, "20",
                LocalDateTime.of(2026, 8, 2, 10, 0));
        Order delivered = order(3L, OrderStatus.DELIVERED, "30",
                LocalDateTime.of(2026, 8, 3, 10, 0));

        when(orderRepository.findAll()).thenReturn(List.of(pending, approved, delivered));

        OrdersReportResponse response = reportService.getOrdersReport(null, null);

        assertEquals(3L, response.getTotalOrders());
        assertEquals(1L, response.getPendingOrders());
        assertEquals(1L, response.getApprovedOrders());
        assertEquals(1L, response.getDeliveredOrders());
        assertEquals(new BigDecimal("30"), response.getTotalRevenue());
        assertEquals(3, response.getRows().size());
    }

    @Test
    void paymentReportOutstandingExcludesPaidOrders() {

        Order paidOrder = order(1L, OrderStatus.COMPLETED, "100",
                LocalDateTime.of(2026, 8, 1, 10, 0));
        Order unpaidOrder = order(2L, OrderStatus.DELIVERED, "50",
                LocalDateTime.of(2026, 8, 2, 10, 0));

        Payment payment = Payment.builder()
                .id(10L)
                .order(paidOrder)
                .amount(BigDecimal.valueOf(100))
                .paymentMethod("UPI")
                .paymentStatus(PaymentStatus.SUCCESS)
                .transactionId("TXN-1")
                .paymentDate(LocalDateTime.of(2026, 8, 1, 12, 0))
                .build();

        when(orderRepository.findAll()).thenReturn(List.of(paidOrder, unpaidOrder));
        when(paymentRepository.findAll()).thenReturn(List.of(payment));

        PaymentReportResponse response = reportService.getPaymentReport(null, null);

        assertEquals(new BigDecimal("100"), response.getTotalPaid());
        assertEquals(new BigDecimal("50"), response.getOutstandingAmount());
        assertEquals(1, response.getRows().size());
    }
}
