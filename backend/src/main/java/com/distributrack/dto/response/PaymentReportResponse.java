package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Payment report — totals plus per-payment rows in the requested date
 * range (null range = all time).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReportResponse {

    private BigDecimal totalPaid;

    private BigDecimal outstandingAmount;

    private BigDecimal failedAmount;

    private BigDecimal refundedAmount;

    private List<PaymentReportRow> rows;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentReportRow {
        private Long paymentId;
        private String orderNumber;
        private String shopkeeperName;
        private BigDecimal amount;
        private String paymentMethod;
        private String paymentStatus;
        private LocalDateTime paymentDate;
    }
}
