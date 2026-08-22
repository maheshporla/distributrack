package com.distributrack.entity;

import com.distributrack.enums.DeliveryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "deliveries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * Nullable — null when the delivery is AVAILABLE (not yet accepted).
     * Set atomically when a worker accepts the delivery.
     */
    @ManyToOne
    @JoinColumn(name = "delivery_boy_id")
    private User deliveryBoy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeliveryStatus deliveryStatus;

    @Column(nullable = false)
    private String deliveryAddress;

    @Column
    private String vehicleNumber;

    // Delivery destination coordinates (copied from shopkeeper profile)
    @Column(name = "destination_latitude")
    private Double destinationLatitude;

    @Column(name = "destination_longitude")
    private Double destinationLongitude;

    // Live GPS tracking (nullable until the delivery boy starts tracking)
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    /**
     * Required when the delivery is marked as FAILED.
     * Stored for audit and shopkeeper visibility.
     */
    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    /** When the delivery was created / made available. */
    @Column(name = "available_at")
    private LocalDateTime availableAt;

    /** When the delivery was accepted by a worker (ASSIGNED). */
    @Column
    private LocalDateTime assignedAt;

    /** When the delivery was completed. */
    @Column
    private LocalDateTime deliveredAt;

    // --- Area batch assignment ---

    /**
     * Nullable — null when the delivery is not part of any area batch.
     * Set when admin assigns deliveries to a DeliveryBatch.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_batch_id")
    private DeliveryBatch deliveryBatch;

    // --- Cash on Delivery collection tracking ---

    @Column(name = "cod_collected")
    private Boolean codCollected = false;

    @Column(name = "cod_collected_at")
    private LocalDateTime codCollectedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cod_collected_by")
    private User codCollectedBy;

    @Column(name = "cod_amount", precision = 12, scale = 2)
    private java.math.BigDecimal codAmount;

    @Column(name = "cod_collection_notes", length = 500)
    private String codCollectionNotes;

    @PrePersist
    public void prePersist() {
        if (deliveryStatus == null) {
            deliveryStatus = DeliveryStatus.AVAILABLE;
        }
        if (availableAt == null) {
            availableAt = LocalDateTime.now();
        }
    }
}