package com.distributrack.service;

import com.distributrack.dto.request.ProductRequest;
import com.distributrack.dto.response.ProductResponse;

import java.util.List;

public interface ProductService {

    // Create Product
    ProductResponse createProduct(ProductRequest request);

    // Update Product
    ProductResponse updateProduct(Long id, ProductRequest request);

    // Delete Product
    void deleteProduct(Long id);

    // Get Product By Id
    ProductResponse getProductById(Long id);

    // Get All Products
    List<ProductResponse> getAllProducts();

    // Search Products
    List<ProductResponse> searchProducts(String keyword);

    // Get Products By Category
    List<ProductResponse> getProductsByCategory(String category);
}