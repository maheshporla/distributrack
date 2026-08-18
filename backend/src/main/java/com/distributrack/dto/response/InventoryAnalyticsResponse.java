package com.distributrack.dto.response;

import lombok.*;

import java.util.List;

/**
 * Inventory analytics. Inventory is grouped by its free-text
 * warehouseLocation column (no warehouse FK in the inventory model yet).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryAnalyticsResponse {

    private Long totalProducts;

    private Long totalQuantity;

    private Long lowStockProducts;

    private Long outOfStockProducts;

    private List<WarehouseStock> byWarehouse;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WarehouseStock {
        private String warehouseLocation;
        private Long quantity;
    }
}
