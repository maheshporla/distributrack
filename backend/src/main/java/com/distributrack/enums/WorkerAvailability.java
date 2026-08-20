package com.distributrack.enums;

/**
 * Worker availability state — separate from account enabled/disabled.
 *
 * AVAILABLE: approved worker ready to accept new deliveries.
 * BUSY:     currently handling an active delivery (set by system, not worker).
 * OFFLINE:  not accepting deliveries (default for new workers).
 */
public enum WorkerAvailability {
    AVAILABLE,
    BUSY,
    OFFLINE
}
