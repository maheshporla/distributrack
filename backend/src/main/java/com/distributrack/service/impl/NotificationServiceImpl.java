package com.distributrack.service.impl;

import com.distributrack.dto.response.NotificationResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Inventory;
import com.distributrack.entity.Notification;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.User;
import com.distributrack.enums.NotificationType;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.InventoryRepository;
import com.distributrack.notification.NotificationDeliveryEvent;
import com.distributrack.notification.NotificationEventPublisher;
import com.distributrack.repository.NotificationRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * In-app notifications, always scoped to the authenticated user.
 *
 * Every public emitter wraps its work in try/catch so a notification
 * problem can never fail the business operation that triggered it.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private static final List<RoleName> BUSINESS_ROLES =
            List.of(RoleName.SUPER_ADMIN, RoleName.OWNER, RoleName.MANAGER);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final InventoryRepository inventoryRepository;
    private final CurrentUserService currentUserService;
    private final NotificationEventPublisher notificationEventPublisher;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // =========================================================
    // Query / mutate own notifications
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications() {

        User current = currentUserService.getCurrentUser();

        return notificationRepository
                .findByRecipientOrderByCreatedAtDesc(current)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount() {

        User current = currentUserService.getCurrentUser();

        return notificationRepository.countByRecipientAndReadFalse(current);
    }

    @Override
    @Transactional
    public NotificationResponse markAsRead(Long id) {

        User current = currentUserService.getCurrentUser();

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));

        // A user can only ever read their own notifications.
        if (!notification.getRecipient().getId().equals(current.getId())) {
            throw new RuntimeException("Notification not found with id: " + id);
        }

        notification.setRead(true);
        return mapToResponse(notificationRepository.save(notification));
    }

    @Override
    @Transactional
    public long markAllAsRead() {

        User current = currentUserService.getCurrentUser();

        return notificationRepository.markAllRead(current);
    }

    // =========================================================
    // Order events
    // =========================================================

    @Override
    public void notifyOrderCreated(Order order) {
        safely(() -> {
            // The shopkeeper learns their order is pending; business roles
            // learn a new order needs attention.
            save(order.getShopkeeper(), NotificationType.ORDER_CREATED,
                    "Order " + order.getOrderNumber() + " placed",
                    "Your order of " + formatAmount(order.getTotalAmount())
                            + " is pending approval.",
                    order.getId(), null);

            for (User businessUser : businessUsers()) {
                save(businessUser, NotificationType.ORDER_CREATED,
                        "New order " + order.getOrderNumber(),
                        "New order from " + order.getShopkeeper().getFullName()
                                + " (" + formatAmount(order.getTotalAmount()) + ") is awaiting approval.",
                        order.getId(), null);
            }
        });
    }

    @Override
    public void notifyOrderApproved(Order order) {
        safely(() -> save(order.getShopkeeper(), NotificationType.ORDER_APPROVED,
                "Order " + order.getOrderNumber() + " approved",
                "Your order has been approved and will be assigned for delivery.",
                order.getId(), null));
    }

    @Override
    public void notifyOrderRejected(Order order) {
        safely(() -> save(order.getShopkeeper(), NotificationType.ORDER_REJECTED,
                "Order " + order.getOrderNumber() + " rejected",
                "Your order was rejected. Please contact your distributor for details.",
                order.getId(), null));
    }

    @Override
    public void notifyOrderCancelled(Order order) {
        safely(() -> save(order.getShopkeeper(), NotificationType.ORDER_CANCELLED,
                "Order " + order.getOrderNumber() + " cancelled",
                "Your order has been cancelled.",
                order.getId(), null));
    }

    // =========================================================
    // Delivery events
    // =========================================================

    @Override
    public void notifyDeliveryAssigned(Delivery delivery) {
        safely(() -> {
            save(delivery.getDeliveryBoy(), NotificationType.DELIVERY_ASSIGNED,
                    "Delivery assigned",
                    "You have been assigned delivery for order "
                            + delivery.getOrder().getOrderNumber() + ".",
                    delivery.getOrder().getId(), null);

            save(delivery.getOrder().getShopkeeper(), NotificationType.DELIVERY_ASSIGNED,
                    "Delivery assigned for " + delivery.getOrder().getOrderNumber(),
                    "A delivery has been assigned — "
                            + delivery.getDeliveryBoy().getFullName()
                            + " will deliver your order.",
                    delivery.getOrder().getId(), null);
        });
    }

    @Override
    public void notifyDeliveryOutForDelivery(Delivery delivery) {
        safely(() -> save(delivery.getOrder().getShopkeeper(),
                NotificationType.DELIVERY_OUT_FOR_DELIVERY,
                "Out for delivery — " + delivery.getOrder().getOrderNumber(),
                "Your order is out for delivery with "
                        + delivery.getDeliveryBoy().getFullName() + ".",
                delivery.getOrder().getId(), null));
    }

    @Override
    public void notifyDeliveryDelivered(Delivery delivery) {
        safely(() -> save(delivery.getOrder().getShopkeeper(),
                NotificationType.DELIVERY_DELIVERED,
                "Delivered — " + delivery.getOrder().getOrderNumber(),
                "Your order has been delivered.",
                delivery.getOrder().getId(), null));
    }

    @Override
    public void notifyDeliveryFailed(Delivery delivery) {
        safely(() -> save(delivery.getOrder().getShopkeeper(),
                NotificationType.DELIVERY_FAILED,
                "Delivery failed — " + delivery.getOrder().getOrderNumber(),
                "Your delivery could not be completed. We will arrange a retry.",
                delivery.getOrder().getId(), null));
    }

    @Override
    public void notifyDeliveryCancelled(Delivery delivery) {
        safely(() -> save(delivery.getOrder().getShopkeeper(),
                NotificationType.DELIVERY_CANCELLED,
                "Delivery cancelled — " + delivery.getOrder().getOrderNumber(),
                "The delivery for your order has been cancelled.",
                delivery.getOrder().getId(), null));
    }

    // =========================================================
    // Payment events
    // =========================================================

    @Override
    public void notifyPaymentSuccess(Payment payment) {
        safely(() -> {
            save(payment.getOrder().getShopkeeper(), NotificationType.PAYMENT_SUCCESS,
                    "Payment received for " + payment.getOrder().getOrderNumber(),
                    "Payment of " + formatAmount(payment.getAmount())
                            + " received via " + payment.getPaymentMethod() + ".",
                    payment.getOrder().getId(), null);

            save(payment.getOrder().getShopkeeper(), NotificationType.INVOICE_AVAILABLE,
                    "Invoice available — " + payment.getOrder().getOrderNumber(),
                    "Your invoice is ready to view and print.",
                    payment.getOrder().getId(), null);

            // Business roles (SA/OWNER/MANAGER) learn about the incoming
            // payment for their records / reconciliation.
            for (User businessUser : businessUsers()) {
                save(businessUser, NotificationType.PAYMENT_SUCCESS,
                        "Payment received — " + payment.getOrder().getOrderNumber(),
                        "Payment received from "
                                + payment.getOrder().getShopkeeper().getFullName()
                                + ": " + formatAmount(payment.getAmount())
                                + " for order " + payment.getOrder().getOrderNumber() + ".",
                        payment.getOrder().getId(), null);
            }
        });
    }

    @Override
    public void notifyPaymentFailed(Payment payment) {
        safely(() -> save(payment.getOrder().getShopkeeper(),
                NotificationType.PAYMENT_FAILED,
                "Payment failed for " + payment.getOrder().getOrderNumber(),
                "The payment for your order could not be processed.",
                payment.getOrder().getId(), null));
    }

    @Override
    public void notifyPaymentRefunded(Payment payment) {
        safely(() -> save(payment.getOrder().getShopkeeper(),
                NotificationType.PAYMENT_REFUNDED,
                "Payment refunded for " + payment.getOrder().getOrderNumber(),
                "A refund of " + formatAmount(payment.getAmount())
                        + " has been issued for your order.",
                payment.getOrder().getId(), null));
    }

    // =========================================================
    // Scheduled low-stock scan
    // =========================================================

    /**
     * Scans inventory every 10 minutes and notifies business roles about
     * low-stock items. Dedupe: only one UNREAD LOW_STOCK notification per
     * inventory record per recipient — repeated scans never pile up
     * duplicates; reading the alert re-arms it if the item is still low.
     */
    @Override
    @Scheduled(fixedDelay = 600_000, initialDelay = 60_000)
    public void checkLowStockAndNotify() {

        safely(() -> {
            List<Inventory> lowStock = inventoryRepository.findAll().stream()
                    .filter(i -> i.getQuantity() < i.getMinimumStock())
                    .collect(Collectors.toList());

            if (lowStock.isEmpty()) {
                return;
            }

            List<User> businessUsers = businessUsers();

            for (Inventory inventory : lowStock) {
                String key = "LOW_STOCK:" + inventory.getId();

                for (User recipient : businessUsers) {
                    if (notificationRepository
                            .existsByRecipientAndDedupeKeyAndReadFalse(recipient, key)) {
                        continue;
                    }

                    String productName = inventory.getProduct().getProductName();
                    save(recipient, NotificationType.LOW_STOCK,
                            "Low stock: " + productName,
                            "Only " + inventory.getQuantity() + " of minimum "
                                    + inventory.getMinimumStock() + " remaining at "
                                    + inventory.getWarehouseLocation() + ".",
                            null, key);
                }
            }
        });
    }

    @Override
    public void notifyWorkerCreated(User worker, String activationToken) {
        safely(() -> {
            String activationLink = frontendUrl + "/reset-password?token=" + activationToken;
            save(worker, NotificationType.WORKER_CREATED,
                    "Your DistribuTrack Worker Account",
                    "Your DistribuTrack worker account has been created. Please use this link to set your password and activate your account: " + activationLink,
                    null, null);
        });
    }

    // =========================================================
    // Helpers
    // =========================================================

    private List<User> businessUsers() {
        List<User> users = new ArrayList<>();
        for (RoleName role : BUSINESS_ROLES) {
            users.addAll(userRepository.findByRole_Name(role));
        }
        return users;
    }

    private void save(User recipient, NotificationType type,
                      String title, String message, Long relatedOrderId,
                      String dedupeKey) {

        Notification notification = Notification.builder()
                .recipient(recipient)
                .type(type)
                .title(title)
                .message(message)
                .relatedOrderId(relatedOrderId)
                .dedupeKey(dedupeKey)
                .build();

        notificationRepository.save(notification);

        boolean emailEnabledForUser = Boolean.TRUE.equals(recipient.getEmailNotificationsEnabled());
        boolean smsEnabledForUser = Boolean.TRUE.equals(recipient.getSmsNotificationsEnabled());

        // Fan the event out to the out-of-band channels (email + SMS).
        // The async listener isolates provider failures from this flow.
        notificationEventPublisher.publish(new NotificationDeliveryEvent(
                emailEnabledForUser ? recipient.getEmail() : null,
                smsEnabledForUser ? recipient.getPhone() : null,
                recipient.getFullName(),
                type,
                title,
                message
        ));
    }

    /**
     * Runs a notification operation, swallowing + logging any failure so
     * the triggering business flow is never broken by notifications.
     */
    private void safely(Runnable operation) {
        try {
            operation.run();
        } catch (Exception ex) {
            log.warn("Notification delivery failed (swallowed): {}", ex.getMessage());
        }
    }

    private static String formatAmount(java.math.BigDecimal amount) {
        return "₹" + amount.toPlainString();
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .relatedOrderId(notification.getRelatedOrderId())
                .read(notification.getRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
