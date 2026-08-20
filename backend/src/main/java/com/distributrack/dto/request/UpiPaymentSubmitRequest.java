package com.distributrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Submitted by the shopkeeper after making a direct UPI payment.
 *
 * The backend calculates the amount from the order (never trusts the
 * frontend amount). The UTR is the shopkeeper's proof of payment —
 * admin verifies it against the bank statement before marking the
 * payment as SUCCESS.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpiPaymentSubmitRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    /**
     * Optional UTR (Unique Transaction Reference) from the shopkeeper's UPI payment.
     * Admin can use this for verification but it is no longer required to submit.
     */
    @Size(min = 6, max = 32, message = "UTR must be between 6 and 32 characters")
    private String utr;
}
