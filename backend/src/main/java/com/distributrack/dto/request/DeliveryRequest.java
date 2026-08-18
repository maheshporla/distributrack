package com.distributrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRequest {

    @NotNull(message = "Order Id is required")
    private Long orderId;

    @NotNull(message = "Delivery Boy Id is required")
    private Long deliveryBoyId;

    @NotBlank(message = "Delivery Address is required")
    private String deliveryAddress;

    private String vehicleNumber;
}