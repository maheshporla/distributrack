package com.distributrack.service.impl;

import com.distributrack.dto.request.WarehouseRequest;
import com.distributrack.dto.response.WarehouseResponse;
import com.distributrack.entity.Warehouse;
import com.distributrack.repository.WarehouseRepository;
import com.distributrack.service.WarehouseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class WarehouseServiceImpl implements WarehouseService {

    private final WarehouseRepository warehouseRepository;

    // ---------------------------------------------------------
    // Create Warehouse
    // ---------------------------------------------------------
    @Override
    public WarehouseResponse createWarehouse(
            WarehouseRequest request) {

        Warehouse warehouse = Warehouse.builder()
                .warehouseName(request.getWarehouseName().trim())
                .address(request.getAddress().trim())
                .city(request.getCity().trim())
                .state(request.getState().trim())
                .pincode(request.getPincode().trim())
                .contactPerson(request.getContactPerson().trim())
                .phone(request.getPhone().trim())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .active(request.getActive())
                .build();

        Warehouse savedWarehouse =
                warehouseRepository.save(warehouse);

        return mapToResponse(savedWarehouse);
    }

    // ---------------------------------------------------------
    // Get All Warehouses
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getAllWarehouses() {

        return warehouseRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ---------------------------------------------------------
    // Get Warehouse By ID
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public WarehouseResponse getWarehouseById(Long id) {

        Warehouse warehouse =
                warehouseRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Warehouse not found with id: " + id
                                )
                        );

        return mapToResponse(warehouse);
    }

    // ---------------------------------------------------------
    // Update Warehouse
    // ---------------------------------------------------------
    @Override
    public WarehouseResponse updateWarehouse(
            Long id,
            WarehouseRequest request) {

        Warehouse warehouse =
                warehouseRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Warehouse not found with id: " + id
                                )
                        );

        warehouse.setWarehouseName(
                request.getWarehouseName().trim()
        );

        warehouse.setAddress(
                request.getAddress().trim()
        );

        warehouse.setCity(
                request.getCity().trim()
        );

        warehouse.setState(
                request.getState().trim()
        );

        warehouse.setPincode(
                request.getPincode().trim()
        );

        warehouse.setContactPerson(
                request.getContactPerson().trim()
        );

        warehouse.setPhone(
                request.getPhone().trim()
        );

        warehouse.setLatitude(
                request.getLatitude()
        );

        warehouse.setLongitude(
                request.getLongitude()
        );

        warehouse.setActive(
                request.getActive()
        );

        Warehouse updatedWarehouse =
                warehouseRepository.save(warehouse);

        return mapToResponse(updatedWarehouse);
    }

    // ---------------------------------------------------------
    // Delete Warehouse
    // ---------------------------------------------------------
    @Override
    public void deleteWarehouse(Long id) {

        Warehouse warehouse =
                warehouseRepository.findById(id)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Warehouse not found with id: " + id
                                )
                        );

        warehouseRepository.delete(warehouse);
    }

    // ---------------------------------------------------------
    // Get Active Warehouses
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getActiveWarehouses() {

        return warehouseRepository.findByActive(true)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ---------------------------------------------------------
    // Search Warehouses
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> searchWarehouses(
            String keyword) {

        return warehouseRepository
                .findByWarehouseNameContainingIgnoreCase(
                        keyword.trim()
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ---------------------------------------------------------
    // Get Warehouses By City
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getWarehousesByCity(
            String city) {

        return warehouseRepository
                .findByCityIgnoreCase(city.trim())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ---------------------------------------------------------
    // Get Warehouses By State
    // ---------------------------------------------------------
    @Override
    @Transactional(readOnly = true)
    public List<WarehouseResponse> getWarehousesByState(
            String state) {

        return warehouseRepository
                .findByStateIgnoreCase(state.trim())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // ---------------------------------------------------------
    // Entity → Response
    // ---------------------------------------------------------
    private WarehouseResponse mapToResponse(
            Warehouse warehouse) {

        return WarehouseResponse.builder()
                .id(warehouse.getId())
                .warehouseName(
                        warehouse.getWarehouseName()
                )
                .address(
                        warehouse.getAddress()
                )
                .city(
                        warehouse.getCity()
                )
                .state(
                        warehouse.getState()
                )
                .pincode(
                        warehouse.getPincode()
                )
                .contactPerson(
                        warehouse.getContactPerson()
                )
                .phone(
                        warehouse.getPhone()
                )
                .latitude(
                        warehouse.getLatitude()
                )
                .longitude(
                        warehouse.getLongitude()
                )
                .active(
                        warehouse.getActive()
                )
                .createdAt(
                        warehouse.getCreatedAt()
                )
                .updatedAt(
                        warehouse.getUpdatedAt()
                )
                .build();
    }
}