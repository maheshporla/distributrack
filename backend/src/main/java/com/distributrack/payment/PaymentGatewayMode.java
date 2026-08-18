package com.distributrack.payment;

/**
 * Payment gateway operating mode.
 *
 * GATEWAY — real Razorpay integration in test/sandbox mode (and live in
 *           production with live keys). Money flows through Razorpay.
 * MOCK — the built-in development gateway: same API contract and same
 *        verification mechanics, but the "gateway" is this application
 *        itself and nothing real is charged. This is the default so the
 *        whole payment flow works out of the box without credentials.
 */
public enum PaymentGatewayMode {
    GATEWAY,
    MOCK
}
