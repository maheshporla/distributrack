package com.distributrack.entity;

import com.distributrack.enums.PaymentChannel;
import com.distributrack.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_order_id", columnList = "order_id"),
        @Index(name = "idx_payments_razorpay_order", columnList = "razorpay_order_id"),
        @Index(name = "idx_payments_razorpay_payment", columnList = "razorpay_payment_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * An order can have several payments (partial payments / instalments).
     * Reconciliation (TOTAL / PAID / OUTSTANDING) sums the SUCCESS
     * payments per order — see PaymentServiceImpl / InvoiceServiceImpl.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 32)
    private String paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_channel", length = 16)
    private PaymentChannel paymentChannel;

    @Column(nullable = false, unique = true, length = 64)
    private String transactionId;

    /**
     * Razorpay (or mock) order id created at initiation — links webhook
     * events back to this application's order.
     */
    @Column(name = "razorpay_order_id", length = 64)
    private String razorpayOrderId;

    /** Razorpay (or mock) payment id from the verified checkout/webhook. */
    @Column(name = "razorpay_payment_id", length = 64)
    private String razorpayPaymentId;

    /** Checkout signature verified server-side before recording. */
    @Column(name = "razorpay_signature", length = 255)
    private String razorpaySignature;

    /** Free-form note (e.g. "partial payment", webhook event id). */
    @Column(length = 255)
    private String notes;

    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate;

    @PrePersist
    public void prePersist() {

        paymentDate = LocalDateTime.now();

        if (paymentStatus == null) {
            paymentStatus = PaymentStatus.PENDING;
        }
    }
}
