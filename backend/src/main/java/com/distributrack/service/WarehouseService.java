package com.distributrack.service;

import com.distributrack.dto.request.WarehouseRequest;
import com.distributrack.dto.response.WarehouseResponse;

import java.util.List;

public interface WarehouseService {

    WarehouseResponse createWarehouse(WarehouseRequest request);

    List<WarehouseResponse> getAllWarehouses();

    WarehouseResponse getWarehouseById(Long id);

    WarehouseResponse updateWarehouse(
            Long id,
            WarehouseRequest request
    );

    void deleteWarehouse(Long id);

    List<WarehouseResponse> getActiveWarehouses();

    List<WarehouseResponse> searchWarehouses(String keyword);

    List<WarehouseResponse> getWarehousesByCity(String city);

    List<WarehouseResponse> getWarehousesByState(String state);
}