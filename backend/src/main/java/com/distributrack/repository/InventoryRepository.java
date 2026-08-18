package com.distributrack.repository;

import com.distributrack.entity.Inventory;
import com.distributrack.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    // Find inventory by product
    Optional<Inventory> findByProduct(Product product);

    // Check if inventory exists for a product
    boolean existsByProduct(Product product);

    // Find all active inventory
    List<Inventory> findByActiveTrue();

    // Find inventory by warehouse location
    List<Inventory> findByWarehouseLocationIgnoreCase(String warehouseLocation);

    // Find products with stock below minimum
    List<Inventory> findByQuantityLessThan(Integer quantity);
}