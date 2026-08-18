package com.distributrack.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

/**
 * Initiates an online payment against a DELIVERED order. The backend
 * creates the gateway order and returns everything the frontend needs to
 * run the checkout (Razorpay key + order id, or the mock payment id in
 * dev mode). No payment is recorded at this stage — recording happens
 * only in {@code verifyGatewayPayment} after server-side verification.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentInitiationRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;
}
