package com.distributrack.enums;

/**
 * Business events that produce in-app notifications. Every value maps to
 * a real event emitted by the order / delivery / payment / inventory
 * modules — notifications are never fabricated.
 */
public enum NotificationType {

    // Orders
    ORDER_CREATED,
    ORDER_APPROVED,
    ORDER_REJECTED,
    ORDER_CANCELLED,

    // Deliveries
    DELIVERY_ASSIGNED,
    DELIVERY_OUT_FOR_DELIVERY,
    DELIVERY_DELIVERED,
    DELIVERY_FAILED,
    DELIVERY_CANCELLED,

    // Payments / invoices
    PAYMENT_SUCCESS,
    PAYMENT_FAILED,
    PAYMENT_REFUNDED,
    INVOICE_AVAILABLE,

    // UPI direct payments
    UPI_PAYMENT_SUBMITTED,
    UPI_PAYMENT_APPROVED,
    UPI_PAYMENT_REJECTED,

    // Inventory
    LOW_STOCK,

    // Administration
    WORKER_CREATED
}
