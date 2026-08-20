package com.distributrack.controller;

import com.distributrack.dto.request.CashPaymentSubmitRequest;
import com.distributrack.dto.request.CodPaymentSubmitRequest;
import com.distributrack.dto.request.PaymentInitiationRequest;
import com.distributrack.dto.request.PaymentRequest;
import com.distributrack.dto.request.UpiPaymentSubmitRequest;
import com.distributrack.dto.request.VerifyPaymentRequest;
import com.distributrack.dto.response.PaymentInitiationResponse;
import com.distributrack.dto.response.PaymentResponse;
import com.distributrack.dto.response.PaymentSummaryResponse;
import com.distributrack.dto.response.UpiDetailsResponse;
import com.distributrack.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Payment endpoints.
 *
 *  - POST /initiate  — create a gateway order (Razorpay or mock) for a
 *    DELIVERED order. SHOPKEEPER pays own orders; ownership is enforced
 *    in the service.
 *  - POST /verify    — server-side verification after checkout completes.
 *    SHOPKEEPER + business roles. Idempotent per gateway payment id.
 *  - POST /webhook   — PUBLIC, gateway-signed. Idempotent; a retried
 *    delivery can never create a duplicate payment.
 *  - GET /summary/{orderId} — TOTAL / PAID / OUTSTANDING reconciliation.
 *
 * Manual recording (POST /) and status updates remain admin-only
 * (SUPER_ADMIN / OWNER / MANAGER) per SecurityConfig.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // Create Payment (manual, staff-recorded — admin roles only)
    @PostMapping
    public PaymentResponse createPayment(
            @Valid @RequestBody PaymentRequest request) {

        return paymentService.createPayment(request);
    }

    // Initiate an online payment at the gateway
    @PostMapping("/initiate")
    public PaymentInitiationResponse initiateGatewayPayment(
            @Valid @RequestBody PaymentInitiationRequest request) {

        return paymentService.initiateGatewayPayment(request);
    }

    // Verify a completed checkout — never trust the frontend
    @PostMapping("/verify")
    public PaymentResponse verifyGatewayPayment(
            @Valid @RequestBody VerifyPaymentRequest request) {

        return paymentService.verifyGatewayPayment(request);
    }

    // Gateway webhook — public, signature-verified, idempotent
    @PostMapping("/webhook")
    public PaymentResponse handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        return paymentService.handleWebhook(rawBody, signature);
    }

    // Get All Payments
    @GetMapping
    public List<PaymentResponse> getAllPayments() {

        return paymentService.getAllPayments();
    }

    // Payment reconciliation for one order (TOTAL / PAID / OUTSTANDING)
    @GetMapping("/summary/{orderId}")
    public PaymentSummaryResponse getPaymentSummary(
            @PathVariable Long orderId) {

        return paymentService.getPaymentSummary(orderId);
    }

    // Get Payment By Id
    @GetMapping("/{id}")
    public PaymentResponse getPaymentById(
            @PathVariable Long id) {

        return paymentService.getPaymentById(id);
    }

    // Update Payment Status
    @PutMapping("/{id}/status")
    public PaymentResponse updatePaymentStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        return paymentService.updatePaymentStatus(id, status);
    }

    // Delete Payment
    @DeleteMapping("/{id}")
    public String deletePayment(
            @PathVariable Long id) {

        paymentService.deletePayment(id);

        return "Payment deleted successfully";
    }

    // Get Payment By Transaction Id
    @GetMapping("/transaction/{transactionId}")
    public PaymentResponse getPaymentByTransactionId(
            @PathVariable String transactionId) {

        return paymentService.getPaymentByTransactionId(transactionId);
    }

    // Get Payments By Status
    @GetMapping("/status/{status}")
    public List<PaymentResponse> getPaymentsByStatus(
            @PathVariable String status) {

        return paymentService.getPaymentsByStatus(status);
    }

    // Get Payments By Method
    @GetMapping("/method/{paymentMethod}")
    public List<PaymentResponse> getPaymentsByMethod(
            @PathVariable String paymentMethod) {

        return paymentService.getPaymentsByMethod(paymentMethod);
    }

    // =========================================================
    // UPI direct payment
    // =========================================================

    /**
     * Returns the distributor's UPI details (VPA, name, amount, URI)
     * for a specific order. The shopkeeper uses this to make a UPI
     * payment from any UPI app.
     */
    @GetMapping("/upi-details")
    public UpiDetailsResponse getUpiDetails(@RequestParam Long orderId) {

        return paymentService.getUpiDetails(orderId);
    }

    /**
     * Shopkeeper submits UPI payment. UTR is optional. Creates a
     * PENDING_VERIFICATION payment — admin must verify.
     */
    @PostMapping("/upi-initiate")
    public PaymentResponse submitUpiPayment(
            @Valid @RequestBody UpiPaymentSubmitRequest request) {

        return paymentService.submitUpiPayment(request);
    }

    /**
     * Shopkeeper submits cash payment claim. Creates a
     * PENDING_VERIFICATION payment — admin must verify.
     */
    @PostMapping("/cash-submit")
    public PaymentResponse submitCashPayment(
            @Valid @RequestBody CashPaymentSubmitRequest request) {

        return paymentService.submitCashPayment(request);
    }

    /**
     * Shopkeeper selects Cash on Delivery as payment method.
     * Creates a PENDING_VERIFICATION payment — delivery boy collects cash.
     */
    @PostMapping("/cod-submit")
    public PaymentResponse submitCodPayment(
            @Valid @RequestBody CodPaymentSubmitRequest request) {

        return paymentService.submitCodPayment(request);
    }

    // =========================================================
    // Admin verification
    // =========================================================

    /**
     * Admin approves a PENDING_VERIFICATION UPI payment.
     * Only SA/OWNER/MANAGER roles.
     */
    @PostMapping("/{paymentId}/approve")
    public PaymentResponse approvePayment(@PathVariable Long paymentId) {

        return paymentService.approvePayment(paymentId);
    }

    /**
     * Admin rejects a PENDING_VERIFICATION UPI payment with a reason.
     * Only SA/OWNER/MANAGER roles.
     */
    @PostMapping("/{paymentId}/reject")
    public PaymentResponse rejectPayment(
            @PathVariable Long paymentId,
            @RequestBody java.util.Map<String, String> body) {

        String reason = body.getOrDefault("reason", "");
        return paymentService.rejectPayment(paymentId, reason);
    }

    /**
     * Returns all PENDING_VERIFICATION payments (admin dashboard).
     */
    @GetMapping("/pending-verification")
    public List<PaymentResponse> getPendingVerificationPayments() {

        return paymentService.getPendingVerificationPayments();
    }
}
