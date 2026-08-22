package com.distributrack.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateDeliveryBatchRequest {

    @NotBlank(message = "Area name is required")
    @Size(max = 200, message = "Area name must not exceed 200 characters")
    private String areaName;

    @NotNull(message = "Center latitude is required")
    @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
    private BigDecimal centerLatitude;

    @NotNull(message = "Center longitude is required")
    @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
    private BigDecimal centerLongitude;

    @NotNull(message = "Radius is required")
    @DecimalMin(value = "0.1", message = "Radius must be at least 0.1 km")
    @DecimalMax(value = "100", message = "Radius must not exceed 100 km")
    private BigDecimal radiusKm;

    @NotNull(message = "Delivery boy ID is required")
    private Long deliveryBoyId;

    private Long warehouseId;
}
