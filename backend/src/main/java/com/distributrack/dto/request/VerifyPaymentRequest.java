package com.distributrack.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Posted by the frontend after the checkout completes (Razorpay callback
 * in GATEWAY mode, simulated dialog in MOCK mode).
 *
 * The backend NEVER trusts these values: the signature is verified
 * against the gateway secret, the payment is fetched from the gateway
 * (GATEWAY mode) to confirm it was actually captured, the amount is
 * validated against the order's outstanding balance, and the order must
 * belong to the authenticated shopkeeper.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyPaymentRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    /** gatewayOrderId returned by initiateGatewayPayment. */
    @NotBlank(message = "Gateway order id is required")
    private String gatewayOrderId;

    /** razorpay_payment_id (GATEWAY) or mock payment id (MOCK). */
    @NotBlank(message = "Gateway payment id is required")
    private String gatewayPaymentId;

    /** razorpay_signature (GATEWAY) or backend-issued mock signature (MOCK). */
    @NotBlank(message = "Payment signature is required")
    private String signature;
}
