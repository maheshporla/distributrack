package com.distributrack.service.impl;

import com.distributrack.dto.request.ProductRequest;
import com.distributrack.dto.response.ProductResponse;
import com.distributrack.entity.Product;
import com.distributrack.repository.ProductRepository;
import com.distributrack.service.AuditService;
import com.distributrack.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final AuditService auditService;

    @Override
    public ProductResponse createProduct(ProductRequest request) {

        if (productRepository.existsBySku(request.getSku())) {
            throw new RuntimeException("Product SKU already exists");
        }

        Product product = Product.builder()
                .productName(request.getProductName())
                .description(request.getDescription())
                .category(request.getCategory())
                .brand(request.getBrand())
                .sku(request.getSku())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity())
                .unit(request.getUnit())
                .imageUrl(request.getImageUrl())
                .active(true)
                .build();

        productRepository.save(product);

        auditService.log("PRODUCT_CREATE", "Product", product.getId(),
                "Product created: " + product.getProductName()
                        + " (SKU " + product.getSku() + ", ₹" + product.getPrice() + ")");

        return mapToResponse(product);
    }

    @Override
    public ProductResponse updateProduct(Long id, ProductRequest request) {

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        // Reject a SKU that belongs to a DIFFERENT product (a clean 400
        // instead of a database unique-constraint 500).
        productRepository.findBySku(request.getSku())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new RuntimeException("Product SKU already exists");
                });

        product.setProductName(request.getProductName());
        product.setDescription(request.getDescription());
        product.setCategory(request.getCategory());
        product.setBrand(request.getBrand());
        product.setSku(request.getSku());
        product.setPrice(request.getPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setUnit(request.getUnit());
        product.setImageUrl(request.getImageUrl());

        productRepository.save(product);

        auditService.log("PRODUCT_UPDATE", "Product", product.getId(),
                "Product updated: " + product.getProductName()
                        + " (SKU " + product.getSku() + ", ₹" + product.getPrice() + ")");

        return mapToResponse(product);
    }

    @Override
    public void deleteProduct(Long id) {

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        auditService.log("PRODUCT_DELETE", "Product", id,
                "Product deleted: " + product.getProductName()
                        + " (SKU " + product.getSku() + ")");

        productRepository.delete(product);
    }

    @Override
    public ProductResponse getProductById(Long id) {

        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return mapToResponse(product);
    }

    @Override
    public List<ProductResponse> getAllProducts() {

        return productRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductResponse> searchProducts(String keyword) {

        return productRepository
                .findByProductNameContainingIgnoreCase(keyword)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductResponse> getProductsByCategory(String category) {

        return productRepository
                .findByCategoryIgnoreCase(category)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ProductResponse mapToResponse(Product product) {

        return ProductResponse.builder()
                .id(product.getId())
                .productName(product.getProductName())
                .description(product.getDescription())
                .category(product.getCategory())
                .brand(product.getBrand())
                .sku(product.getSku())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .unit(product.getUnit())
                .imageUrl(product.getImageUrl())
                .active(product.getActive())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}