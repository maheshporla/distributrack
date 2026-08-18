package com.distributrack.controller;

import com.distributrack.dto.request.InventoryRequest;
import com.distributrack.dto.request.StockAdjustRequest;
import com.distributrack.dto.response.InventoryResponse;
import com.distributrack.dto.response.StockMovementResponse;
import com.distributrack.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    // Create Inventory
    @PostMapping
    public InventoryResponse createInventory(
            @Valid @RequestBody InventoryRequest request) {

        return inventoryService.createInventory(request);
    }

    // Get All Inventory
    @GetMapping
    public List<InventoryResponse> getAllInventory() {

        return inventoryService.getAllInventory();
    }

    // Get Inventory By Id
    @GetMapping("/{id}")
    public InventoryResponse getInventoryById(
            @PathVariable Long id) {

        return inventoryService.getInventoryById(id);
    }

    // Update Inventory
    @PutMapping("/{id}")
    public InventoryResponse updateInventory(
            @PathVariable Long id,
            @Valid @RequestBody InventoryRequest request) {

        return inventoryService.updateInventory(id, request);
    }

    // Apply a stock movement (IN / OUT / ADJUSTMENT)
    @PostMapping("/{id}/adjust")
    public StockMovementResponse adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody StockAdjustRequest request) {

        return inventoryService.adjustStock(id, request);
    }

    // Movement history for one inventory record
    @GetMapping("/{id}/movements")
    public List<StockMovementResponse> getStockMovements(
            @PathVariable Long id) {

        return inventoryService.getStockMovements(id);
    }

    // Delete Inventory
    @DeleteMapping("/{id}")
    public String deleteInventory(
            @PathVariable Long id) {

        inventoryService.deleteInventory(id);

        return "Inventory deleted successfully";
    }

    // Get Inventory By Product
    @GetMapping("/product/{productId}")
    public InventoryResponse getInventoryByProduct(
            @PathVariable Long productId) {

        return inventoryService.getInventoryByProduct(productId);
    }

    // Get Low Stock Products
    @GetMapping("/low-stock")
    public List<InventoryResponse> getLowStockProducts() {

        return inventoryService.getLowStockProducts();
    }

    // Get Inventory By Warehouse
    @GetMapping("/warehouse/{warehouseLocation}")
    public List<InventoryResponse> getInventoryByWarehouse(
            @PathVariable String warehouseLocation) {

        return inventoryService.getInventoryByWarehouse(warehouseLocation);
    }
}
