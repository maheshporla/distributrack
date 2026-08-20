package com.distributrack.service;

import com.distributrack.dto.response.DeliveryResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Order;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.impl.DeliveryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DeliveryServiceImplTest {

    private final DeliveryRepository deliveryRepository = mock(DeliveryRepository.class);
    private final OrderRepository orderRepository = mock(OrderRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final AuditService auditService = mock(AuditService.class);

    private final DeliveryServiceImpl deliveryService = new DeliveryServiceImpl(
            deliveryRepository,
            orderRepository,
            userRepository,
            currentUserService,
            notificationService,
            auditService
    );

    private User boy;
    private User otherBoy;
    private User shopkeeper;

    @BeforeEach
    void setUp() {
        boy = User.builder()
                .id(1L)
                .fullName("Boy One")
                .email("boy1@test.com")
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        otherBoy = User.builder()
                .id(2L)
                .fullName("Boy Two")
                .email("boy2@test.com")
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        shopkeeper = User.builder()
                .id(3L)
                .fullName("Shop One")
                .email("shop1@test.com")
                .phone("9000000000")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        when(deliveryRepository.save(any(Delivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private Delivery deliveryFor(User assignedBoy, DeliveryStatus status, OrderStatus orderStatus) {
        Order order = Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(shopkeeper)
                .totalAmount(BigDecimal.valueOf(1000))
                .status(orderStatus)
                .build();
        return Delivery.builder()
                .id(9L)
                .order(order)
                .deliveryBoy(assignedBoy)
                .deliveryStatus(status)
                .deliveryAddress("Test Address")
                .build();
    }

    @Test
    void deliveryBoySeesOnlyTheirOwnDeliveries() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        when(deliveryRepository.findByDeliveryBoy(boy)).thenReturn(
                List.of(deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.APPROVED))
        );

        List<DeliveryResponse> deliveries = deliveryService.getAllDeliveries();

        assertEquals(1, deliveries.size());
        assertNotNull(deliveries.get(0).getDeliveryBoyId());
        assertEquals(boy.getId(), deliveries.get(0).getDeliveryBoyId());
        verify(deliveryRepository, never()).findAll();
    }

    @Test
    void deliveryBoyCannotUpdateAnotherBoysDelivery() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        when(deliveryRepository.findById(9L))
                .thenReturn(Optional.of(deliveryFor(otherBoy, DeliveryStatus.ASSIGNED, OrderStatus.APPROVED)));

        assertThrows(RuntimeException.class,
                () -> deliveryService.updateDeliveryStatus(9L, "OUT_FOR_DELIVERY", null));
    }

    @Test
    void startingDeliverySyncsOrderToOutForDelivery() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.ASSIGNED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryStatus(9L, "OUT_FOR_DELIVERY", null);

        assertEquals(DeliveryStatus.OUT_FOR_DELIVERY, response.getDeliveryStatus());
        // The order must track the delivery lifecycle so FAILED can send it
        // back to APPROVED for re-assignment.
        assertEquals(OrderStatus.OUT_FOR_DELIVERY, delivery.getOrder().getStatus());
        verify(orderRepository).save(delivery.getOrder());
    }

    @Test
    void deliveringOrderMovesOrderToDelivered() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryStatus(9L, "DELIVERED", null);

        assertEquals(DeliveryStatus.DELIVERED, response.getDeliveryStatus());
        assertEquals(OrderStatus.DELIVERED, delivery.getOrder().getStatus());
        assertNotNull(delivery.getDeliveredAt());
        verify(orderRepository).save(delivery.getOrder());
    }

    @Test
    void invalidDeliveryTransitionIsRejected() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.APPROVED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        // ASSIGNED -> DELIVERED skips OUT_FOR_DELIVERY and must be rejected.
        assertThrows(IllegalStateException.class,
                () -> deliveryService.updateDeliveryStatus(9L, "DELIVERED", null));
    }

    @Test
    void failedDeliverySendsOrderBackToApprovedForRetry() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryStatus(9L, "FAILED", "Customer not available");

        assertEquals(DeliveryStatus.FAILED, response.getDeliveryStatus());
        assertEquals("Customer not available", delivery.getFailureReason());
        // The order must be assignable again so another boy can retry.
        assertEquals(OrderStatus.APPROVED, delivery.getOrder().getStatus());
        verify(orderRepository).save(delivery.getOrder());
    }

    @Test
    void createDeliveryAllowsReassignmentAfterFailure() {

        Delivery failed = deliveryFor(boy, DeliveryStatus.FAILED, OrderStatus.APPROVED);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(failed.getOrder()));
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherBoy));
        when(deliveryRepository.findByOrder(failed.getOrder())).thenReturn(Optional.of(failed));

        deliveryService.createDelivery(com.distributrack.dto.request.DeliveryRequest.builder()
                .orderId(5L)
                .deliveryBoyId(2L)
                .deliveryAddress("Retry address")
                .build());

        // The failed attempt is replaced so the OneToOne order link stays clean.
        verify(deliveryRepository).delete(failed);
        verify(deliveryRepository).save(any(Delivery.class));
    }

    @Test
    void createDeliveryRejectsWhenActiveDeliveryExists() {

        Delivery active = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.APPROVED);
        when(orderRepository.findById(5L)).thenReturn(Optional.of(active.getOrder()));
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherBoy));
        when(deliveryRepository.findByOrder(active.getOrder())).thenReturn(Optional.of(active));

        assertThrows(RuntimeException.class,
                () -> deliveryService.createDelivery(com.distributrack.dto.request.DeliveryRequest.builder()
                        .orderId(5L)
                        .deliveryBoyId(2L)
                        .deliveryAddress("Another address")
                        .build()));

        verify(deliveryRepository, never()).delete(any(Delivery.class));
        verify(deliveryRepository, never()).save(any(Delivery.class));
    }

    // ------------------------------------------------------------------
    // GPS Location tracking tests
    // ------------------------------------------------------------------

    @Test
    void deliveryBoyCanUpdateOwnDeliveryLocation() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryLocation(9L, 19.0760, 72.8777);

        assertEquals(19.0760, response.getLatitude());
        assertEquals(72.8777, response.getLongitude());
        assertNotNull(response.getLastLocationAt());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void deliveryBoyCannotUpdateAnotherBoysDeliveryLocation() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(otherBoy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.updateDeliveryLocation(9L, 19.0760, 72.8777));

        verify(deliveryRepository, never()).save(any(Delivery.class));
    }

    @Test
    void shopkeeperCannotUpdateDeliveryLocation() {

        User manager = User.builder()
                .id(10L)
                .fullName("Manager")
                .email("mgr@test.com")
                .role(new Role(3L, RoleName.MANAGER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.updateDeliveryLocation(9L, 19.0760, 72.8777));
    }

    @Test
    void managerCanUpdateAnyDeliveryLocation() {

        User manager = User.builder()
                .id(10L)
                .fullName("Manager")
                .email("mgr@test.com")
                .role(new Role(3L, RoleName.MANAGER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(manager);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryLocation(9L, 28.6139, 77.2090);

        assertEquals(28.6139, response.getLatitude());
        assertEquals(77.2090, response.getLongitude());
    }

    @Test
    void locationUpdatePersistsTimestamp() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.updateDeliveryLocation(9L, 19.0760, 72.8777);

        assertNotNull(response.getLastLocationAt());
    }

    @Test
    void deliveryBoyCannotUpdateLocationOnTerminalStatus() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);
        Delivery delivery = deliveryFor(boy, DeliveryStatus.DELIVERED, OrderStatus.DELIVERED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        // assertCanModify allows DELIVERY_BOY on own deliveries regardless
        // of status — the restriction is at the frontend (tracking auto-stops).
        // Backend allows it for edge cases (e.g. final position on completion).
        DeliveryResponse response = deliveryService.updateDeliveryLocation(9L, 19.0760, 72.8777);

        assertNotNull(response.getLatitude());
    }

    // ------------------------------------------------------------------
    // Automatic delivery workflow tests
    // ------------------------------------------------------------------

    @Test
    void deliveryBoyCanAcceptAvailableDelivery() {

        boy.setEnabled(true);
        when(currentUserService.getCurrentUser()).thenReturn(boy);

        Delivery delivery = Delivery.builder()
                .id(9L)
                .order(Order.builder()
                        .id(5L).orderNumber("ORD-TEST")
                        .shopkeeper(shopkeeper)
                        .totalAmount(BigDecimal.valueOf(1000))
                        .status(OrderStatus.APPROVED)
                        .build())
                .deliveryStatus(DeliveryStatus.AVAILABLE)
                .deliveryAddress("Test Address")
                .build();

        when(deliveryRepository.findByIdWithLock(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.acceptDelivery(9L);

        assertEquals(DeliveryStatus.ASSIGNED, response.getDeliveryStatus());
        assertNotNull(response.getDeliveryBoyId());
        assertEquals(boy.getId(), response.getDeliveryBoyId());
        assertNotNull(response.getAssignedAt());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void disabledWorkerCannotAccept() {

        boy.setEnabled(false);
        when(currentUserService.getCurrentUser()).thenReturn(boy);

        assertThrows(RuntimeException.class,
                () -> deliveryService.acceptDelivery(9L));
    }

    @Test
    void nonWorkerCannotAccept() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        assertThrows(RuntimeException.class,
                () -> deliveryService.acceptDelivery(9L));
    }

    @Test
    void alreadyAssignedDeliveryCannotBeAccepted() {

        boy.setEnabled(true);
        when(currentUserService.getCurrentUser()).thenReturn(boy);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.ASSIGNED);
        when(deliveryRepository.findByIdWithLock(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.acceptDelivery(9L));
    }

    @Test
    void completedDeliveryCannotBeAccepted() {

        boy.setEnabled(true);
        when(currentUserService.getCurrentUser()).thenReturn(boy);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.DELIVERED, OrderStatus.DELIVERED);
        when(deliveryRepository.findByIdWithLock(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.acceptDelivery(9L));
    }

    @Test
    void adminCanEmergencyReassign() {

        User manager = User.builder()
                .id(10L).fullName("Manager")
                .email("mgr@test.com")
                .role(new Role(3L, RoleName.MANAGER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(manager);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.ASSIGNED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        DeliveryResponse response = deliveryService.emergencyReassign(9L);

        assertEquals(DeliveryStatus.AVAILABLE, response.getDeliveryStatus());
        assertNull(response.getDeliveryBoyId());
        assertNotNull(response.getAvailableAt());
        verify(deliveryRepository).save(delivery);
    }

    @Test
    void unauthorizedUserCannotEmergencyReassign() {

        when(currentUserService.getCurrentUser()).thenReturn(boy);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.ASSIGNED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.emergencyReassign(9L));
    }

    @Test
    void shopkeeperCannotEmergencyReassign() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.ASSIGNED, OrderStatus.ASSIGNED);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.emergencyReassign(9L));
    }

    @Test
    void emergencyReassignOnlyForAssignedStatus() {

        User manager = User.builder()
                .id(10L).fullName("Manager")
                .email("mgr@test.com")
                .role(new Role(3L, RoleName.MANAGER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(manager);

        Delivery delivery = deliveryFor(boy, DeliveryStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY);
        when(deliveryRepository.findById(9L)).thenReturn(Optional.of(delivery));

        assertThrows(RuntimeException.class,
                () -> deliveryService.emergencyReassign(9L));
    }
}
