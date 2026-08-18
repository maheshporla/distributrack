package com.distributrack.entity;

import com.distributrack.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * In-app notification delivered to a specific recipient. Ownership is
 * enforced everywhere through the authenticated JWT principal — the API
 * never accepts a userId for notification operations.
 *
 * `dedupeKey` (nullable) prevents repeated checks from creating
 * unlimited duplicate notifications (e.g. the scheduled low-stock scan:
 * only one unread LOW_STOCK notification per inventory record exists).
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NotificationType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    /** Related order, when the notification concerns a specific order. */
    @Column(name = "related_order_id")
    private Long relatedOrderId;

    /** Dedupe key for repeatable checks (e.g. "LOW_STOCK:<inventoryId>"). */
    @Column(name = "dedupe_key", length = 100)
    private String dedupeKey;

    @Column(name = "is_read", nullable = false)
    private Boolean read;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        read = Boolean.FALSE;
        createdAt = LocalDateTime.now();
    }
}
