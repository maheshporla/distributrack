package com.distributrack.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * Listens for {@link NotificationDeliveryEvent}s and fans each one out
 * to the out-of-band channels: email and SMS. Runs on the dedicated
 * notification executor so external providers never block business
 * requests. Each channel is best-effort and failure-isolated.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDeliveryListener {

    private final EmailService emailService;
    private final SmsService smsService;

    @Async("notificationExecutor")
    @EventListener
    public void onNotificationCreated(NotificationDeliveryEvent event) {

        String plainMessage = event.getMessage();

        if (event.getRecipientEmail() != null && !event.getRecipientEmail().isBlank()) {
            emailService.send(
                    event.getRecipientEmail(),
                    event.getTitle(),
                    "<div style=\"font-family:sans-serif\"><h3>"
                            + escapeHtml(event.getTitle())
                            + "</h3><p>"
                            + escapeHtml(plainMessage)
                            + "</p></div>"
            );
        }

        if (event.getRecipientPhone() != null && !event.getRecipientPhone().isBlank()) {
            smsService.send(event.getRecipientPhone(), event.getTitle() + ": " + plainMessage);
        }
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
