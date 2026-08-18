package com.distributrack.dto.response;

import com.distributrack.enums.StockMovementType;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovementResponse {

    private Long id;

    private Long inventoryId;

    private Long productId;

    private String productName;

    private String warehouseLocation;

    private StockMovementType type;

    private Integer quantityChange;

    private Integer balanceAfter;

    private String note;

    private Long createdBy;

    private LocalDateTime createdAt;
}
