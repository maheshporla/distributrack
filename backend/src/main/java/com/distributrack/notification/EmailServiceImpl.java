package com.distributrack.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Email delivery via JavaMailSender (spring-boot-starter-mail).
 *
 * Configuration is environment-driven:
 *   EMAIL_ENABLED (default false), MAIL_HOST, MAIL_PORT, MAIL_USERNAME,
 *   MAIL_PASSWORD, EMAIL_FROM.
 *
 * When email is disabled or the SMTP host is not configured, messages
 * are logged as [EMAIL MOCK] — development never depends on a real SMTP
 * server, and production enables real delivery purely via environment
 * variables.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.notifications.email.enabled:false}")
    private boolean enabled;

    @Value("${app.notifications.email.from:DistribuTrack <no-reply@distributrack.local>}")
    private String from;

    @Override
    @Async("notificationExecutor")
    public void send(String to, String subject, String htmlBody) {

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();

        if (!enabled || mailSender == null) {
            if (enabled && mailSender == null) {
                // Enabled but no SMTP connection configured — surface this
                // loudly instead of silently pretending email was sent.
                log.warn("[EMAIL] enabled but no SMTP configured (set MAIL_HOST / "
                        + "MAIL_USERNAME / MAIL_PASSWORD) — falling back to mock logging");
            }
            log.info("[EMAIL MOCK] to={} | subject={} | body={}",
                    to, subject, htmlBody.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[EMAIL] sent to {}", to);
        } catch (Exception ex) {
            log.warn("[EMAIL] failed to send to {}: {}", to, ex.getMessage());
        }
    }
}
