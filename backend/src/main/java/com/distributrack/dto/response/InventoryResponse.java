package com.distributrack.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryResponse {

    private Long id;

    private Long productId;

    private String productName;

    private Integer quantity;

    private Integer minimumStock;

    private Integer maximumStock;

    private String warehouseLocation;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}