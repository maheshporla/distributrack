package com.distributrack.dto.response;

import com.distributrack.enums.PaymentChannel;
import com.distributrack.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;

    private Long orderId;

    private String orderNumber;

    // Customer / order summary carried on the payment so SHOPKEEPER and
    // business views can show the customer and outstanding amount.
    private Long shopkeeperId;

    private String shopkeeperName;

    private BigDecimal orderTotalAmount;

    private BigDecimal amount;

    private String paymentMethod;

    private PaymentStatus paymentStatus;

    /** How the payment was collected (MANUAL / GATEWAY / MOCK). */
    private PaymentChannel paymentChannel;

    private String transactionId;

    /** UTR (Unique Transaction Reference) from UPI payment. */
    private String utr;

    /** Reason when an admin rejects a UPI payment. */
    private String rejectionReason;

    /** Name of the admin who approved/rejected the payment. */
    private String verifiedByName;

    /** Timestamp when the admin approved/rejected the payment. */
    private LocalDateTime verifiedAt;

    private LocalDateTime paymentDate;
}
