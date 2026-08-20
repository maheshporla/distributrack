package com.distributrack.enums;

/**
 * Worker availability state — separate from account enabled/disabled.
 *
 * AVAILABLE: approved worker ready to accept new deliveries.
 *            Workers can handle MULTIPLE simultaneous deliveries.
 * OFFLINE:   not accepting deliveries (default for new workers).
 */
public enum WorkerAvailability {
    AVAILABLE,
    OFFLINE
}
