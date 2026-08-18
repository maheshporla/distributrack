package com.distributrack.repository;

import com.distributrack.entity.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    List<Warehouse> findByActive(Boolean active);

    List<Warehouse> findByCityIgnoreCase(String city);

    List<Warehouse> findByStateIgnoreCase(String state);

    List<Warehouse> findByWarehouseNameContainingIgnoreCase(
            String warehouseName
    );
}