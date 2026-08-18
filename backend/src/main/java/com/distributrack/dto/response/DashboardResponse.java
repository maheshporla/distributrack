package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardResponse {

    // Product Statistics
    private Long totalProducts;

    // Inventory Statistics
    private Long totalInventoryItems;

    private Long lowStockProducts;

    // Order Statistics
    private Long totalOrders;

    private Long pendingOrders;

    private Long approvedOrders;

    private Long deliveredOrders;

    private Long cancelledOrders;

    private Long completedOrders;

    // Warehouses / deliveries
    private Long totalWarehouses;

    private Long activeDeliveries;

    // User Statistics
    private Long totalUsers;

    // Revenue (only DELIVERED/COMPLETED orders count, once each)
    private BigDecimal totalRevenue;

    private BigDecimal paidAmount;

    private BigDecimal outstandingAmount;
}