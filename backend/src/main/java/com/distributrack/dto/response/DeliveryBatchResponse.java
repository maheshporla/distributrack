package com.distributrack.dto.response;

import com.distributrack.enums.DeliveryBatchStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBatchResponse {

    private Long id;
    private String batchNumber;
    private String areaName;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal radiusKm;
    private Long deliveryBoyId;
    private String deliveryBoyName;
    private String deliveryBoyPhone;
    private String deliveryBoyVehicleType;
    private String deliveryBoyVehicleNumber;
    private Long warehouseId;
    private String warehouseName;
    private DeliveryBatchStatus status;
    private LocalDateTime assignedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    // Summary fields — calculated from linked deliveries
    private int totalOrders;
    private int totalShops;
    private int totalProducts;
    private int deliveredProducts;
    private int failedProducts;
    private int remainingProducts;
    private BigDecimal totalBill;
    private BigDecimal deliveredAmount;
    private BigDecimal failedAmount;

    // Shop-wise breakdown
    private List<DeliveryBatchShopSummary> shopSummaries;
}
