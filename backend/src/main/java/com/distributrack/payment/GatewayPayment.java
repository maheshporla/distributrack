package com.distributrack.payment;

/**
 * A payment captured at the gateway, fetched by id for verification.
 *
 * @param id           gateway payment id
 * @param orderId      gateway order id the payment belongs to
 * @param amountPaise  amount in the currency's smallest unit
 * @param status       gateway status string ("captured", "authorized",
 *                     "failed", ...)
 */
public record GatewayPayment(
        String id,
        String orderId,
        long amountPaise,
        String status
) {

    public boolean captured() {
        return "captured".equalsIgnoreCase(status);
    }
}
