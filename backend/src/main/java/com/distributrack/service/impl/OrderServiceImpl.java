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
import com.distributrack.repository.OrderItemRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
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
