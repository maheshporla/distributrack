package com.distributrack.enums;

/**
 * Controlled payment statuses.
 *
 * Values used by the previous String-based status column ("PENDING",
 * "SUCCESS") are retained verbatim so existing rows load correctly.
 */
public enum PaymentStatus {

    PENDING,
    SUCCESS,
    FAILED,
    REFUNDED
}
