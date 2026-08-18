package com.distributrack.config;

import com.distributrack.payment.MockPaymentGateway;
import com.distributrack.payment.PaymentGateway;
import com.distributrack.payment.PaymentProperties;
import com.distributrack.payment.RazorpayGateway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.web.client.RestTemplateBuilder;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Mode selection and fail-fast credential validation for the payment
 * gateway. Production safety: switching to sandbox/live without keys must
 * fail at startup with a clear message — never boot with broken auth.
 */
class PaymentConfigTest {

    private final PaymentConfig config = new PaymentConfig();

    private RazorpayGateway razorpay(PaymentProperties props) {
        return new RazorpayGateway(props, new RestTemplateBuilder());
    }

    @Test
    void defaultMode_selectsMockGateway() {
        PaymentProperties props = new PaymentProperties(); // mode = "mock"
        PaymentGateway active = config.activePaymentGateway(
                props, new MockPaymentGateway(props), razorpay(props));

        assertInstanceOf(MockPaymentGateway.class, active);
    }

    @Test
    void sandboxWithoutKeys_failsFast() {
        PaymentProperties props = new PaymentProperties();
        props.setMode("sandbox");
        // keyId / keySecret intentionally left blank

        assertThrows(IllegalStateException.class,
                () -> config.activePaymentGateway(
                        props, new MockPaymentGateway(props), razorpay(props)),
                "sandbox mode without RAZORPAY_KEY_ID/KEY_SECRET must fail fast");
    }

    @Test
    void sandboxWithoutWebhookSecret_failsFast() {
        PaymentProperties props = new PaymentProperties();
        props.setMode("sandbox");
        props.setKeyId("rzp_test_xxx");
        props.setKeySecret("secret");
        // webhookSecret intentionally left blank

        assertThrows(IllegalStateException.class,
                () -> config.activePaymentGateway(
                        props, new MockPaymentGateway(props), razorpay(props)),
                "sandbox mode without RAZORPAY_WEBHOOK_SECRET must fail fast");
    }

    @Test
    void sandboxWithAllCredentials_selectsRazorpayGateway() {
        PaymentProperties props = new PaymentProperties();
        props.setMode("sandbox");
        props.setKeyId("rzp_test_xxx");
        props.setKeySecret("secret");
        props.setWebhookSecret("whsec");

        PaymentGateway active = config.activePaymentGateway(
                props, new MockPaymentGateway(props), razorpay(props));

        assertInstanceOf(RazorpayGateway.class, active);
    }
}
