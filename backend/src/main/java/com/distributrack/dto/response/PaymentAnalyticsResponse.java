package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Payment analytics. Payment method is a free-text String on the backend
 * (no enum yet), so "by method" groups the stored values verbatim.
 *
 * Amount semantics:
 *   - paid        = sum of payment amounts with status SUCCESS
 *   - failed      = sum with status FAILED
 *   - refunded    = sum with status REFUNDED
 *   - outstanding = sum of order totals that do NOT have a SUCCESS payment
 *                   (unpaid, failed or refunded orders still owed)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentAnalyticsResponse {

    private BigDecimal totalPaid;

    private BigDecimal outstandingAmount;

    private BigDecimal failedAmount;

    private BigDecimal refundedAmount;

    private List<MethodTotal> byMethod;

    private List<SalesAnalyticsResponse.NameCount> paymentStatusDistribution;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MethodTotal {
        private String method;
        private Long count;
        private BigDecimal amount;
    }
}
