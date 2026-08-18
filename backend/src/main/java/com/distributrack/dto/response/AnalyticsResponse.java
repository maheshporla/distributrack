package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsResponse {

    // Revenue
    private BigDecimal totalRevenue;

    // Orders
    private Long totalOrders;

    private Long pendingOrders;

    private Long approvedOrders;

    private Long deliveredOrders;

    private Long cancelledOrders;

    private Long completedOrders;

    // Products
    private Long totalProducts;

    // Inventory
    private Long totalInventory;

    private Long lowStockProducts;

    private Long outOfStockProducts;

    // Warehouses / deliveries
    private Long totalWarehouses;

    private Long activeDeliveries;

    // Payments (revenue rules: only DELIVERED/COMPLETED orders count)
    private BigDecimal paidAmount;

    private BigDecimal outstandingAmount;

    private BigDecimal failedPaymentAmount;

    private BigDecimal refundedPaymentAmount;

    // Users
    private Long totalUsers;
}