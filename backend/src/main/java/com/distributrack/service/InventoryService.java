package com.distributrack.service;

import com.distributrack.dto.request.InventoryRequest;
import com.distributrack.dto.request.StockAdjustRequest;
import com.distributrack.dto.response.InventoryResponse;
import com.distributrack.dto.response.StockMovementResponse;

import java.util.List;

public interface InventoryService {

    // Create Inventory
    InventoryResponse createInventory(InventoryRequest request);

    // Get All Inventory
    List<InventoryResponse> getAllInventory();

    // Get Inventory By Id
    InventoryResponse getInventoryById(Long id);

    // Update Inventory
    InventoryResponse updateInventory(Long id, InventoryRequest request);

    // Delete Inventory
    void deleteInventory(Long id);

    // Get Inventory By Product
    InventoryResponse getInventoryByProduct(Long productId);

    // Get Low Stock Products
    List<InventoryResponse> getLowStockProducts();

    // Get Inventory By Warehouse
    List<InventoryResponse> getInventoryByWarehouse(String warehouseLocation);

    /**
     * Apply a stock movement (IN / OUT / ADJUSTMENT). The balance can
     * never go below zero, and every change is recorded to the movement
     * history inside the same transaction.
     */
    StockMovementResponse adjustStock(Long id, StockAdjustRequest request);

    /** Full movement history for one inventory record, newest first. */
    List<StockMovementResponse> getStockMovements(Long inventoryId);
}
