package com.distributrack.repository;

import com.distributrack.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySku(String sku);

    boolean existsBySku(String sku);

    List<Product> findByCategoryIgnoreCase(String category);

    List<Product> findByProductNameContainingIgnoreCase(String keyword);

    List<Product> findByActiveTrue();
}