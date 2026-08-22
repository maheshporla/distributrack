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
public class EligibleShopPreview {

    private Long shopkeeperId;
    private String shopName;
    private String shopkeeperName;
    private String deliveryAddress;
    private Double latitude;
    private Double longitude;
    private double distanceFromCenterKm;

    private List<EligibleOrderPreview> orders;

    private int totalProducts;
    private BigDecimal totalBill;
}
