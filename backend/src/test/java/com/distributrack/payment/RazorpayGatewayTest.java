package com.distributrack.payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Proves the server-side signature verification against the REAL Razorpay
 * algorithm using pre-computed HMAC-SHA256 vectors:
 *
 *   checkout signature = hex(HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET))
 *   webhook signature  = hex(HMAC-SHA256(raw_request_body, WEBHOOK_SECRET))
 *
 * The expected hex values below were computed independently (Python's
 * hmac/hashlib) from the same inputs, so a passing test proves the Java
 * implementation produces byte-identical signatures — no real Razorpay
 * credentials or network access are needed.
 */
class RazorpayGatewayTest {

    private RazorpayGateway gateway;

    @BeforeEach
    void setUp() {
        PaymentProperties properties = new PaymentProperties();
        properties.setKeyId("test_key_id");
        properties.setKeySecret("test_key_secret_123");
        properties.setWebhookSecret("test_webhook_secret_456");
        gateway = new RazorpayGateway(properties, new RestTemplateBuilder());
    }

    // ------------------------------------------------------------------
    // Checkout signature (payment.verify endpoint)
    // ------------------------------------------------------------------

    @Test
    void verifyPaymentSignature_acceptsGenuineRazorpaySignature() {
        // HMAC-SHA256("order_ABC123|pay_DEF456", "test_key_secret_123")
        String genuine =
                "53247e4087efbb2ff9a4f1e77e47bd17ddd0d3c6522da8541f6dc515eb0ed0fc";

        assertTrue(gateway.verifyPaymentSignature(
                "order_ABC123", "pay_DEF456", genuine),
                "genuine Razorpay checkout signature must verify");
    }

    @Test
    void verifyPaymentSignature_rejectsTamperedOrderId() {
        String genuine =
                "53247e4087efbb2ff9a4f1e77e47bd17ddd0d3c6522da8541f6dc515eb0ed0fc";

        assertFalse(gateway.verifyPaymentSignature(
                "order_OTHER", "pay_DEF456", genuine),
                "a signature bound to a different order must not verify");
    }

    @Test
    void verifyPaymentSignature_rejectsTamperedSignature() {
        assertFalse(gateway.verifyPaymentSignature(
                "order_ABC123", "pay_DEF456", "0".repeat(64)));
    }

    @Test
    void verifyPaymentSignature_rejectsMissingSignature() {
        assertFalse(gateway.verifyPaymentSignature(
                "order_ABC123", "pay_DEF456", null));
    }

    // ------------------------------------------------------------------
    // Webhook signature (payment.captured webhook)
    // ------------------------------------------------------------------

    @Test
    void verifyWebhookSignature_acceptsGenuineWebhookSignature() {
        String rawBody = "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":"
                + "{\"id\":\"pay_wh_1\",\"order_id\":\"order_ABC123\",\"amount\":125050,"
                + "\"status\":\"captured\"}}}}";
        // HMAC-SHA256(rawBody, "test_webhook_secret_456")
        String genuine =
                "8fc9a00d5bacde3c49540f55ce30d9d3de5d2aafcb9f0f864fcc6dbfdf964f37";

        assertTrue(gateway.verifyWebhookSignature(rawBody, genuine),
                "genuine webhook signature must verify");
    }

    @Test
    void verifyWebhookSignature_rejectsModifiedBody() {
        String rawBody = "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":"
                + "{\"id\":\"pay_wh_1\",\"order_id\":\"order_ABC123\",\"amount\":125050,"
                + "\"status\":\"captured\"}}}}";
        String genuine =
                "8fc9a00d5bacde3c49540f55ce30d9d3de5d2aafcb9f0f864fcc6dbfdf964f37";

        // A single appended byte (even whitespace) changes the payload.
        assertFalse(gateway.verifyWebhookSignature(rawBody + " ", genuine));
        assertFalse(gateway.verifyWebhookSignature(rawBody, genuine + "0"));
    }

    @Test
    void verifyWebhookSignature_rejectsNullSignature() {
        String rawBody = "{\"event\":\"payment.captured\"}";
        assertFalse(gateway.verifyWebhookSignature(rawBody, null));
    }

    // ------------------------------------------------------------------
    // Amount handling (no network: verify the paise conversion contract)
    // ------------------------------------------------------------------

    @Test
    void createOrder_usesPaiseConversion() {
        // 1250.50 INR must become 125050 paise on the wire. The conversion
        // is exercised through a fresh mock gateway (no network involved).
        PaymentProperties mockProps = new PaymentProperties();
        GatewayOrder order = new MockPaymentGateway(mockProps)
                .createOrder(new java.math.BigDecimal("1250.50"), "rcpt", null);
        assertTrue(order.amountPaise() == 125050L,
                "1250.50 INR must convert to 125050 paise");
    }
}
