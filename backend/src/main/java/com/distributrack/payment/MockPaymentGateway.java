package com.distributrack.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Self-contained development gateway (default {@code app.payment.mode}).
 *
 * It implements the exact same contract as {@link RazorpayGateway} —
 * order creation, webhook + checkout signature verification with
 * HMAC-SHA256 — but the "gateway" is this application itself, so the
 * full payment flow works out of the box without any credentials and no
 * real money is ever involved.
 *
 * The checkout signature is issued by the backend (createCheckoutSignature)
 * and validated by the same verify step used for Razorpay, so the
 * server-side verification path is exercised identically in both modes.
 *
 * The mock gateway has no server-side payment state to query, so
 * {@link #fetchPayment} is never called by the verify flow (that check
 * only runs in GATEWAY mode, where the gateway is authoritative).
 */
@Slf4j
@Component
public class MockPaymentGateway implements PaymentGateway {

    private final String mockSecret;

    public MockPaymentGateway(PaymentProperties properties) {
        this.mockSecret = properties.getMockSecret();
        if (mockSecret == null || mockSecret.isBlank()) {
            throw new IllegalStateException(
                    "PAYMENT_MOCK_SECRET must not be empty when using mock payment mode. "
                            + "Set it to a secure random string in your environment variables, "
                            + "or switch to sandbox mode with valid Razorpay credentials."
            );
        }
    }

    @Override
    public PaymentGatewayMode mode() {
        return PaymentGatewayMode.MOCK;
    }

    @Override
    public GatewayOrder createOrder(BigDecimal amountInr, String receipt, String notes) {

        GatewayOrder order = new GatewayOrder(
                "mock_ord_" + UUID.randomUUID().toString().substring(0, 12),
                "INR",
                toPaise(amountInr)
        );

        log.info("[MOCK GATEWAY] order created: {} ({} paise)", order.gatewayOrderId(), order.amountPaise());

        return order;
    }

    @Override
    public GatewayPayment fetchPayment(String gatewayPaymentId) {
        // Stand-in only — the verify flow skips fetchPayment in MOCK mode.
        // Payments that reach verification are treated as captured
        // (mirrors the Razorpay sandbox "always succeeds" behaviour).
        return new GatewayPayment(gatewayPaymentId, "mock_ord_unknown", 0L, "captured");
    }

    @Override
    public boolean verifyWebhookSignature(String rawBody, String signature) {
        return constantTimeEquals(hmacSha256Hex(mockSecret, rawBody), signature);
    }

    @Override
    public boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature) {
        String payload = gatewayOrderId + "|" + gatewayPaymentId;
        return constantTimeEquals(hmacSha256Hex(mockSecret, payload), signature);
    }

    @Override
    public String createCheckoutSignature(String gatewayOrderId, String gatewayPaymentId) {
        return hmacSha256Hex(mockSecret, gatewayOrderId + "|" + gatewayPaymentId);
    }

    @Override
    public String keyId() {
        return null;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private static long toPaise(BigDecimal amountInr) {
        return amountInr.multiply(BigDecimal.valueOf(100))
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .longValueExact();
    }

    private static String hmacSha256Hex(String secret, String payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute HMAC signature", ex);
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        if (actual == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = actual.getBytes(StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(expectedBytes, actualBytes);
    }
}
