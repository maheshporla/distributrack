package com.distributrack.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/**
 * Real Razorpay integration (Orders + Payments API, webhook and checkout
 * signature verification). Activated with {@code app.payment.mode=sandbox}
 * (or {@code live}); requires RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
 * RAZORPAY_WEBHOOK_SECRET to be configured.
 *
 * Money only ever moves through Razorpay's servers: this class never
 * sees card numbers or UPI details, and it never trusts the frontend —
 * the checkout callback is validated via HMAC signature and the payment
 * is re-fetched from Razorpay to confirm it was captured.
 */
@Slf4j
@Component
public class RazorpayGateway implements PaymentGateway {

    private final String keyId;
    private final String keySecret;
    private final String webhookSecret;
    private final RestClient restClient;

    public RazorpayGateway(PaymentProperties properties, RestTemplateBuilder builder) {
        this.keyId = properties.getKeyId();
        this.keySecret = properties.getKeySecret();
        this.webhookSecret = properties.getWebhookSecret();

        String auth = Base64.getEncoder()
                .encodeToString((keyId + ":" + keySecret).getBytes(StandardCharsets.UTF_8));

        this.restClient = RestClient.builder()
                .baseUrl(properties.getApiUrl())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + auth)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public PaymentGatewayMode mode() {
        return PaymentGatewayMode.GATEWAY;
    }

    @Override
    public GatewayOrder createOrder(BigDecimal amountInr, String receipt, String notes) {

        long paise = toPaise(amountInr);

        Map<String, Object> body = Map.of(
                "amount", paise,
                "currency", "INR",
                "receipt", receipt,
                "notes", Map.of("receipt", receipt, "notes", notes == null ? "" : notes)
        );

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.post()
                .uri("/orders")
                .body(body)
                .retrieve()
                .body(Map.class);

        String orderId = response != null ? String.valueOf(response.get("id")) : null;
        if (orderId == null || orderId.isBlank()) {
            throw new IllegalStateException("Razorpay did not return an order id");
        }

        log.info("Razorpay order created: {} ({} paise)", orderId, paise);

        return new GatewayOrder(orderId, "INR", paise);
    }

    @Override
    public GatewayPayment fetchPayment(String gatewayPaymentId) {

        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClient.get()
                .uri("/payments/{id}", gatewayPaymentId)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException("Razorpay returned no payment for " + gatewayPaymentId);
        }

        String id = String.valueOf(response.get("id"));
        String orderId = String.valueOf(response.get("order_id"));
        long amount = response.get("amount") instanceof Number n ? n.longValue() : 0L;
        String status = String.valueOf(response.get("status"));

        return new GatewayPayment(id, orderId, amount, status);
    }

    @Override
    public boolean verifyWebhookSignature(String rawBody, String signature) {
        return constantTimeEquals(hmacSha256Hex(webhookSecret, rawBody), signature);
    }

    @Override
    public boolean verifyPaymentSignature(String gatewayOrderId, String gatewayPaymentId, String signature) {
        // Razorpay signs orderId + "|" + paymentId with the KEY secret.
        String payload = gatewayOrderId + "|" + gatewayPaymentId;
        return constantTimeEquals(hmacSha256Hex(keySecret, payload), signature);
    }

    @Override
    public String keyId() {
        return keyId;
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

    /** Constant-time comparison — never leaks the expected signature. */
    private static boolean constantTimeEquals(String expected, String actual) {
        if (actual == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = actual.getBytes(StandardCharsets.UTF_8);
        return java.security.MessageDigest.isEqual(expectedBytes, actualBytes);
    }
}
