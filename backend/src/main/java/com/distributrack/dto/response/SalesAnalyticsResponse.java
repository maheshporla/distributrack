package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Sales analytics — all values computed from real order/order-item data
 * (no mock statistics). Revenue follows the established rule: only
 * DELIVERED/COMPLETED orders count, each once.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalesAnalyticsResponse {

    /** Revenue + order counts bucketed by day (or month for long ranges). */
    private List<SalesTrendPoint> salesTrend;

    /** Best-selling products by quantity (and revenue). */
    private List<TopProduct> topProducts;

    /** Top customers by revenue (and order count). */
    private List<TopShop> topShops;

    private List<NameCount> orderStatusDistribution;

    private List<NameCount> paymentStatusDistribution;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SalesTrendPoint {
        private String label;
        private BigDecimal revenue;
        private Long orders;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopProduct {
        private Long productId;
        private String productName;
        private Long quantity;
        private BigDecimal revenue;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopShop {
        private Long shopkeeperId;
        private String shopkeeperName;
        private Long orders;
        private BigDecimal revenue;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NameCount {
        private String name;
        private Long count;
    }
}
