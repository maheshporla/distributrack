package com.distributrack.repository;

import com.distributrack.entity.Delivery;
import com.distributrack.entity.DeliveryEarning;
import com.distributrack.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface DeliveryEarningRepository extends JpaRepository<DeliveryEarning, Long> {

    /** Check if an earning already exists for a delivery (duplicate protection). */
    boolean existsByDelivery(Delivery delivery);

    /** Get the earning for a specific delivery. */
    Optional<DeliveryEarning> findByDelivery(Delivery delivery);

    /** Get all earnings for a delivery boy, ordered by earned date descending. */
    List<DeliveryEarning> findByDeliveryBoyOrderByEarnedAtDesc(User deliveryBoy);

    /**
     * Find earnings for a delivery boy within a date range.
     * Used for daily/monthly summaries.
     */
    List<DeliveryEarning> findByDeliveryBoyAndEarnedAtBetweenOrderByEarnedAtDesc(
            User deliveryBoy, LocalDateTime from, LocalDateTime to);

    /**
     * Sum total earning amount for a delivery boy in a date range.
     */
    @Query("SELECT COALESCE(SUM(e.earningAmount), 0) FROM DeliveryEarning e " +
            "WHERE e.deliveryBoy = :deliveryBoy AND e.earnedAt BETWEEN :from AND :to")
    BigDecimal sumEarningAmount(@Param("deliveryBoy") User deliveryBoy,
                                 @Param("from") LocalDateTime from,
                                 @Param("to") LocalDateTime to);

    /**
     * Count completed deliveries for a delivery boy in a date range.
     */
    @Query("SELECT COUNT(e) FROM DeliveryEarning e " +
            "WHERE e.deliveryBoy = :deliveryBoy AND e.earnedAt BETWEEN :from AND :to")
    long countDeliveries(@Param("deliveryBoy") User deliveryBoy,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);

    /**
     * Sum total distance for a delivery boy in a date range.
     */
    @Query("SELECT COALESCE(SUM(e.distanceKm), 0) FROM DeliveryEarning e " +
            "WHERE e.deliveryBoy = :deliveryBoy AND e.earnedAt BETWEEN :from AND :to")
    BigDecimal sumDistanceKm(@Param("deliveryBoy") User deliveryBoy,
                              @Param("from") LocalDateTime from,
                              @Param("to") LocalDateTime to);

    /**
     * All delivery boys who have at least one earning (for admin summary).
     */
    @Query("SELECT DISTINCT e.deliveryBoy FROM DeliveryEarning e")
    List<User> findDistinctDeliveryBoysWithEarnings();

    /**
     * Sum total earning amount for a delivery boy (all time).
     */
    @Query("SELECT COALESCE(SUM(e.earningAmount), 0) FROM DeliveryEarning e " +
            "WHERE e.deliveryBoy = :deliveryBoy")
    BigDecimal sumAllTimeEarnings(@Param("deliveryBoy") User deliveryBoy);

    /**
     * Count all completed deliveries for a delivery boy (all time).
     */
    @Query("SELECT COUNT(e) FROM DeliveryEarning e WHERE e.deliveryBoy = :deliveryBoy")
    long countAllTimeDeliveries(@Param("deliveryBoy") User deliveryBoy);

    /**
     * Sum total distance for a delivery boy (all time).
     */
    @Query("SELECT COALESCE(SUM(e.distanceKm), 0) FROM DeliveryEarning e " +
            "WHERE e.deliveryBoy = :deliveryBoy")
    BigDecimal sumAllTimeDistance(@Param("deliveryBoy") User deliveryBoy);
}
