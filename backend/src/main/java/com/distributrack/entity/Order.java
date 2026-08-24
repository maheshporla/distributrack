package com.distributrack.entity;

import com.distributrack.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String orderNumber;

    @ManyToOne
    @JoinColumn(name = "shopkeeper_id", nullable = false)
    private User shopkeeper;

    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<OrderItem> orderItems;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private OrderStatus status;

    /**
     * True once stock has been restored for this order (on cancellation/
     * rejection). Prevents double-restoration if the status is updated
     * multiple times.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean stockRestored = false;

    @Column(nullable = false)
    private LocalDateTime orderDate;

    @PrePersist
    public void prePersist() {
        orderDate = LocalDateTime.now();
    }

    /**
     * Moves the order to {@code next} if the transition is legal for the
     * current state, throwing otherwise. Centralizes lifecycle validation
     * so manual admin updates and delivery-driven syncs agree.
     */
    public void transitionTo(OrderStatus next) {
        if (status == null) {
            status = next;
            return;
        }
        if (!status.canTransitionTo(next)) {
            throw new IllegalStateException(
                    "Invalid order status transition: " + status + " -> " + next
            );
        }
        this.status = next;
    }
}