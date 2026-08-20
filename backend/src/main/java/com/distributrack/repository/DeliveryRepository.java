package com.distributrack.repository;

import com.distributrack.entity.Delivery;
import com.distributrack.entity.Order;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;

import java.util.List;
import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    Optional<Delivery> findByOrder(Order order);

    List<Delivery> findByDeliveryBoy(User deliveryBoy);

    List<Delivery> findByDeliveryStatus(DeliveryStatus deliveryStatus);

    /**
     * Find a delivery by ID with PESSIMISTIC_WRITE lock.
     * Used for atomic acceptance — the first transaction to acquire the
     * lock wins; concurrent transactions block until the lock is released,
     * then find the delivery is no longer AVAILABLE.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Delivery d WHERE d.id = :id")
    @QueryHints(@QueryHint(name = "jakarta.persistence.lock.timeout", value = "5000"))
    Optional<Delivery> findByIdWithLock(Long id);

    /**
     * Find AVAILABLE deliveries that have no delivery boy assigned.
     * Ordered by creation time (oldest first — FIFO).
     */
    @Query("SELECT d FROM Delivery d WHERE d.deliveryStatus = 'AVAILABLE' AND d.deliveryBoy IS NULL ORDER BY d.availableAt ASC")
    List<Delivery> findAvailableDeliveries();
}