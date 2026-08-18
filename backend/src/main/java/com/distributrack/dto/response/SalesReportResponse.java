package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesReportResponse {

    private Long totalOrders;

    private BigDecimal totalRevenue;

    private Long completedOrders;

    private Long pendingOrders;

    /** Order rows in the requested date range (null range = all time). */
    private List<SalesReportRow> rows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SalesReportRow {
        private Long orderId;
        private String orderNumber;
        private LocalDateTime orderDate;
        private String shopkeeperName;
        private BigDecimal totalAmount;
        private String status;
    }
}