package com.distributrack.entity;

import com.distributrack.enums.StockMovementType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Immutable history of every stock change. Written inside the same
 * transaction as the inventory update, so the balance can never diverge
 * from its history.
 */
@Entity
@Table(name = "stock_movements", indexes = {
        @Index(name = "idx_stock_movement_inventory", columnList = "inventory_id"),
        @Index(name = "idx_stock_movement_product", columnList = "product_id"),
        @Index(name = "idx_stock_movement_created", columnList = "created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory inventory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "warehouse_location", length = 120)
    private String warehouseLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private StockMovementType type;

    /** Signed change applied to the balance. */
    @Column(name = "quantity_change", nullable = false)
    private Integer quantityChange;

    /** Balance after this movement was applied. */
    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(length = 255)
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    /** Optional reference to the order that triggered this movement. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
