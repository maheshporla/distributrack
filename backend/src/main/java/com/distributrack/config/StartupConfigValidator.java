package com.distributrack.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Validates notification and payment configuration at startup.
 *
 * When the operator explicitly enables a real provider (EMAIL_ENABLED=true,
 * SMS_PROVIDER=http, PAYMENT_MODE=sandbox) but the required credentials
 * are missing, we WARN loudly so the problem is discovered immediately —
 * not at the first runtime delivery attempt.
 *
 * This never blocks the application: the mock fallback always works.
 * The warnings surface the exact env vars that need to be set.
 */
@Slf4j
@Component
public class StartupConfigValidator {

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.notifications.email.provider:smtp}")
    private String emailProvider;

    @Value("${app.notifications.email.resend-api-key:}")
    private String resendApiKey;

    @Value("${app.notifications.email.from:}")
    private String from;

    @Value("${app.sms.provider:log}")
    private String smsProvider;

    @Value("${app.sms.api-url:}")
    private String smsApiUrl;

    @Value("${app.sms.api-key:}")
    private String smsApiKey;

    @Value("${app.payment.mode:mock}")
    private String paymentMode;

    @Value("${app.payment.key-id:}")
    private String razorpayKeyId;

    @Value("${app.payment.key-secret:}")
    private String razorpayKeySecret;

    @Value("${app.payment.webhook-secret:}")
    private String razorpayWebhookSecret;

    @Value("${app.distributor.upi-id:}")
    private String distributorUpiId;

    private final ConfigurableEnvironment environment;

    public StartupConfigValidator(ConfigurableEnvironment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateConfiguration() {
        boolean hasIssues = false;

        // =========================================================
        // Email validation
        // =========================================================
        if (emailEnabled) {
            if ("resend".equalsIgnoreCase(emailProvider)) {
                // Resend provider validation
                if (isBlank(resendApiKey)) {
                    log.error("╔══════════════════════════════════════════════════════════════╗");
                    log.error("║  EMAIL CONFIGURATION ERROR                                  ║");
                    log.error("║  EMAIL_PROVIDER=resend but RESEND_API_KEY is not set.      ║");
                    log.error("║  Emails will NOT be delivered.                              ║");
                    log.error("║  Set RESEND_API_KEY in your environment variables.         ║");
                    log.error("╚══════════════════════════════════════════════════════════════╝");
                    hasIssues = true;
                } else {
                    log.info("[CONFIG] Email: Resend provider enabled");
                    // Warn if sender is not from a verified Resend domain
                    if (from != null && from.contains("@")) {
                        String senderEmail = from.replaceAll(".*<(.+)>.+", "$1").trim();
                        if (senderEmail.endsWith("@resend.dev")) {
                            log.warn("[CONFIG] Email sender uses Resend sandbox domain ({}). " +
                                    "Deliveries may land in spam. For production, verify a " +
                                    "custom domain at resend.com", senderEmail);
                        } else if (!senderEmail.endsWith("@resend.dev")) {
                            log.info("[CONFIG] Email sender: {} — ensure this domain is verified " +
                                    "in your Resend dashboard", senderEmail);
                        }
                    }
                }
            } else {
                // SMTP provider validation (existing logic)
                if (isBlank(mailHost)) {
                    log.error("╔══════════════════════════════════════════════════════════════╗");
                    log.error("║  EMAIL CONFIGURATION ERROR                                  ║");
                    log.error("║  EMAIL_ENABLED=true but MAIL_HOST is not set.               ║");
                    log.error("║  Emails will be logged as [EMAIL MOCK] instead.            ║");
                    log.error("║  Set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD to fix.       ║");
                    log.error("╚══════════════════════════════════════════════════════════════╝");
                    hasIssues = true;
                } else if (isBlank(mailUsername) || isBlank(mailPassword)) {
                    log.warn("╔══════════════════════════════════════════════════════════════╗");
                    log.warn("║  EMAIL CREDENTIALS INCOMPLETE                               ║");
                    log.warn("║  MAIL_HOST is set but MAIL_USERNAME or MAIL_PASSWORD is     ║");
                    log.warn("║  empty. SMTP authentication may fail.                      ║");
                    log.warn("║  Set MAIL_USERNAME and MAIL_PASSWORD to fix.                ║");
                    log.warn("╚══════════════════════════════════════════════════════════════╝");
                    hasIssues = true;
                } else {
                    log.info("[CONFIG] Email: real SMTP enabled (host={})", mailHost);
                }
            }
        } else {
            log.info("[CONFIG] Email: mock mode (EMAIL_ENABLED=false)");
        }

        // =========================================================
        // SMS validation
        // =========================================================
        if ("http".equalsIgnoreCase(smsProvider)) {
            if (isBlank(smsApiUrl)) {
                log.error("╔══════════════════════════════════════════════════════════════╗");
                log.error("║  SMS CONFIGURATION ERROR                                    ║");
                log.error("║  SMS_PROVIDER=http but SMS_API_URL is not set.              ║");
                log.error("║  SMS messages will not be sent.                             ║");
                log.error("║  Set SMS_API_URL and SMS_API_KEY to fix.                   ║");
                log.error("╚══════════════════════════════════════════════════════════════╝");
                hasIssues = true;
            } else if (isBlank(smsApiKey)) {
                log.warn("╔══════════════════════════════════════════════════════════════╗");
                log.warn("║  SMS API KEY MISSING                                        ║");
                log.warn("║  SMS_API_URL is set but SMS_API_KEY is empty.               ║");
                log.warn("║  SMS requests may be rejected by the gateway.              ║");
                log.warn("╚══════════════════════════════════════════════════════════════╝");
                hasIssues = true;
            } else {
                log.info("[CONFIG] SMS: real HTTP provider enabled (url={})", maskUrl(smsApiUrl));
            }
        } else {
            log.info("[CONFIG] SMS: mock mode (SMS_PROVIDER={})", smsProvider);
        }

        // =========================================================
        // Payment validation
        // =========================================================
        if ("sandbox".equalsIgnoreCase(paymentMode) || "live".equalsIgnoreCase(paymentMode)) {
            if (isBlank(razorpayKeyId) || isBlank(razorpayKeySecret)) {
                log.error("╔══════════════════════════════════════════════════════════════╗");
                log.error("║  PAYMENT CONFIGURATION ERROR                                ║");
                log.error("║  PAYMENT_MODE={} but Razorpay credentials are missing.     ║", paymentMode.toUpperCase());
                log.error("║  Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.              ║");
                log.error("╚══════════════════════════════════════════════════════════════╝");
                hasIssues = true;
            } else if (isBlank(razorpayWebhookSecret)) {
                log.error("╔══════════════════════════════════════════════════════════════╗");
                log.error("║  PAYMENT WEBHOOK SECRET MISSING                             ║");
                log.error("║  PAYMENT_MODE={} but RAZORPAY_WEBHOOK_SECRET is empty.    ║", paymentMode.toUpperCase());
                log.error("║  Webhook signature verification will fail.                 ║");
                log.error("║  Set RAZORPAY_WEBHOOK_SECRET to fix.                       ║");
                log.error("╚══════════════════════════════════════════════════════════════╝");
                hasIssues = true;
            } else {
                log.info("[CONFIG] Payment: Razorpay {} mode (keyId={})", paymentMode, maskKey(razorpayKeyId));
            }
        } else {
            log.info("[CONFIG] Payment: mock mode (PAYMENT_MODE={})", paymentMode);
        }

        // =========================================================
        // UPI validation
        // =========================================================
        if (isBlank(distributorUpiId)) {
            log.warn("╔══════════════════════════════════════════════════════════════╗");
            log.warn("║  UPI CONFIGURATION MISSING                                  ║");
            log.warn("║  DISTRIBUTOR_UPI_ID is not set.                            ║");
            log.warn("║  Direct UPI payments will be unavailable.                  ║");
            log.warn("║  Set DISTRIBUTOR_UPI_ID or add to application-local.properties║");
            log.warn("╚══════════════════════════════════════════════════════════════╝");
        } else {
            log.info("[CONFIG] Distributor UPI configured: true");
        }

        if (!hasIssues) {
            log.info("[CONFIG] All provider configuration looks correct.");
        } else {
            log.warn("[CONFIG] ⚠ Some providers have configuration issues (see above).");
            log.warn("[CONFIG] The application will continue with mock fallbacks.");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Mask API URLs to avoid leaking full endpoint details in logs. */
    private static String maskUrl(String url) {
        if (url == null || url.length() <= 20) return "***";
        return url.substring(0, 15) + "..." + url.substring(url.length() - 5);
    }

    /** Mask Razorpay key ids: show prefix + last 4 chars. */
    private static String maskKey(String key) {
        if (key == null || key.length() <= 8) return "***";
        return key.substring(0, 7) + "..." + key.substring(key.length() - 4);
    }
}
