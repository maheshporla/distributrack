package com.distributrack.controller;

import com.distributrack.dto.request.WarehouseRequest;
import com.distributrack.dto.response.WarehouseResponse;
import com.distributrack.service.WarehouseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseService warehouseService;

    // Create Warehouse
    @PostMapping
    public WarehouseResponse createWarehouse(
            @Valid @RequestBody WarehouseRequest request) {

        return warehouseService.createWarehouse(request);
    }

    // Get All Warehouses
    @GetMapping
    public List<WarehouseResponse> getAllWarehouses() {

        return warehouseService.getAllWarehouses();
    }

    // Get Warehouse By ID
    @GetMapping("/{id}")
    public WarehouseResponse getWarehouseById(
            @PathVariable Long id) {

        return warehouseService.getWarehouseById(id);
    }

    // Update Warehouse
    @PutMapping("/{id}")
    public WarehouseResponse updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody WarehouseRequest request) {

        return warehouseService.updateWarehouse(id, request);
    }

    // Delete Warehouse
    @DeleteMapping("/{id}")
    public String deleteWarehouse(
            @PathVariable Long id) {

        warehouseService.deleteWarehouse(id);

        return "Warehouse deleted successfully";
    }

    // Get Active Warehouses
    @GetMapping("/active")
    public List<WarehouseResponse> getActiveWarehouses() {

        return warehouseService.getActiveWarehouses();
    }

    // Search Warehouses
    @GetMapping("/search")
    public List<WarehouseResponse> searchWarehouses(
            @RequestParam String keyword) {

        return warehouseService.searchWarehouses(keyword);
    }

    // Get Warehouses By City
    @GetMapping("/city/{city}")
    public List<WarehouseResponse> getWarehousesByCity(
            @PathVariable String city) {

        return warehouseService.getWarehousesByCity(city);
    }

    // Get Warehouses By State
    @GetMapping("/state/{state}")
    public List<WarehouseResponse> getWarehousesByState(
            @PathVariable String state) {

        return warehouseService.getWarehousesByState(state);
    }
}