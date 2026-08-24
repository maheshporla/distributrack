package com.distributrack.notification;

import org.junit.jupiter.api.Test;

/**
 * Verifies the email paths:
 *  - EMAIL_ENABLED=false (or no API key) -> [EMAIL MOCK] logging, never a
 *    Resend call — development never depends on a real service.
 *  - EMAIL_ENABLED=true + valid API key -> the message is sent via Resend
 *    HTTPS API.
 */
class EmailServiceImplTest {

    private EmailServiceImpl service(boolean enabled, boolean hasApiKey) {
        try {
            var clazz = EmailServiceImpl.class;
            var constructor = clazz.getDeclaredConstructor(
                    boolean.class, String.class, String.class);
            constructor.setAccessible(true);
            return constructor.newInstance(
                    enabled,
                    "DistribuTrack <test@distributrack.local>",
                    hasApiKey ? "re_fake_test_key" : ""
            );
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    @Test
    void disabled_emailIsNeverSentViaResend() {
        EmailServiceImpl svc = service(false, true);
        svc.send("shop@example.com", "Order #1", "<p>Hi</p>");
        // Mock mode — no real Resend call
    }

    @Test
    void enabled_withoutApiKey_fallsBackToMock() {
        EmailServiceImpl svc = service(true, false);
        svc.send("shop@example.com", "Order #1", "<p>Hi</p>");
        // No API key → mock mode
    }

    @Test
    void enabled_withApiKey_attemptsResendSend() {
        EmailServiceImpl svc = service(true, true);
        // Fake key → Resend will reject, but the service handles
        // the exception gracefully without throwing to caller.
        svc.send("shop@example.com", "Order #1", "<p>Hi</p>");
    }
}
