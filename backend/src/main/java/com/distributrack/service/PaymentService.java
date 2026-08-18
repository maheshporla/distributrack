package com.distributrack.service;

import com.distributrack.dto.request.PaymentInitiationRequest;
import com.distributrack.dto.request.PaymentRequest;
import com.distributrack.dto.request.VerifyPaymentRequest;
import com.distributrack.dto.response.PaymentInitiationResponse;
import com.distributrack.dto.response.PaymentResponse;
import com.distributrack.dto.response.PaymentSummaryResponse;
import com.distributrack.dto.response.UpiDetailsResponse;

import java.util.List;

public interface PaymentService {

    // ---------------------------------------------------------
    // Manual payments (staff-recorded: cash / cheque / transfer)
    // ---------------------------------------------------------

    PaymentResponse createPayment(PaymentRequest request);

    // ---------------------------------------------------------
    // Online payments (gateway)
    // ---------------------------------------------------------

    /**
     * Creates a payment order at the gateway (Razorpay or mock) for a
     * DELIVERED order. Records nothing — recording happens only after
     * {@link #verifyGatewayPayment} validates the outcome server-side.
     */
    PaymentInitiationResponse initiateGatewayPayment(PaymentInitiationRequest request);

    /**
     * Verifies a completed checkout server-side (signature + gateway
     * capture + amount + ownership) and records the payment. Idempotent
     * per gateway payment id.
     */
    PaymentResponse verifyGatewayPayment(VerifyPaymentRequest request);

    /**
     * Processes a gateway webhook (payment.captured). Signature-verified
     * and idempotent — a repeated webhook never creates a duplicate
     * payment. Returns null for events that are not captured-payments or
     * that cannot be matched to an order.
     */
    PaymentResponse handleWebhook(String rawBody, String signature);

    // ---------------------------------------------------------
    // Reconciliation
    // ---------------------------------------------------------

    /** TOTAL / PAID / OUTSTANDING + invoice status for one order. */
    PaymentSummaryResponse getPaymentSummary(Long orderId);

    // ---------------------------------------------------------
    // Queries / status / lifecycle
    // ---------------------------------------------------------

    List<PaymentResponse> getAllPayments();

    PaymentResponse getPaymentById(Long id);

    PaymentResponse updatePaymentStatus(Long id, String status);

    void deletePayment(Long id);

    PaymentResponse getPaymentByTransactionId(String transactionId);

    List<PaymentResponse> getPaymentsByStatus(String status);

    List<PaymentResponse> getPaymentsByMethod(String paymentMethod);

    // ---------------------------------------------------------
    // UPI direct payment
    // ---------------------------------------------------------

    /** Returns the distributor's UPI details for a specific order. */
    UpiDetailsResponse getUpiDetails(Long orderId);

    /**
     * Creates a PENDING payment record for a UPI payment initiated by
     * the shopkeeper. NOT auto-verified — admin must approve.
     */
    PaymentResponse initiateUpiPayment(PaymentInitiationRequest request);
}
