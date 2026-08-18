package com.distributrack.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

/**
 * Publishes {@link NotificationDeliveryEvent}s onto the Spring
 * ApplicationEvent bus. Publishing is fire-and-forget: a delivery
 * problem can never break the business flow that created the
 * notification.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final ApplicationEventPublisher applicationEventPublisher;

    public void publish(NotificationDeliveryEvent event) {
        try {
            applicationEventPublisher.publishEvent(event);
        } catch (Exception ex) {
            log.warn("Notification event publish failed (swallowed): {}", ex.getMessage());
        }
    }
}
