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
public class EligibleOrdersResponse {

    private String areaName;
    private BigDecimal centerLatitude;
    private BigDecimal centerLongitude;
    private BigDecimal radiusKm;

    private int totalEligibleOrders;
    private int totalShops;
    private int totalProducts;
    private BigDecimal totalBill;

    private List<EligibleShopPreview> shops;
}
