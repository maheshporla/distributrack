package com.distributrack.dto.response;

import com.distributrack.payment.PaymentGatewayMode;
import lombok.*;

import java.math.BigDecimal;

/**
 * Result of initiating a gateway payment.
 *
 * In GATEWAY (Razorpay sandbox/live) mode the frontend opens the
 * Razorpay checkout with {@code keyId} + {@code gatewayOrderId}; the
 * checkout's success callback then posts razorpay_order_id /
 * razorpay_payment_id / razorpay_signature to POST /api/payments/verify.
 *
 * In MOCK mode (default dev configuration) there is no Razorpay checkout:
 * the frontend renders a simulated payment dialog and posts the returned
 * {@code mockPaymentId} + {@code mockSignature} to the same verify
 * endpoint, which validates the signature exactly like the real flow.
 * The signature is issued by the backend itself, so the verify step
 * still proves the "never trust the frontend" guarantee.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentInitiationResponse {

    private Long orderId;

    private String orderNumber;

    private BigDecimal amount;

    private String currency;

    /** Razorpay order id (GATEWAY mode) or mock order id (MOCK mode). */
    private String gatewayOrderId;

    private PaymentGatewayMode mode;

    /** Razorpay key id for the checkout — null in MOCK mode. */
    private String keyId;

    /** Mock-only: simulated gateway payment id to echo back to /verify. */
    private String mockPaymentId;

    /** Mock-only: backend-issued signature the verify endpoint validates. */
    private String mockSignature;
}
