package com.distributrack.service.impl;

import com.distributrack.dto.response.AnalyticsResponse;
import com.distributrack.dto.response.DeliveryAnalyticsResponse;
import com.distributrack.dto.response.InventoryAnalyticsResponse;
import com.distributrack.dto.response.PaymentAnalyticsResponse;
import com.distributrack.dto.response.SalesAnalyticsResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Inventory;
import com.distributrack.entity.Order;
import com.distributrack.entity.OrderItem;
import com.distributrack.entity.Payment;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.repository.OrderItemRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.PaymentRepository;
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.repository.WarehouseRepository;
import com.distributrack.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Business analytics — every value is aggregated from real repository
 * data. Revenue follows the established rule everywhere: only
 * DELIVERED/COMPLETED orders count, each order exactly once.
 */
@Service
@RequiredArgsConstructor
public class AnalyticsServiceImpl implements AnalyticsService {

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryRepository deliveryRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    // =========================================================
    // Overview KPIs
    // =========================================================

    @Override
    public AnalyticsResponse getAnalytics() {

        List<Order> orders = orderRepository.findAll();
        List<Payment> payments = paymentRepository.findAll();
        List<Inventory> inventoryList = inventoryRepository.findAll();
        List<Delivery> deliveries = deliveryRepository.findAll();

        long pending = countByStatus(orders, OrderStatus.PENDING);
        long approved = countByStatus(orders, OrderStatus.APPROVED);
        long delivered = countByStatus(orders, OrderStatus.DELIVERED);
        long cancelled = countByStatus(orders, OrderStatus.CANCELLED);
        long completed = countByStatus(orders, OrderStatus.COMPLETED);

        long lowStock = inventoryList.stream()
                .filter(i -> i.getQuantity() < i.getMinimumStock())
                .count();

        long outOfStock = inventoryList.stream()
                .filter(i -> i.getQuantity() == 0)
                .count();

        BigDecimal totalRevenue = orders.stream()
                .filter(AnalyticsServiceImpl::isCompletedOrder)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeDeliveries = deliveries.stream()
                .filter(d -> d.getDeliveryStatus() == DeliveryStatus.ASSIGNED
                        || d.getDeliveryStatus() == DeliveryStatus.OUT_FOR_DELIVERY)
                .count();

        return AnalyticsResponse.builder()
                .totalRevenue(totalRevenue)
                .totalOrders((long) orders.size())
                .pendingOrders(pending)
                .approvedOrders(approved)
                .deliveredOrders(delivered)
                .cancelledOrders(cancelled)
                .completedOrders(completed)
                .totalProducts(productRepository.count())
                .totalInventory(inventoryList.stream().mapToLong(Inventory::getQuantity).sum())
                .lowStockProducts(lowStock)
                .outOfStockProducts(outOfStock)
                .totalWarehouses(warehouseRepository.count())
                .activeDeliveries(activeDeliveries)
                .paidAmount(sumByPaymentStatus(payments, PaymentStatus.SUCCESS))
                .outstandingAmount(computeOutstanding(orders, payments))
                .failedPaymentAmount(sumByPaymentStatus(payments, PaymentStatus.FAILED))
                .refundedPaymentAmount(sumByPaymentStatus(payments, PaymentStatus.REFUNDED))
                .totalUsers(userRepository.count())
                .build();
    }

    // =========================================================
    // Sales analytics (trend + top products/shops + distributions)
    // =========================================================

    @Override
    public SalesAnalyticsResponse getSalesAnalytics(LocalDate from, LocalDate to) {

        List<Order> orders = inRange(orderRepository.findAll(), from, to);

        // Payments honor the same date range as orders so the status
        // distribution matches the selected period.
        List<Payment> payments = paymentRepository.findAll().stream()
                .filter(p -> inRangeInclusive(p.getPaymentDate(), from, to))
                .collect(Collectors.toList());

        List<OrderItem> items = orderItemRepository.findAll();

        // Trend buckets: days for short ranges, months for long ranges.
        boolean byMonth = from != null && to != null
                && from.until(to).getDays() > 62;
        DateTimeFormatter bucket = byMonth ? MONTH : DAY;

        List<SalesAnalyticsResponse.SalesTrendPoint> trend = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> bucket.format(order.getOrderDate()),
                        LinkedHashMap::new,
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                group -> {
                                    BigDecimal revenue = group.stream()
                                            .filter(AnalyticsServiceImpl::isCompletedOrder)
                                            .map(Order::getTotalAmount)
                                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                                    return new SalesAnalyticsResponse.SalesTrendPoint(
                                            group.get(0).getOrderDate().format(bucket),
                                            revenue,
                                            (long) group.size()
                                    );
                                }
                        )
                ))
                .values().stream()
                .sorted(Comparator.comparing(SalesAnalyticsResponse.SalesTrendPoint::getLabel))
                .collect(Collectors.toList());

        List<SalesAnalyticsResponse.TopProduct> topProducts = items.stream()
                .filter(item -> inRangeInclusive(item.getOrder().getOrderDate(), from, to))
                .collect(Collectors.groupingBy(
                        item -> item.getProduct().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                group -> new SalesAnalyticsResponse.TopProduct(
                                        group.get(0).getProduct().getId(),
                                        group.get(0).getProduct().getProductName(),
                                        group.stream().mapToLong(OrderItem::getQuantity).sum(),
                                        group.stream()
                                                .map(OrderItem::getSubtotal)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                )
                        )
                ))
                .values().stream()
                .sorted(Comparator.comparing(SalesAnalyticsResponse.TopProduct::getQuantity).reversed())
                .limit(5)
                .collect(Collectors.toList());

        List<SalesAnalyticsResponse.TopShop> topShops = orders.stream()
                .collect(Collectors.groupingBy(
                        order -> order.getShopkeeper().getId(),
                        Collectors.collectingAndThen(
                                Collectors.toList(),
                                group -> new SalesAnalyticsResponse.TopShop(
                                        group.get(0).getShopkeeper().getId(),
                                        group.get(0).getShopkeeper().getFullName(),
                                        (long) group.size(),
                                        group.stream()
                                                .filter(AnalyticsServiceImpl::isCompletedOrder)
                                                .map(Order::getTotalAmount)
                                                .reduce(BigDecimal.ZERO, BigDecimal::add)
                                )
                        )
                ))
                .values().stream()
                .sorted(Comparator.comparing(SalesAnalyticsResponse.TopShop::getRevenue).reversed())
                .limit(5)
                .collect(Collectors.toList());

        return SalesAnalyticsResponse.builder()
                .salesTrend(trend)
                .topProducts(topProducts)
                .topShops(topShops)
                .orderStatusDistribution(toNameCount(
                        orders,
                        order -> order.getStatus().name()
                ))
                .paymentStatusDistribution(toNameCount(
                        payments,
                        payment -> payment.getPaymentStatus().name()
                ))
                .build();
    }

    // =========================================================
    // Payment analytics
    // =========================================================

    @Override
    public PaymentAnalyticsResponse getPaymentAnalytics() {

        List<Payment> payments = paymentRepository.findAll();

        Map<String, PaymentAnalyticsResponse.MethodTotal> byMethod =
                payments.stream()
                        .collect(Collectors.groupingBy(
                                Payment::getPaymentMethod,
                                LinkedHashMap::new,
                                Collectors.collectingAndThen(
                                        Collectors.toList(),
                                        group -> new PaymentAnalyticsResponse.MethodTotal(
                                                group.get(0).getPaymentMethod(),
                                                (long) group.size(),
                                                group.stream()
                                                        .map(Payment::getAmount)
                                                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                                        )
                                )
                        ));

        return PaymentAnalyticsResponse.builder()
                .totalPaid(sumByPaymentStatus(payments, PaymentStatus.SUCCESS))
                .outstandingAmount(computeOutstanding(
                        orderRepository.findAll(), payments))
                .failedAmount(sumByPaymentStatus(payments, PaymentStatus.FAILED))
                .refundedAmount(sumByPaymentStatus(payments, PaymentStatus.REFUNDED))
                .byMethod(List.copyOf(byMethod.values()))
                .paymentStatusDistribution(toNameCount(
                        payments,
                        payment -> payment.getPaymentStatus().name()
                ))
                .build();
    }

    // =========================================================
    // Delivery analytics
    // =========================================================

    @Override
    public DeliveryAnalyticsResponse getDeliveryAnalytics() {

        List<Delivery> deliveries = deliveryRepository.findAll();

        long assigned = countByStatus(deliveries, DeliveryStatus.ASSIGNED);
        long outForDelivery = countByStatus(deliveries, DeliveryStatus.OUT_FOR_DELIVERY);

        return DeliveryAnalyticsResponse.builder()
                .totalDeliveries((long) deliveries.size())
                .assignedCount(assigned)
                .outForDeliveryCount(outForDelivery)
                .deliveredCount(countByStatus(deliveries, DeliveryStatus.DELIVERED))
                .failedCount(countByStatus(deliveries, DeliveryStatus.FAILED))
                .cancelledCount(countByStatus(deliveries, DeliveryStatus.CANCELLED))
                .activeDeliveries(assigned + outForDelivery)
                .deliveryStatusDistribution(toNameCount(
                        deliveries,
                        delivery -> delivery.getDeliveryStatus().name()
                ))
                .build();
    }

    // =========================================================
    // Inventory analytics
    // =========================================================

    @Override
    public InventoryAnalyticsResponse getInventoryAnalytics() {

        List<Inventory> inventoryList = inventoryRepository.findAll();

        Map<String, Long> byWarehouse = inventoryList.stream()
                .collect(Collectors.groupingBy(
                        Inventory::getWarehouseLocation,
                        LinkedHashMap::new,
                        Collectors.summingLong(Inventory::getQuantity)
                ));

        List<InventoryAnalyticsResponse.WarehouseStock> warehouseStocks =
                byWarehouse.entrySet().stream()
                        .map(entry -> new InventoryAnalyticsResponse.WarehouseStock(
                                entry.getKey(), entry.getValue()))
                        .collect(Collectors.toList());

        return InventoryAnalyticsResponse.builder()
                .totalProducts((long) inventoryList.size())
                .totalQuantity(inventoryList.stream().mapToLong(Inventory::getQuantity).sum())
                .lowStockProducts(inventoryList.stream()
                        .filter(i -> i.getQuantity() < i.getMinimumStock())
                        .count())
                .outOfStockProducts(inventoryList.stream()
                        .filter(i -> i.getQuantity() == 0)
                        .count())
                .byWarehouse(warehouseStocks)
                .build();
    }

    // =========================================================
    // Shared helpers
    // =========================================================

    private static boolean isCompletedOrder(Order order) {
        return order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == OrderStatus.COMPLETED;
    }

    private static long countByStatus(List<Order> orders, OrderStatus status) {
        return orders.stream().filter(o -> o.getStatus() == status).count();
    }

    private static long countByStatus(List<Delivery> deliveries, DeliveryStatus status) {
        return deliveries.stream().filter(d -> d.getDeliveryStatus() == status).count();
    }

    private static BigDecimal sumByPaymentStatus(
            List<Payment> payments, PaymentStatus status) {
        return payments.stream()
                .filter(p -> p.getPaymentStatus() == status)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Outstanding = sum of order totals that do NOT have a SUCCESS payment
     * (unpaid, failed or refunded orders are still owed).
     */
    private static BigDecimal computeOutstanding(
            List<Order> orders, List<Payment> payments) {

        Map<Long, PaymentStatus> orderPaymentStatus = payments.stream()
                .collect(Collectors.toMap(
                        p -> p.getOrder().getId(),
                        Payment::getPaymentStatus,
                        (first, second) -> first
                ));

        return orders.stream()
                .filter(order -> orderPaymentStatus.get(order.getId())
                        != PaymentStatus.SUCCESS)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static <T> List<SalesAnalyticsResponse.NameCount> toNameCount(
            List<T> items, Function<T, String> nameExtractor) {

        return items.stream()
                .collect(Collectors.groupingBy(
                        nameExtractor,
                        LinkedHashMap::new,
                        Collectors.counting()
                ))
                .entrySet().stream()
                .map(entry -> new SalesAnalyticsResponse.NameCount(
                        entry.getKey(), entry.getValue()))
                .collect(Collectors.toList());
    }

    /** Filters a list of orders to those placed within [from, to] (inclusive). */
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
}
