package com.distributrack.dto.response;

import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryBatchDeliverySummary {

    private Long deliveryId;
    private Long orderId;
    private String orderNumber;
    private DeliveryStatus deliveryStatus;
    private OrderStatus orderStatus;

    private int totalProducts;
    private int deliveredProducts;
    private int failedProducts;
    private int remainingProducts;
    private BigDecimal billAmount;
    private BigDecimal deliveredAmount;
    private BigDecimal failedAmount;

    private String deliveryAddress;
    private LocalDateTime assignedAt;
    private LocalDateTime deliveredAt;

    private List<DeliveryBatchItemSummary> items;
}
