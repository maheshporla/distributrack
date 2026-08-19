package com.distributrack.service;

import com.distributrack.dto.response.NotificationResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.entity.User;

import java.util.List;

/**
 * In-app notifications.
 *
 * Ownership rule: every operation is scoped to the authenticated JWT
 * principal (CurrentUserService) — the API never accepts a userId, and a
 * user can never see or modify another user's notifications.
 *
 * Event emitters are invoked from the order/delivery/payment services
 * and are guaranteed not to throw: a notification failure must never
 * break the core business flow it accompanies.
 */
public interface NotificationService {

    // ---------------------------------------------------------
    // Query / mutate own notifications
    // ---------------------------------------------------------

    List<NotificationResponse> getMyNotifications();

    long getUnreadCount();

    NotificationResponse markAsRead(Long id);

    /** Returns how many notifications were marked as read. */
    long markAllAsRead();

    // ---------------------------------------------------------
    // Event emitters (called by the business services)
    // ---------------------------------------------------------

    void notifyOrderCreated(Order order);

    void notifyOrderApproved(Order order);

    void notifyOrderRejected(Order order);

    void notifyOrderCancelled(Order order);

    void notifyDeliveryAssigned(Delivery delivery);

    void notifyDeliveryOutForDelivery(Delivery delivery);

    void notifyDeliveryDelivered(Delivery delivery);

    void notifyDeliveryFailed(Delivery delivery);

    void notifyDeliveryCancelled(Delivery delivery);

    /** Emits PAYMENT_SUCCESS (+ INVOICE_AVAILABLE) to the shopkeeper. */
    void notifyPaymentSuccess(Payment payment);

    void notifyPaymentFailed(Payment payment);

    void notifyPaymentRefunded(Payment payment);

    /**
     * Scheduled low-stock scan. Uses a dedupe key so repeated checks never
     * create unlimited duplicate notifications per inventory record.
     */
    void checkLowStockAndNotify();

    void notifyWorkerCreated(User worker, String activationToken);
}
