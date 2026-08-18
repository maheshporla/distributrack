package com.distributrack.notification;

/**
 * Outbound email notifications. Implementations are asynchronous and
 * must never throw into the caller — a mail failure is logged, not
 * propagated.
 */
public interface EmailService {

    /**
     * Send an HTML email. In mock mode (no MAIL_HOST configured, or
     * EMAIL_ENABLED=false) the email is only logged.
     */
    void send(String to, String subject, String htmlBody);
}
