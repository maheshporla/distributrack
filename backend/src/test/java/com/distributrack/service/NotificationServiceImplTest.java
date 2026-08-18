package com.distributrack.service;

import com.distributrack.dto.response.NotificationResponse;
import com.distributrack.entity.*;
import com.distributrack.enums.NotificationType;
import com.distributrack.enums.RoleName;
import com.distributrack.notification.NotificationEventPublisher;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.repository.NotificationRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationServiceImplTest {

    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final InventoryRepository inventoryRepository = mock(InventoryRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final NotificationEventPublisher notificationEventPublisher = mock(NotificationEventPublisher.class);

    private final NotificationServiceImpl notificationService = new NotificationServiceImpl(
            notificationRepository,
            userRepository,
            inventoryRepository,
            currentUserService,
            notificationEventPublisher
    );

    private User shopkeeper;
    private User otherShopkeeper;
    private User deliveryBoy;
    private User owner;

    @BeforeEach
    void setUp() {
        shopkeeper = user(1L, RoleName.SHOPKEEPER, "Shop One");
        otherShopkeeper = user(2L, RoleName.SHOPKEEPER, "Shop Two");
        deliveryBoy = user(3L, RoleName.DELIVERY_BOY, "Boy One");
        owner = user(4L, RoleName.OWNER, "Owner One");

        when(notificationRepository.save(any(Notification.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private User user(Long id, RoleName roleName, String fullName) {
        return User.builder()
                .id(id)
                .fullName(fullName)
                .email(fullName.toLowerCase().replace(" ", "") + "@test.com")
                .phone("9000000000")
                .role(new Role(0L, roleName))
                .build();
    }

    private Notification notification(Long id, User recipient, NotificationType type) {
        return Notification.builder()
                .id(id)
                .recipient(recipient)
                .type(type)
                .title("Title")
                .message("Message")
                .read(false)
                .build();
    }

    private Order order(User forShopkeeper) {
        return Order.builder()
                .id(5L)
                .orderNumber("ORD-TEST")
                .shopkeeper(forShopkeeper)
                .totalAmount(BigDecimal.valueOf(1000))
                .build();
    }

    private Delivery delivery() {
        Order order = order(shopkeeper);
        return Delivery.builder()
                .id(9L)
                .order(order)
                .deliveryBoy(deliveryBoy)
                .build();
    }

    private Payment payment() {
        return Payment.builder()
                .id(10L)
                .order(order(shopkeeper))
                .amount(BigDecimal.valueOf(1000))
                .paymentMethod("UPI")
                .build();
    }

    // ---------------------------------------------------------
    // Ownership
    // ---------------------------------------------------------

    @Test
    void userCannotMarkAnotherUsersNotificationAsRead() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(notificationRepository.findById(9L))
                .thenReturn(Optional.of(notification(9L, otherShopkeeper, NotificationType.ORDER_APPROVED)));

        assertThrows(RuntimeException.class, () -> notificationService.markAsRead(9L));
    }

    @Test
    void listsOnlyOwnNotifications() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(notificationRepository.findByRecipientOrderByCreatedAtDesc(shopkeeper))
                .thenReturn(List.of(
                        notification(1L, shopkeeper, NotificationType.ORDER_APPROVED),
                        notification(2L, shopkeeper, NotificationType.PAYMENT_SUCCESS)
                ));

        List<NotificationResponse> notifications = notificationService.getMyNotifications();

        assertEquals(2, notifications.size());
        verify(notificationRepository, never()).findAll();
    }

    @Test
    void unreadCountIsScopedToCurrentUser() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(notificationRepository.countByRecipientAndReadFalse(shopkeeper)).thenReturn(3L);

        assertEquals(3L, notificationService.getUnreadCount());
        verify(notificationRepository, never()).countByRecipientAndReadFalse(otherShopkeeper);
    }

    @Test
    void markAsReadFlagsNotification() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        Notification unread = notification(9L, shopkeeper, NotificationType.DELIVERY_DELIVERED);
        when(notificationRepository.findById(9L)).thenReturn(Optional.of(unread));

        NotificationResponse response = notificationService.markAsRead(9L);

        assertTrue(response.getRead());
        assertTrue(unread.getRead());
    }

    @Test
    void markAllAsReadReturnsCount() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);
        when(notificationRepository.markAllRead(shopkeeper)).thenReturn(4);

        assertEquals(4L, notificationService.markAllAsRead());
        verify(notificationRepository).markAllRead(shopkeeper);
    }

    // ---------------------------------------------------------
    // Event creation
    // ---------------------------------------------------------

    @Test
    void orderCreatedNotifiesShopkeeperAndBusinessRoles() {

        when(userRepository.findByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRole_Name(RoleName.OWNER)).thenReturn(List.of(owner));
        when(userRepository.findByRole_Name(RoleName.MANAGER)).thenReturn(List.of());

        notificationService.notifyOrderCreated(order(shopkeeper));

        // Shopkeeper + one owner = 2 notifications.
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void deliveryAssignedNotifiesBoyAndShopkeeper() {

        notificationService.notifyDeliveryAssigned(delivery());

        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void paymentSuccessEmitsPaymentAndInvoiceNotifications() {

        notificationService.notifyPaymentSuccess(payment());

        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void paymentSuccessAlsoNotifiesBusinessRoles() {

        when(userRepository.findByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRole_Name(RoleName.OWNER)).thenReturn(List.of(owner));
        when(userRepository.findByRole_Name(RoleName.MANAGER)).thenReturn(List.of());

        notificationService.notifyPaymentSuccess(payment());

        // Shopkeeper (payment) + shopkeeper (invoice) + one owner = 3.
        verify(notificationRepository, times(3)).save(any(Notification.class));
    }

    // ---------------------------------------------------------
    // Low-stock dedupe
    // ---------------------------------------------------------

    @Test
    void lowStockScanDoesNotDuplicateUnreadNotifications() {

        Product product = Product.builder().id(1L).productName("Rice 5kg").build();
        Inventory inventory = Inventory.builder()
                .id(7L)
                .product(product)
                .quantity(5)
                .minimumStock(10)
                .warehouseLocation("Main")
                .build();

        when(inventoryRepository.findAll()).thenReturn(List.of(inventory));
        when(userRepository.findByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(List.of());
        when(userRepository.findByRole_Name(RoleName.OWNER)).thenReturn(List.of(owner));
        when(userRepository.findByRole_Name(RoleName.MANAGER)).thenReturn(List.of());

        // First scan: no existing unread alert -> creates one.
        when(notificationRepository.existsByRecipientAndDedupeKeyAndReadFalse(
                owner, "LOW_STOCK:7")).thenReturn(false);
        notificationService.checkLowStockAndNotify();
        verify(notificationRepository, times(1)).save(any(Notification.class));

        // Second scan: unread alert already exists -> no duplicate.
        when(notificationRepository.existsByRecipientAndDedupeKeyAndReadFalse(
                owner, "LOW_STOCK:7")).thenReturn(true);
        notificationService.checkLowStockAndNotify();
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void lowStockScanSkipsHealthyInventory() {

        Product product = Product.builder().id(1L).productName("Rice 5kg").build();
        Inventory healthy = Inventory.builder()
                .id(7L)
                .product(product)
                .quantity(50)
                .minimumStock(10)
                .warehouseLocation("Main")
                .build();

        when(inventoryRepository.findAll()).thenReturn(List.of(healthy));

        notificationService.checkLowStockAndNotify();

        verify(notificationRepository, never()).save(any(Notification.class));
    }
}
