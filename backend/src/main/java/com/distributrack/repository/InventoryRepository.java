package com.distributrack.repository;

import com.distributrack.entity.Inventory;
import com.distributrack.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;

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

    /**
     * Pessimistic write lock — prevents concurrent reads during stock
     * deduction to avoid overselling in race conditions.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    Optional<Inventory> findByIdWithLock(Long id);
}