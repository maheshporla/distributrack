package com.distributrack.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBatchItemSummary {

    private Long productId;
    private String productName;
    private String category;
    private int orderedQuantity;
    private int deliveredQuantity;
    private int failedQuantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
