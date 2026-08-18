package com.distributrack.dto.response;

import com.distributrack.enums.NotificationType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

    private Long id;

    private NotificationType type;

    private String title;

    private String message;

    /** Related order id, when the notification concerns a specific order. */
    private Long relatedOrderId;

    private Boolean read;

    private LocalDateTime createdAt;
}
