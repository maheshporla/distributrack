package com.distributrack.service;

import com.distributrack.dto.request.OrderItemRequest;
import com.distributrack.dto.request.OrderRequest;
import com.distributrack.dto.response.OrderResponse;
import com.distributrack.entity.Order;
import com.distributrack.entity.Product;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.OrderItemRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.ProductRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.impl.OrderServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrderServiceImplTest {

    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final OrderItemRepository orderItemRepository = mock(OrderItemRepository.class);
    private final ProductRepository productRepository = mock(ProductRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);

    private final OrderServiceImpl orderService = new OrderServiceImpl(
            orderRepository,
            orderItemRepository,
            deliveryRepository,
            productRepository,
            userRepository,
            currentUserService,
            notificationService,
            auditService
    );

    private User shopkeeper;
    private User otherShopkeeper;

    @BeforeEach
    void setUp() {
        shopkeeper = User.builder()
                .id(1L)
                .fullName("Shop One")
                .email("shop1@test.com")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        otherShopkeeper = User.builder()
                .id(2L)
                .fullName("Shop Two")
                .email("shop2@test.com")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderItemRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void shopkeeperCannotCreateOrderForAnotherShopkeeper() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(userRepository.findById(1L)).thenReturn(Optional.of(shopkeeper));

        Product product = Product.builder()
                .id(10L)
                .productName("Cola")
                .price(new BigDecimal("50.00"))
                .build();
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));

        // The request tries to place the order for shopkeeper 2 — must be ignored.
        OrderRequest request = OrderRequest.builder()
                .shopkeeperId(2L)
                .items(List.of(
                        OrderItemRequest.builder().productId(10L).quantity(2).build()
                ))
                .build();

        OrderResponse response = orderService.createOrder(request);

        assertNotNull(response);
        assertEquals(1L, response.getShopkeeperId());
        assertEquals(new BigDecimal("100.00"), response.getTotalAmount());
        assertEquals(OrderStatus.PENDING, response.getStatus());

        ArgumentCaptor<Order> captor = ArgumentCaptor.forClass(Order.class);
        verify(orderRepository, atLeastOnce()).save(captor.capture());
        assertTrue(captor.getAllValues().stream()
                .allMatch(order -> order.getShopkeeper().getId().equals(1L)));
        verify(userRepository, never()).findById(2L);
    }

    @Test
    void shopkeeperCannotViewAnotherShopkeepersOrder() {

        Order order = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(otherShopkeeper)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.TEN)
                .orderItems(List.of())
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));

        assertThrows(RuntimeException.class, () -> orderService.getOrderById(5L));
    }

    @Test
    void invalidOrderStatusTransitionIsRejected() {

        Order order = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(shopkeeper)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.TEN)
                .orderItems(List.of())
                .build();

        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));

        // PENDING -> DELIVERED skips the lifecycle and must be rejected.
        assertThrows(IllegalStateException.class,
                () -> orderService.updateOrderStatus(5L, "DELIVERED"));

        // PENDING -> APPROVED is the first legal step.
        orderService.updateOrderStatus(5L, "APPROVED");
        assertEquals(OrderStatus.APPROVED, order.getStatus());
    }

    @Test
    void arbitraryStatusStringIsRejected() {

        Order order = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(shopkeeper)
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.TEN)
                .orderItems(List.of())
                .build();

        when(orderRepository.findById(5L)).thenReturn(Optional.of(order));

        assertThrows(IllegalArgumentException.class,
                () -> orderService.updateOrderStatus(5L, "some-arbitrary-status"));
    }
}
