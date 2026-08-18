package com.distributrack.enums;

/**
 * Controlled order lifecycle.
 *
 * Business flow:
 *   PENDING (shopkeeper creates)
 *     -> APPROVED  (owner/manager approval)
 *     -> REJECTED  (terminal, owner/manager)
 *     -> CANCELLED (terminal)
 *   APPROVED -> ASSIGNED          (delivery created)
 *   ASSIGNED -> OUT_FOR_DELIVERY  (delivery boy starts)
 *   OUT_FOR_DELIVERY -> DELIVERED (delivery boy completes)
 *   OUT_FOR_DELIVERY -> APPROVED  (delivery FAILED — back to assignable)
 *   DELIVERED -> COMPLETED        (payment finalized; legacy terminal state)
 *
 * COMPLETED is retained as a valid state so pre-existing database rows
 * written by the previous String-based status column (which used
 * "COMPLETED" as the final state) continue to load and serialize
 * correctly. It is terminal and only reachable from DELIVERED.
 */
public enum OrderStatus {

    PENDING,
    APPROVED,
    REJECTED,
    ASSIGNED,
    OUT_FOR_DELIVERY,
    DELIVERED,
    COMPLETED,
    CANCELLED;

    /**
     * Whether {@code next} is a legal transition from this state.
     * Terminal states (REJECTED, COMPLETED, CANCELLED) allow none.
     */
    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next == APPROVED || next == REJECTED || next == CANCELLED;
            case APPROVED -> next == ASSIGNED || next == REJECTED || next == CANCELLED;
            case ASSIGNED -> next == OUT_FOR_DELIVERY || next == CANCELLED;
            case OUT_FOR_DELIVERY -> next == DELIVERED || next == CANCELLED || next == APPROVED;
            case DELIVERED -> next == COMPLETED;
            case REJECTED, COMPLETED, CANCELLED -> false;
        };
    }
}
