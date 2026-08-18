package com.distributrack.service.impl;

import com.distributrack.dto.response.DeliveryReportResponse;
import com.distributrack.dto.response.InventoryReportResponse;
import com.distributrack.dto.response.OrdersReportResponse;
import com.distributrack.dto.response.PaymentReportResponse;
import com.distributrack.dto.response.SalesReportResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Inventory;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Operational reports — every figure comes from real repository data.
 * Revenue follows the established rule: only DELIVERED/COMPLETED orders
 * count, each order exactly once.
 */
@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final OrderRepository orderRepository;
    private final InventoryRepository inventoryRepository;
    private final DeliveryRepository deliveryRepository;
    private final PaymentRepository paymentRepository;

    // =========================================================
    // Sales report
    // =========================================================

    @Override
    public SalesReportResponse getSalesReport(LocalDate from, LocalDate to) {

        List<Order> orders = inRange(orderRepository.findAll(), from, to);

        return SalesReportResponse.builder()
                .totalOrders((long) orders.size())
                .totalRevenue(revenueOf(orders))
                .completedOrders(orders.stream()
                        .filter(ReportServiceImpl::isCompletedOrder)
                        .count())
                .pendingOrders(orders.stream()
                        .filter(o -> o.getStatus() == OrderStatus.PENDING)
                        .count())
                .rows(orders.stream()
                        .map(this::toOrderRow)
                        .collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Orders report
    // =========================================================

    @Override
    public OrdersReportResponse getOrdersReport(LocalDate from, LocalDate to) {

        List<Order> orders = inRange(orderRepository.findAll(), from, to);

        return OrdersReportResponse.builder()
                .totalOrders((long) orders.size())
                .pendingOrders(count(orders, OrderStatus.PENDING))
                .approvedOrders(count(orders, OrderStatus.APPROVED))
                .rejectedOrders(count(orders, OrderStatus.REJECTED))
                .assignedOrders(count(orders, OrderStatus.ASSIGNED))
                .outForDeliveryOrders(count(orders, OrderStatus.OUT_FOR_DELIVERY))
                .deliveredOrders(count(orders, OrderStatus.DELIVERED))
                .completedOrders(count(orders, OrderStatus.COMPLETED))
                .cancelledOrders(count(orders, OrderStatus.CANCELLED))
                .totalRevenue(revenueOf(orders))
                .rows(orders.stream()
                        .map(this::toOrderRow)
                        .collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Inventory report
    // =========================================================

    @Override
    public InventoryReportResponse getInventoryReport() {

        List<Inventory> inventoryList = inventoryRepository.findAll();

        return InventoryReportResponse.builder()
                .totalProducts((long) inventoryList.size())
                .totalInventoryQuantity(inventoryList.stream()
                        .mapToLong(Inventory::getQuantity)
                        .sum())
                .lowStockProducts(inventoryList.stream()
                        .filter(i -> i.getQuantity() < i.getMinimumStock())
                        .count())
                .outOfStockProducts(inventoryList.stream()
                        .filter(i -> i.getQuantity() == 0)
                        .count())
                .rows(inventoryList.stream()
                        .map(this::toInventoryRow)
                        .collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Delivery report
    // =========================================================

    @Override
    public DeliveryReportResponse getDeliveryReport(LocalDate from, LocalDate to) {

        List<Delivery> deliveries = deliveryRepository.findAll().stream()
                .filter(d -> inRangeInclusive(d.getAssignedAt(), from, to))
                .collect(Collectors.toList());

        return DeliveryReportResponse.builder()
                .totalDeliveries((long) deliveries.size())
                .assignedCount(count(deliveries, DeliveryStatus.ASSIGNED))
                .outForDeliveryCount(count(deliveries, DeliveryStatus.OUT_FOR_DELIVERY))
                .deliveredCount(count(deliveries, DeliveryStatus.DELIVERED))
                .failedCount(count(deliveries, DeliveryStatus.FAILED))
                .cancelledCount(count(deliveries, DeliveryStatus.CANCELLED))
                .rows(deliveries.stream()
                        .map(this::toDeliveryRow)
                        .collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Payment report
    // =========================================================

    @Override
    public PaymentReportResponse getPaymentReport(LocalDate from, LocalDate to) {

        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> inRangeInclusive(p.getPaymentDate(), from, to))
                .collect(Collectors.toList());

        Map<Long, PaymentStatus> orderPaymentStatus = paymentRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        p -> p.getOrder().getId(),
                        Payment::getPaymentStatus,
                        (first, second) -> first
                ));

        BigDecimal outstanding = orderRepository.findAll().stream()
                .filter(order -> orderPaymentStatus.get(order.getId())
                        != PaymentStatus.SUCCESS)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PaymentReportResponse.builder()
                .totalPaid(sum(payments, PaymentStatus.SUCCESS))
                .outstandingAmount(outstanding)
                .failedAmount(sum(payments, PaymentStatus.FAILED))
                .refundedAmount(sum(payments, PaymentStatus.REFUNDED))
                .rows(payments.stream()
                        .map(this::toPaymentRow)
                        .collect(Collectors.toList()))
                .build();
    }

    // =========================================================
    // Helpers
    // =========================================================

    private static boolean isCompletedOrder(Order order) {
        return order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == OrderStatus.COMPLETED;
    }

    private static BigDecimal revenueOf(List<Order> orders) {
        return orders.stream()
                .filter(ReportServiceImpl::isCompletedOrder)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static long count(List<Order> orders, OrderStatus status) {
        return orders.stream().filter(o -> o.getStatus() == status).count();
    }

    private static long count(List<Delivery> deliveries, DeliveryStatus status) {
        return deliveries.stream().filter(d -> d.getDeliveryStatus() == status).count();
    }

    private static BigDecimal sum(List<Payment> payments, PaymentStatus status) {
        return payments.stream()
                .filter(p -> p.getPaymentStatus() == status)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static List<Order> inRange(List<Order> orders, LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return orders;
        }
        return orders.stream()
                .filter(order -> inRangeInclusive(order.getOrderDate(), from, to))
                .collect(Collectors.toList());
    }

    private static boolean inRangeInclusive(
            LocalDateTime dateTime, LocalDate from, LocalDate to) {

        LocalDate date = dateTime.toLocalDate();

        if (from != null && date.isBefore(from)) {
            return false;
        }
        return to == null || !date.isAfter(to);
    }

    private SalesReportResponse.SalesReportRow toOrderRow(Order order) {
        return SalesReportResponse.SalesReportRow.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderDate(order.getOrderDate())
                .shopkeeperName(order.getShopkeeper().getFullName())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus().name())
                .build();
    }

    private InventoryReportResponse.InventoryReportRow toInventoryRow(Inventory inventory) {
        String status = inventory.getQuantity() == 0
                ? "OUT_OF_STOCK"
                : inventory.getQuantity() < inventory.getMinimumStock()
                        ? "LOW_STOCK"
                        : "OK";

        return InventoryReportResponse.InventoryReportRow.builder()
                .inventoryId(inventory.getId())
                .productName(inventory.getProduct().getProductName())
                .sku(inventory.getProduct().getSku())
                .warehouseLocation(inventory.getWarehouseLocation())
                .quantity(inventory.getQuantity())
                .minimumStock(inventory.getMinimumStock())
                .status(status)
                .build();
    }

    private DeliveryReportResponse.DeliveryReportRow toDeliveryRow(Delivery delivery) {
        return DeliveryReportResponse.DeliveryReportRow.builder()
                .deliveryId(delivery.getId())
                .orderNumber(delivery.getOrder().getOrderNumber())
                .deliveryBoyName(delivery.getDeliveryBoy().getFullName())
                .deliveryStatus(delivery.getDeliveryStatus().name())
                .deliveryAddress(delivery.getDeliveryAddress())
                .assignedAt(delivery.getAssignedAt())
                .deliveredAt(delivery.getDeliveredAt())
                .build();
    }

    private PaymentReportResponse.PaymentReportRow toPaymentRow(Payment payment) {
        return PaymentReportResponse.PaymentReportRow.builder()
                .paymentId(payment.getId())
                .orderNumber(payment.getOrder().getOrderNumber())
                .shopkeeperName(payment.getOrder().getShopkeeper().getFullName())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod())
                .paymentStatus(payment.getPaymentStatus().name())
                .paymentDate(payment.getPaymentDate())
                .build();
    }
}
