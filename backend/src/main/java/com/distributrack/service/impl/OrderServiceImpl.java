package com.distributrack.service.impl;

import com.distributrack.dto.request.OrderItemRequest;
import com.distributrack.dto.request.OrderRequest;
import com.distributrack.dto.response.OrderItemResponse;
import com.distributrack.dto.response.OrderResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.OrderItem;
import com.distributrack.entity.Product;
import com.distributrack.entity.User;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.enums.WorkerAvailability;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.OrderItemRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryRepository deliveryRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        // A SHOPKEEPER can only ever create an order for themselves.
        // The shopkeeperId from the request body is ignored for them —
        // it is never a way to place an order on someone else's behalf.
        Long shopkeeperId = request.getShopkeeperId();
        if (actorRole == RoleName.SHOPKEEPER) {
            shopkeeperId = current.getId();
        }

        User shopkeeper = userRepository.findById(shopkeeperId)
                .orElseThrow(() -> new RuntimeException("Shopkeeper not found"));

        if (shopkeeper.getRole().getName() != RoleName.SHOPKEEPER) {
            throw new RuntimeException("Order can only be created for a SHOPKEEPER account");
        }

        Order order = Order.builder()
                .orderNumber("ORD-" + UUID.randomUUID().toString().substring(0, 8))
                .shopkeeper(shopkeeper)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .build();

        order = orderRepository.save(order);

        BigDecimal totalAmount = BigDecimal.ZERO;

        List<OrderItem> orderItems = new ArrayList<>();

        for (OrderItemRequest itemRequest : request.getItems()) {

            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found"));

            BigDecimal subtotal = product.getPrice()
                    .multiply(BigDecimal.valueOf(itemRequest.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .price(product.getPrice())
                    .subtotal(subtotal)
                    .build();

            orderItems.add(orderItem);

            totalAmount = totalAmount.add(subtotal);
        }

        orderItemRepository.saveAll(orderItems);

        order.setOrderItems(orderItems);
        order.setTotalAmount(totalAmount);

        orderRepository.save(order);

        notificationService.notifyOrderCreated(order);

        auditService.log("ORDER_CREATE", "Order", order.getId(),
                "Order " + order.getOrderNumber() + " created for "
                        + shopkeeper.getFullName() + " (" + totalAmount + ")");

        return mapToResponse(order);
    }

    @Override
    public List<OrderResponse> getAllOrders() {

        User current = currentUserService.getCurrentUser();

        // SHOPKEEPER only ever sees their own orders.
        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            return orderRepository.findByShopkeeper(current)
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        return orderRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public OrderResponse getOrderById(Long id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));

        User current = currentUserService.getCurrentUser();

        // SHOPKEEPER cannot view another shopkeeper's order.
        if (current.getRole().getName() == RoleName.SHOPKEEPER
                && !order.getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Order not found with id: " + id);
        }

        return mapToResponse(order);
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long id, String status) {

        OrderStatus nextStatus = parseOrderStatus(status);

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));

        order.transitionTo(nextStatus);

        orderRepository.save(order);

        // When order is approved, auto-create an AVAILABLE delivery
        // so online workers can accept it.
        if (nextStatus == OrderStatus.APPROVED) {
            createAvailableDelivery(order);
        }

        // Notify the shopkeeper about the approval decision.
        switch (nextStatus) {
            case APPROVED -> notificationService.notifyOrderApproved(order);
            case REJECTED -> notificationService.notifyOrderRejected(order);
            case CANCELLED -> notificationService.notifyOrderCancelled(order);
            default -> { }
        }

        auditService.log("ORDER_STATUS", "Order", order.getId(),
                "Order " + order.getOrderNumber() + " status changed to " + nextStatus);

        return mapToResponse(order);
    }

    /**
     * Creates an AVAILABLE delivery for an approved order, then tries
     * automatic assignment to an eligible worker.
     *
     * This method is wrapped in a try-catch so that delivery creation
     * failures NEVER block order approval.
     */
    private void createAvailableDelivery(Order order) {
        try {
            // Check if a delivery already exists for this order.
            com.distributrack.entity.Delivery existing =
                    deliveryRepository.findByOrder(order).orElse(null);
            if (existing != null) {
                return; // Already has a delivery record.
            }

            // Use the shopkeeper's address as the default delivery address.
            String deliveryAddress = order.getShopkeeper().getAddress() != null
                    ? order.getShopkeeper().getAddress()
                    : order.getShopkeeper().getFullName();

            // Copy shopkeeper's saved location as the delivery destination.
            User shopkeeper = order.getShopkeeper();

            com.distributrack.entity.Delivery delivery =
                    com.distributrack.entity.Delivery.builder()
                            .order(order)
                            .deliveryStatus(com.distributrack.enums.DeliveryStatus.AVAILABLE)
                            .deliveryAddress(deliveryAddress)
                            .destinationLatitude(shopkeeper.getLatitude())
                            .destinationLongitude(shopkeeper.getLongitude())
                            .build();

            delivery = deliveryRepository.save(delivery);

            auditService.log("DELIVERY_CREATE_AVAILABLE", "Delivery", delivery.getId(),
                    "Available delivery created for order " + order.getOrderNumber());

            // Try automatic assignment to an eligible worker.
            tryAutomaticAssignment(delivery);

        } catch (Exception e) {
            // Delivery creation should never block order approval.
            // Log the error and continue — the order is still APPROVED.
            log.error("Failed to create delivery for order {}: {}",
                    order.getOrderNumber(), e.getMessage());
        }
    }

    /**
     * Attempts to automatically assign an AVAILABLE delivery to the
     * least-recently-assigned eligible worker. Called during order approval.
     *
     * Eligible workers:
     * - Role = DELIVERY_BOY
     * - Account enabled
     * - Availability = AVAILABLE (not BUSY or OFFLINE)
     *
     * Fair strategy: least-recently-assigned (oldest assignedAt first).
     * If nobody is available, the delivery stays AVAILABLE for manual
     * acceptance by workers.
     */
    private void tryAutomaticAssignment(com.distributrack.entity.Delivery delivery) {

        // Find the least-recently-assigned AVAILABLE worker.
        // Workers with null assignedAt (never assigned) are prioritized first.
        List<User> eligibleWorkers = userRepository
                .findByRole_Name(RoleName.DELIVERY_BOY)
                .stream()
                .filter(User::getEnabled)
                .filter(w -> w.getAvailability() == WorkerAvailability.AVAILABLE)
                .toList();

        if (eligibleWorkers.isEmpty()) {
            log.info("No available delivery workers for order {}",
                    delivery.getOrder().getOrderNumber());
            return;
        }

        // Select the least-recently-assigned worker by checking their
        // most recent delivery's assignedAt timestamp.
        User selectedWorker = null;
        java.time.LocalDateTime latestAssignment = null;

        for (User worker : eligibleWorkers) {
            List<com.distributrack.entity.Delivery> workerDeliveries =
                    deliveryRepository.findByDeliveryBoy(worker);

            if (workerDeliveries.isEmpty()) {
                // Never assigned — highest priority.
                selectedWorker = worker;
                break;
            }

            // Find their most recent assignment time.
            java.time.LocalDateTime mostRecent = workerDeliveries.stream()
                    .map(d -> d.getAssignedAt() != null ? d.getAssignedAt()
                            : d.getAvailableAt() != null ? d.getAvailableAt()
                            : java.time.LocalDateTime.MIN)
                    .max(java.time.LocalDateTime::compareTo)
                    .orElse(java.time.LocalDateTime.MIN);

            if (latestAssignment == null || mostRecent.isBefore(latestAssignment)) {
                latestAssignment = mostRecent;
                selectedWorker = worker;
            }
        }

        if (selectedWorker == null) {
            return;
        }

        // Assign the delivery.
        delivery.setDeliveryBoy(selectedWorker);
        delivery.setDeliveryStatus(com.distributrack.enums.DeliveryStatus.ASSIGNED);
        delivery.setAssignedAt(java.time.LocalDateTime.now());
        deliveryRepository.save(delivery);

        // Mark worker as BUSY.
        selectedWorker.setAvailability(WorkerAvailability.BUSY);
        userRepository.save(selectedWorker);

        // Sync order lifecycle.
        delivery.getOrder().transitionTo(OrderStatus.ASSIGNED);
        orderRepository.save(delivery.getOrder());

        notificationService.notifyDeliveryAssigned(delivery);

        auditService.log("DELIVERY_AUTO_ASSIGN", "Delivery", delivery.getId(),
                "Order " + delivery.getOrder().getOrderNumber()
                        + " auto-assigned to " + selectedWorker.getFullName());

        log.info("Auto-assigned order {} to worker {}",
                delivery.getOrder().getOrderNumber(),
                selectedWorker.getFullName());
    }

    @Override
    public void deleteOrder(Long id) {

        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));

        orderRepository.delete(order);
    }

    @Override
    public List<OrderResponse> getOrdersByShopkeeper(Long shopkeeperId) {

        User current = currentUserService.getCurrentUser();

        // SHOPKEEPER cannot query another shopkeeper's orders.
        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            shopkeeperId = current.getId();
        }

        User shopkeeper = userRepository.findById(shopkeeperId)
                .orElseThrow(() -> new RuntimeException("Shopkeeper not found"));

        return orderRepository.findByShopkeeper(shopkeeper)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getOrdersByStatus(String status) {

        OrderStatus orderStatus = parseOrderStatus(status);

        User current = currentUserService.getCurrentUser();

        List<Order> orders;

        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            orders = orderRepository.findByShopkeeper(current).stream()
                    .filter(order -> order.getStatus() == orderStatus)
                    .toList();
        } else {
            orders = orderRepository.findByStatus(orderStatus);
        }

        return orders.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getMyOrders() {

        User current = currentUserService.getCurrentUser();

        if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            return orderRepository.findByShopkeeper(current)
                    .stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Business roles see all operational orders.
        return orderRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private OrderStatus parseOrderStatus(String status) {
        try {
            return OrderStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid order status: " + status);
        }
    }

    private OrderResponse mapToResponse(Order order) {

        return OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .shopkeeperId(order.getShopkeeper().getId())
                .shopkeeperName(order.getShopkeeper().getFullName())
                .items(
                        order.getOrderItems()
                                .stream()
                                .map(item ->
                                        OrderItemResponse.builder()
                                                .productId(item.getProduct().getId())
                                                .productName(item.getProduct().getProductName())
                                                .quantity(item.getQuantity())
                                                .price(item.getPrice())
                                                .subtotal(item.getSubtotal())
                                                .build()
                                )
                                .collect(Collectors.toList())
                )
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus())
                .orderDate(order.getOrderDate())
                .build();
    }
}
