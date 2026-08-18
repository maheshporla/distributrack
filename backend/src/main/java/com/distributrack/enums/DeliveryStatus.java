package com.distributrack.enums;

/**
 * Controlled delivery lifecycle.
 *
 *   ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED
 *   ASSIGNED/OUT_FOR_DELIVERY -> CANCELLED
 *   OUT_FOR_DELIVERY -> FAILED  (terminal; order can be retried)
 *
 * The pre-existing String status column defaulted to "ASSIGNED", which is
 * retained as the initial state so existing rows load correctly.
 */
public enum DeliveryStatus {

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
            case ASSIGNED -> next == OUT_FOR_DELIVERY || next == CANCELLED;
            case OUT_FOR_DELIVERY -> next == DELIVERED || next == FAILED || next == CANCELLED;
            case DELIVERED, FAILED, CANCELLED -> false;
        };
    }
}
