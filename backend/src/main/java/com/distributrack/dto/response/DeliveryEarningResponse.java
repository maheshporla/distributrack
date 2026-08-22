package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Per-delivery earning details.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryEarningResponse {

    private Long earningId;
    private Long deliveryId;
    private Long orderId;
    private String orderNumber;
    private String shopName;
    private String shopkeeperName;
    private BigDecimal distanceKm;
    private BigDecimal orderAmount;
    private BigDecimal earningAmount;
    private String deliveryStatus;
    private LocalDateTime earnedAt;
}
