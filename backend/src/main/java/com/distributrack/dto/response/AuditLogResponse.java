package com.distributrack.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {

    private Long id;

    private Long actorId;

    private String actorName;

    private String actorRole;

    private String action;

    private String entityType;

    private Long entityId;

    private String details;

    private LocalDateTime createdAt;
}
