package com.distributrack.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Submitted by the shopkeeper when paying cash to the distributor/authorized person.
 * Creates a PENDING_VERIFICATION payment — admin must verify.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashPaymentSubmitRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    /** Optional note from the shopkeeper (e.g., receipt reference). */
    private String notes;
}
