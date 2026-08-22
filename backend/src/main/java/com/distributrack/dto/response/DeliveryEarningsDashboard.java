package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Aggregated earnings dashboard.
 * Used for both delivery boy and admin views.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryEarningsDashboard {

    // --- Delivery boy info (null for admin all-boys view) ---
    private Long deliveryBoyId;
    private String deliveryBoyName;

    // --- Today ---
    private int todayDeliveries;
    private BigDecimal todayDistanceKm;
    private BigDecimal todayOrderValue;
    private BigDecimal todayEarnings;

    // --- Current month ---
    private int monthDeliveries;
    private BigDecimal monthDistanceKm;
    private BigDecimal monthOrderValue;
    private BigDecimal monthEarnings;

    // --- All time ---
    private int allTimeDeliveries;
    private BigDecimal allTimeDistanceKm;
    private BigDecimal allTimeOrderValue;
    private BigDecimal allTimeEarnings;

    // --- Today's order-wise breakdown ---
    private List<DeliveryEarningResponse> todaysEarnings;

    // --- Earnings history grouped by date ---
    private List<DailyEarningGroup> history;

    // --- Admin: all delivery boys summary ---
    private List<DeliveryBoyEarningsSummary> allDeliveryBoys;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyEarningGroup {
        private LocalDate date;
        private int deliveries;
        private BigDecimal distanceKm;
        private BigDecimal orderValue;
        private BigDecimal earnings;
        private List<DeliveryEarningResponse> earningsList;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DeliveryBoyEarningsSummary {
        private Long deliveryBoyId;
        private String deliveryBoyName;
        private String deliveryBoyPhone;
        private BigDecimal todayEarnings;
        private BigDecimal monthEarnings;
        private int totalDeliveries;
        private BigDecimal totalDistanceKm;
    }
}
