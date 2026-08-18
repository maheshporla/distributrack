package com.distributrack.config;

import com.distributrack.payment.MockPaymentGateway;
import com.distributrack.payment.PaymentGateway;
import com.distributrack.payment.PaymentProperties;
import com.distributrack.payment.RazorpayGateway;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Selects the active {@link PaymentGateway} from configuration:
 *
 *   app.payment.mode=mock    -> MockPaymentGateway (default, no credentials)
 *   app.payment.mode=sandbox -> RazorpayGateway (real test environment)
 *
 * Business code only depends on the {@link PaymentGateway} interface,
 * so switching modes is a pure configuration change.
 */
@Configuration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentConfig {

    @Bean
    @Primary
    public PaymentGateway activePaymentGateway(PaymentProperties properties,
                                               MockPaymentGateway mockGateway,
                                               RazorpayGateway razorpayGateway) {
        if ("sandbox".equalsIgnoreCase(properties.getMode())
                || "live".equalsIgnoreCase(properties.getMode())) {
            // Fail fast: a gateway mode without credentials would boot fine
            // and then fail obscurely on the first payment. Never silently
            // run broken auth.
            if (isBlank(properties.getKeyId()) || isBlank(properties.getKeySecret())) {
                throw new IllegalStateException(
                        "app.payment.mode=" + properties.getMode()
                                + " requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET "
                                + "environment variables. Keep PAYMENT_MODE=mock for development.");
            }
            if (isBlank(properties.getWebhookSecret())) {
                throw new IllegalStateException(
                        "app.payment.mode=" + properties.getMode()
                                + " requires RAZORPAY_WEBHOOK_SECRET (needed for webhook "
                                + "signature verification). Set it before switching modes.");
            }
            return razorpayGateway;
        }
        return mockGateway;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
