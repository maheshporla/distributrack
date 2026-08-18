package com.distributrack.dto.response;

import com.distributrack.enums.InvoiceStatus;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payment reconciliation for a single order:
 *
 *   Total ₹10,000 | Paid ₹6,000 | Outstanding ₹4,000 -> PARTIALLY_PAID
 *
 * Computed from the order total and its SUCCESS payments, so it can
 * never drift out of sync with the actual payment records.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentSummaryResponse {

    private Long orderId;

    private String orderNumber;

    private Long shopkeeperId;

    private String shopkeeperName;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal outstandingAmount;

    private InvoiceStatus invoiceStatus;

    private List<PaymentResponse> payments;
}
