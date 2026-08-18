package com.distributrack.notification;

import com.distributrack.enums.NotificationType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Fired whenever an in-app notification is created. An async listener
 * fans it out to the out-of-band channels (email + SMS), so business
 * services only ever depend on the in-app NotificationService — they
 * never call the mail or SMS providers directly.
 */
@Getter
@RequiredArgsConstructor
public class NotificationDeliveryEvent {

    private final String recipientEmail;

    private final String recipientPhone;

    private final NotificationType type;

    private final String title;

    private final String message;
}
