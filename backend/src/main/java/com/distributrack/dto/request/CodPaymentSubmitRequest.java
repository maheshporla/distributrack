package com.distributrack.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

/**
 * Submitted by the shopkeeper when selecting Cash on Delivery as the payment method.
 * Creates a PENDING_VERIFICATION payment record — the delivery boy will collect
 * the cash during delivery and confirm collection.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodPaymentSubmitRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    /** Optional note from the shopkeeper. */
    private String notes;
}
