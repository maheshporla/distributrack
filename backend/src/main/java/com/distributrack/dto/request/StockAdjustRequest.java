package com.distributrack.dto.request;

import com.distributrack.enums.StockMovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAdjustRequest {

    /**
     * For IN/OUT: the positive quantity being added/removed.
     * For ADJUSTMENT: the new absolute balance.
     */
    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private Integer quantity;

    @NotNull(message = "Movement type is required")
    private StockMovementType type;

    private String note;
}
