package com.distributrack.service.impl;

import com.distributrack.dto.response.DashboardResponse;
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
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.repository.WarehouseRepository;
import com.distributrack.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final DeliveryRepository deliveryRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    @Override
    public DashboardResponse getDashboardSummary() {

        Long totalProducts = productRepository.count();

        Long totalUsers = userRepository.count();

        Long totalOrders = orderRepository.count();

        List<Inventory> inventoryList = inventoryRepository.findAll();

        Long totalInventoryItems = inventoryList.stream()
                .mapToLong(Inventory::getQuantity)
                .sum();

        Long lowStockProducts = inventoryList.stream()
                .filter(i -> i.getQuantity() < i.getMinimumStock())
                .count();

        List<Order> allOrders = orderRepository.findAll();

        Long pendingOrders = orderRepository.findByStatus(OrderStatus.PENDING)
                .stream()
                .count();

        // Completed = delivered or finalized; PENDING/REJECTED/CANCELLED are excluded.
        Long completedOrders = allOrders.stream()
                .filter(DashboardServiceImpl::isCompletedOrder)
                .count();

        Long approvedOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.APPROVED)
                .count();

        Long deliveredOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.DELIVERED)
                .count();

        Long cancelledOrders = allOrders.stream()
                .filter(o -> o.getStatus() == OrderStatus.CANCELLED)
                .count();

        // Revenue counts only orders that actually completed. Pending, rejected
        // and cancelled orders are never revenue, and each order is counted once.
        BigDecimal totalRevenue = allOrders.stream()
                .filter(DashboardServiceImpl::isCompletedOrder)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Payment> payments = paymentRepository.findAll();
        List<Delivery> deliveries = deliveryRepository.findAll();

        BigDecimal paidAmount = payments.stream()
                .filter(p -> p.getPaymentStatus() == PaymentStatus.SUCCESS)
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Outstanding = order totals without a SUCCESS payment.
        Map<Long, PaymentStatus> orderPaymentStatus = payments.stream()
                .collect(Collectors.toMap(
                        p -> p.getOrder().getId(),
                        Payment::getPaymentStatus,
                        (first, second) -> first
                ));

        BigDecimal outstandingAmount = allOrders.stream()
                .filter(order -> orderPaymentStatus.get(order.getId())
                        != PaymentStatus.SUCCESS)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long activeDeliveries = deliveries.stream()
                .filter(d -> d.getDeliveryStatus() == DeliveryStatus.ASSIGNED
                        || d.getDeliveryStatus() == DeliveryStatus.OUT_FOR_DELIVERY)
                .count();

        return DashboardResponse.builder()
                .totalProducts(totalProducts)
                .totalInventoryItems(totalInventoryItems)
                .lowStockProducts(lowStockProducts)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .approvedOrders(approvedOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders)
                .completedOrders(completedOrders)
                .totalWarehouses(warehouseRepository.count())
                .activeDeliveries(activeDeliveries)
                .totalUsers(totalUsers)
                .totalRevenue(totalRevenue)
                .paidAmount(paidAmount)
                .outstandingAmount(outstandingAmount)
                .build();
    }

    private static boolean isCompletedOrder(Order order) {
        return order.getStatus() == OrderStatus.DELIVERED
                || order.getStatus() == OrderStatus.COMPLETED;
    }
}