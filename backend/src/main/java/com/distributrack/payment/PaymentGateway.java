package com.distributrack.payment;

import java.math.BigDecimal;

/**
 * Abstraction over the payment gateway. Two implementations exist:
 *
 *  - {@link RazorpayGateway}   — real Razorpay Orders/Payments API in
 *    sandbox/live mode (activated with {@code app.payment.mode=sandbox}).
 *  - {@link MockPaymentGateway} — self-contained development gateway
 *    (default), identical contract and verification mechanics.
 *
 * The business logic (PaymentServiceImpl) depends only on this
 * interface, so the mode can be switched purely through configuration
 * and the server-side verification flow stays identical.
 */
public interface PaymentGateway {

    PaymentGatewayMode mode();

    /**
     * Create a payment order at the gateway for the given INR amount.
     */
    GatewayOrder createOrder(BigDecimal amountInr, String receipt, String notes);

    /**
     * Fetch a payment by its gateway id — used to confirm the payment was
     * actually captured (never trust the frontend callback alone).
     */
    GatewayPayment fetchPayment(String gatewayPaymentId);

    /**
     * Verify the webhook signature over the raw request body.
     */
    boolean verifyWebhookSignature(String rawBody, String signature);

    /**
     * Verify the checkout signature (orderId + "|" + paymentId signed by
     * the gateway secret).
     */
    boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature);

    /**
     * Razorpay key id the frontend needs to open the checkout — null in
     * MOCK mode (no checkout is opened).
     */
    String keyId();

    /**
     * MOCK mode only: issue the checkout signature the backend will later
     * validate. Unsupported in GATEWAY mode — Razorpay signs on its side.
     */
    default String createCheckoutSignature(String gatewayOrderId, String gatewayPaymentId) {
        throw new UnsupportedOperationException(
                "createCheckoutSignature is only supported by the mock gateway"
        );
    }
}
