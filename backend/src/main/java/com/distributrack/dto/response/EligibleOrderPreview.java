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
public class EligibleOrderPreview {

    private Long orderId;
    private String orderNumber;
    private BigDecimal totalAmount;
    private int productCount;
    private String status;
}
