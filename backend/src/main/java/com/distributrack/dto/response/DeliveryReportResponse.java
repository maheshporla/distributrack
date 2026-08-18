package com.distributrack.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Delivery report — status counts plus per-delivery rows in the
 * requested date range (null range = all time).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryReportResponse {

    private Long totalDeliveries;

    private Long assignedCount;

    private Long outForDeliveryCount;

    private Long deliveredCount;

    private Long failedCount;

    private Long cancelledCount;

    private List<DeliveryReportRow> rows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeliveryReportRow {
        private Long deliveryId;
        private String orderNumber;
        private String deliveryBoyName;
        private String deliveryStatus;
        private String deliveryAddress;
        private LocalDateTime assignedAt;
        private LocalDateTime deliveredAt;
    }
}
