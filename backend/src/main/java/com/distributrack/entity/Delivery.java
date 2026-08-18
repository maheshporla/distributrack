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

    @ManyToOne
    @JoinColumn(name = "delivery_boy_id", nullable = false)
    private User deliveryBoy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private DeliveryStatus deliveryStatus;

    @Column(nullable = false)
    private String deliveryAddress;

    @Column
    private String vehicleNumber;

    // Live GPS tracking (nullable until the delivery boy starts tracking)
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;

    @Column
    private LocalDateTime assignedAt;

    @Column
    private LocalDateTime deliveredAt;

    @PrePersist
    public void prePersist() {
        assignedAt = LocalDateTime.now();

        if (deliveryStatus == null) {
            deliveryStatus = DeliveryStatus.ASSIGNED;
        }
    }
}