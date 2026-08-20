package com.distributrack.enums;

/**
 * Controlled delivery lifecycle.
 *
 *   AVAILABLE          -> ASSIGNED (worker accepts) | CANCELLED
 *   ASSIGNED           -> OUT_FOR_DELIVERY | CANCELLED
 *   OUT_FOR_DELIVERY   -> DELIVERED | FAILED | CANCELLED
 *   DELIVERED / FAILED / CANCELLED -> terminal
 *
 * AVAILABLE is the initial state for auto-created deliveries.
 * When an order is APPROVED, the system creates a delivery in AVAILABLE
 * state. Online delivery workers see it and can accept (atomic first-accept).
 */
public enum DeliveryStatus {

    AVAILABLE,
    ASSIGNED,
    OUT_FOR_DELIVERY,
    DELIVERED,
    FAILED,
    CANCELLED;

    /**
     * Whether {@code next} is a legal transition from this state.
     * DELIVERED / FAILED / CANCELLED are terminal.
     */
    public boolean canTransitionTo(DeliveryStatus next) {
        return switch (this) {
            case AVAILABLE -> next == ASSIGNED || next == CANCELLED;
            case ASSIGNED -> next == OUT_FOR_DELIVERY || next == CANCELLED;
            case OUT_FOR_DELIVERY -> next == DELIVERED || next == FAILED || next == CANCELLED;
            case DELIVERED, FAILED, CANCELLED -> false;
        };
    }
}
