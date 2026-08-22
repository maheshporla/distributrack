package com.distributrack.notification;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.notifications.email.enabled:false}")
    private boolean enabled;

    @Value("${app.notifications.email.from:DistribuTrack <no-reply@distributrack.local>}")
    private String from;

    @Value("${app.notifications.email.provider:smtp}")
    private String provider;

    @Value("${app.notifications.email.resend-api-key:}")
    private String resendApiKey;

    @Override
    @Async("notificationExecutor")
    public void send(String to, String subject, String htmlBody) {

        if (!enabled) {
            log.info("[EMAIL MOCK] to={} | subject={} | body={}",
                    to, subject, htmlBody.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim());
            return;
        }

        if ("resend".equalsIgnoreCase(provider)) {
            sendViaResend(to, subject, htmlBody);
        } else {
            sendViaSmtp(to, subject, htmlBody);
        }
    }

    private void sendViaResend(String to, String subject, String htmlBody) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            log.error("[EMAIL] provider=resend but RESEND_API_KEY is not configured — " +
                    "email to {} will NOT be delivered. Set the RESEND_API_KEY environment variable.", to);
            return;
        }

        // Trim to remove accidental newlines/whitespace that break the
        // HTTP Authorization header (OkHttp rejects 0x0a characters).
        String apiKey = resendApiKey.trim();

        try {
            Resend resend = new Resend(apiKey);
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build();

            log.info("[EMAIL] Sending via Resend: to={}, from={}, subject={}", to, from, subject);
            var response = resend.emails().send(params);

            if (response != null && response.getId() != null) {
                log.info("[EMAIL] Resend delivery accepted: messageId={}, to={}", response.getId(), to);
            } else {
                log.warn("[EMAIL] Resend returned null response for to={}", to);
            }
        } catch (Exception ex) {
            log.error("[EMAIL] Resend FAILED for to={}: {}", to, ex.getMessage(), ex);
        }
    }

    private void sendViaSmtp(String to, String subject, String htmlBody) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();

        if (mailSender == null) {
            log.warn("[EMAIL] enabled but no SMTP configured (set MAIL_HOST / "
                    + "MAIL_USERNAME / MAIL_PASSWORD) — falling back to mock logging");
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
