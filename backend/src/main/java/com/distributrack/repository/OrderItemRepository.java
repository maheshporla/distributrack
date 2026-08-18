package com.distributrack.repository;

import com.distributrack.entity.Order;
import com.distributrack.entity.OrderItem;
import com.distributrack.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    List<OrderItem> findByOrder(Order order);

    List<OrderItem> findByProduct(Product product);
}