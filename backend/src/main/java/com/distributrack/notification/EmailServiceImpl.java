package com.distributrack.notification;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final boolean enabled;
    private final String from;
    private final Resend resend;

    public EmailServiceImpl(
            @Value("${app.notifications.email.enabled:false}") boolean enabled,
            @Value("${app.notifications.email.from:DistribuTrack <no-reply@distributrack.local>}") String from,
            @Value("${app.notifications.email.resend-api-key:}") String resendApiKey
    ) {
        this.enabled = enabled;
        this.from = from;
        this.resend = (enabled && resendApiKey != null && !resendApiKey.isBlank())
                ? new Resend(resendApiKey.trim())
                : null;
    }

    @Override
    @Async("notificationExecutor")
    public void send(String to, String subject, String htmlBody) {
        if (!enabled || resend == null) {
            log.info("[EMAIL MOCK] to={} | subject={} | body={}",
                    to, subject,
                    htmlBody.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim());
            return;
        }

        try {
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build();

            CreateEmailResponse response = resend.emails().send(params);
            log.info("[EMAIL] Resend delivery accepted: to={}, messageId={}", to, response.getId());
        } catch (ResendException ex) {
            String msg = ex.getMessage();
            if (msg != null && msg.contains("Invalid `to`")) {
                log.error("[EMAIL] Resend rejected recipient {}: invalid email address", to);
            } else if (msg != null && (msg.contains("testing emails") || msg.contains("sandbox"))) {
                log.error("[EMAIL] Resend REJECTED — [RESEND SANDBOX/DOMAIN RESTRICTION] "
                        + "You must verify a domain or use a testing recipient. to={}", to);
            } else {
                log.error("[EMAIL] Resend failed to {}: {}", to, msg);
            }
        } catch (Exception ex) {
            log.error("[EMAIL] Unexpected error sending to {}: {}", to, ex.getMessage());
        }
    }
}
