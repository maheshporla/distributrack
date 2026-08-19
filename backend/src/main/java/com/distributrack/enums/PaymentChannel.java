package com.distributrack.enums;

/**
 * How a payment was collected.
 *
 * MANUAL — recorded by distributor staff (cash / cheque / bank transfer
 *          entered in User Management / Payments).
 * GATEWAY — collected through the Razorpay checkout in sandbox/live mode;
 *           recorded only after server-side signature + payment verification.
 * MOCK — collected through the built-in mock gateway used for development
 *        (identical flow to GATEWAY, but the "gateway" is the backend
 *        itself and no real money moves).
 *
 * Existing rows written before this enum existed default to MANUAL
 * (they were all staff-recorded payments).
 */
public enum PaymentChannel {
    MANUAL,
    GATEWAY,
    MOCK,
    UPI
}
