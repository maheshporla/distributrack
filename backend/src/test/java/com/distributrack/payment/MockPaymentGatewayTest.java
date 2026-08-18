package com.distributrack.payment;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MockPaymentGatewayTest {

    private MockPaymentGateway gateway;

    @BeforeEach
    void setUp() {
        gateway = new MockPaymentGateway(new PaymentProperties());
    }

    @Test
    void createsOrderWithPaiseConversion() {

        GatewayOrder order = gateway.createOrder(BigDecimal.valueOf(1250.50), "ORD-1", "note");

        assertNotNull(order.gatewayOrderId());
        assertTrue(order.gatewayOrderId().startsWith("mock_ord_"));
        assertEquals("INR", order.currency());
        assertEquals(125050, order.amountPaise());
    }

    @Test
    void checkoutSignatureRoundTripVerifies() {

        String orderId = "mock_ord_abc";
        String paymentId = "mock_pay_def";

        String signature = gateway.createCheckoutSignature(orderId, paymentId);

        assertTrue(gateway.verifyPaymentSignature(orderId, paymentId, signature));
        // Wrong payment id -> rejected.
        assertFalse(gateway.verifyPaymentSignature(orderId, "mock_pay_evil", signature));
        // Forged signature -> rejected.
        assertFalse(gateway.verifyPaymentSignature(orderId, paymentId, "deadbeef"));
    }

    @Test
    void webhookSignatureVerifies() {

        String body = "{\"event\":\"payment.captured\"}";
        String signature = hmac(body);

        assertTrue(gateway.verifyWebhookSignature(body, signature));
        assertFalse(gateway.verifyWebhookSignature(body, "tampered"));
    }

    private String hmac(String body) {
        // Independent HMAC-SHA256 hex computation (java built-ins only).
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                    "distributrack-dev-mock-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8),
                    "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(
                    mac.doFinal(body.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }
}
