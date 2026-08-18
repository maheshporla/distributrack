package com.distributrack.repository;

import com.distributrack.entity.Inventory;
import com.distributrack.entity.StockMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    List<StockMovement> findByInventoryOrderByCreatedAtDesc(Inventory inventory);
}
