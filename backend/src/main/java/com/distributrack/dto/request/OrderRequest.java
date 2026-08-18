package com.distributrack.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequest {

    @NotNull(message = "Shopkeeper Id is required")
    private Long shopkeeperId;

    @Valid
    @NotEmpty(message = "Order must contain at least one product")
    private List<OrderItemRequest> items;
}