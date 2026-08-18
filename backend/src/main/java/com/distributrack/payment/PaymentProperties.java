package com.distributrack.payment;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Payment gateway configuration (prefix {@code app.payment}).
 *
 * Defaults are development-safe: MOCK mode requires no credentials and
 * never moves real money. Switch to {@code app.payment.mode=sandbox} and
 * provide RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
 * to use the real Razorpay test environment.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.payment")
public class PaymentProperties {

    /** GATEWAY (real Razorpay) or MOCK (built-in dev gateway). */
    private String mode = "mock";

    private String keyId = "";

    private String keySecret = "";

    private String webhookSecret = "";

    /** Secret used by the mock gateway to issue/verify signatures. */
    private String mockSecret = "distributrack-dev-mock-secret";

    /** Razorpay API base URL (sandbox and live share this endpoint). */
    private String apiUrl = "https://api.razorpay.com/v1";
}
