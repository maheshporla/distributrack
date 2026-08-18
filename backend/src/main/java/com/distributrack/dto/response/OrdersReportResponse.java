package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Orders report — full lifecycle counts plus per-order rows in the
 * requested date range (null range = all time).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrdersReportResponse {

    private Long totalOrders;

    private Long pendingOrders;

    private Long approvedOrders;

    private Long rejectedOrders;

    private Long assignedOrders;

    private Long outForDeliveryOrders;

    private Long deliveredOrders;

    private Long completedOrders;

    private Long cancelledOrders;

    /** Total of completed (DELIVERED/COMPLETED) orders in range. */
    private BigDecimal totalRevenue;

    private List<SalesReportResponse.SalesReportRow> rows;
}
