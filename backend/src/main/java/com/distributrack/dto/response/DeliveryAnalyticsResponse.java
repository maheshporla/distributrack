package com.distributrack.dto.response;

import lombok.*;

import java.util.List;

/**
 * Delivery analytics — counts of every delivery status plus the number
 * of currently active (assigned / out-for-delivery) deliveries.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryAnalyticsResponse {

    private Long totalDeliveries;

    private Long assignedCount;

    private Long outForDeliveryCount;

    private Long deliveredCount;

    private Long failedCount;

    private Long cancelledCount;

    /** ASSIGNED + OUT_FOR_DELIVERY — deliveries still in progress. */
    private Long activeDeliveries;

    private List<SalesAnalyticsResponse.NameCount> deliveryStatusDistribution;
}
