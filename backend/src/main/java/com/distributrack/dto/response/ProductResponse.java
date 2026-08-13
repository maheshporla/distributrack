package com.distributrack.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductResponse {

    private Long id;

    private String productName;

    private String description;

    private String category;

    private String brand;

    private String sku;

    private BigDecimal price;

    private Integer stockQuantity;

    private String unit;

    private String imageUrl;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}