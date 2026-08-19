package com.distributrack.repository;

import com.distributrack.entity.Order;
import com.distributrack.entity.Payment;
import com.distributrack.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    /** All payments for an order, oldest first (reconciliation order). */
    List<Payment> findByOrderOrderByIdAsc(Order order);

    Optional<Payment> findByTransactionId(String transactionId);

    List<Payment> findByPaymentStatus(PaymentStatus paymentStatus);

    List<Payment> findByPaymentMethod(String paymentMethod);

    /** Webhook idempotency: a gateway payment id is processed once. */
    Optional<Payment> findByRazorpayPaymentId(String razorpayPaymentId);

    /** Webhook routing: find the application order behind a gateway order. */
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);

    /** Duplicate UTR prevention: check if a UTR has already been submitted. */
    boolean existsByUtr(String utr);

    /** Find payments pending UPI verification, newest first. */
    List<Payment> findByPaymentStatusOrderByPaymentDateDesc(PaymentStatus paymentStatus);
}
