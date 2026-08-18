package com.distributrack.dto.response;

import com.distributrack.enums.OrderStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderResponse {

    private Long id;

    private String orderNumber;

    private Long shopkeeperId;

    private String shopkeeperName;

    private List<OrderItemResponse> items;

    private BigDecimal totalAmount;

    private OrderStatus status;

    private LocalDateTime orderDate;
}