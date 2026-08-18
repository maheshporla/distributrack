package com.distributrack.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryReportResponse {

    private Long totalProducts;

    private Long totalInventoryQuantity;

    private Long lowStockProducts;

    private Long outOfStockProducts;

    /** Per-record rows for the report table. */
    private List<InventoryReportRow> rows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class InventoryReportRow {
        private Long inventoryId;
        private String productName;
        private String sku;
        private String warehouseLocation;
        private Integer quantity;
        private Integer minimumStock;
        private String status;
    }
}