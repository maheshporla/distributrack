package com.distributrack.dto.response;

import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryResponse {

    private Long id;

    private Long orderId;

    private String orderNumber;

    private Long deliveryBoyId;

    private String deliveryBoyName;

    // Customer / order summary (carried on the delivery so DELIVERY_BOY
    // and SHOPKEEPER views have it — DELIVERY_BOY is denied /api/orders/**)
    private Long shopkeeperId;

    private String shopkeeperName;

    private String shopkeeperPhone;

    private BigDecimal orderTotalAmount;

    private DeliveryStatus deliveryStatus;

    private OrderStatus orderStatus;

    private String deliveryAddress;

    private String vehicleNumber;

    // Live GPS tracking
    private Double latitude;

    private Double longitude;

    private LocalDateTime lastLocationAt;

    private LocalDateTime assignedAt;

    private LocalDateTime deliveredAt;
}