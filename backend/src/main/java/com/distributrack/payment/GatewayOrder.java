package com.distributrack.payment;

/**
 * A payment order created at the gateway (Razorpay Order in GATEWAY
 * mode, synthetic in MOCK mode).
 *
 * @param gatewayOrderId id the gateway assigned to the order
 * @param currency       ISO currency code (INR)
 * @param amountPaise    amount in the currency's smallest unit
 */
public record GatewayOrder(
        String gatewayOrderId,
        String currency,
        long amountPaise
) {
}
