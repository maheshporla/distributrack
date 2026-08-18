package com.distributrack.repository;

import com.distributrack.entity.Order;
import com.distributrack.entity.User;
import com.distributrack.enums.OrderStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumber(String orderNumber);

    /**
     * Fetch order items, their products and the shopkeeper in one query
     * (avoids the per-order / per-item lazy-load N+1 in list endpoints).
     */
    @EntityGraph(attributePaths = {"orderItems", "orderItems.product", "shopkeeper"})
    @Override
    List<Order> findAll();

    @EntityGraph(attributePaths = {"orderItems", "orderItems.product", "shopkeeper"})
    List<Order> findByShopkeeper(User shopkeeper);

    @EntityGraph(attributePaths = {"orderItems", "orderItems.product", "shopkeeper"})
    List<Order> findByStatus(OrderStatus status);
}