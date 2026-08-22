package com.distributrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBatchShopSummary {

    private Long shopkeeperId;
    private String shopName;
    private String shopkeeperName;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;

    private int orderCount;
    private int totalProducts;
    private int deliveredProducts;
    private int failedProducts;
    private int remainingProducts;
    private BigDecimal totalBill;
    private BigDecimal deliveredAmount;
    private BigDecimal failedAmount;

    private String status; // PENDING, PARTIAL, DELIVERED, FAILED

    private List<DeliveryBatchDeliverySummary> deliveries;
}
