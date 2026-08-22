package com.distributrack.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Stores a delivery boy's earning for a completed delivery.
 * Created only when delivery status becomes DELIVERED.
 * Preserves historical distance and amount — immune to future rate changes.
 */
@Entity
@Table(name = "delivery_earnings", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"delivery_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryEarning {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Each delivery can generate at most one earning. Enforced by unique constraint. */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_id", nullable = false)
    private Delivery delivery;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_boy_id", nullable = false)
    private User deliveryBoy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /** Distance in km (Haversine straight-line from warehouse/origin to destination). */
    @Column(name = "distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal distanceKm;

    /** Customer's order total amount. */
    @Column(name = "order_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal orderAmount;

    /** Calculated earning amount based on distance rates. */
    @Column(name = "earning_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal earningAmount;

    /** When the earning was generated (delivery completion time). */
    @Column(name = "earned_at", nullable = false)
    private LocalDateTime earnedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (earnedAt == null) earnedAt = now;
    }
}
