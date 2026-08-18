package com.distributrack.dto.response;

import com.distributrack.enums.InvoiceStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * An invoice is a derived, read-only view of an Order joined with its
 * payments. No separate invoice table exists — deriving keeps the
 * invoice always consistent with the order and payment data.
 *
 * The business model has no taxes, so subtotal == totalAmount (sum of
 * line items). Reconciliation is computed from the SUCCESS payments:
 * paidAmount + outstandingAmount == totalAmount, and invoiceStatus is
 * UNPAID / PARTIALLY_PAID / PAID accordingly.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceResponse {

    /** Human-facing invoice reference, derived as "INV-<orderNumber>". */
    private String invoiceNumber;

    private Long orderId;

    private String orderNumber;

    private Long shopkeeperId;

    private String shopkeeperName;

    private String shopkeeperPhone;

    private List<OrderItemResponse> items;

    /** Sum of line-item subtotals (no taxes in the business model). */
    private BigDecimal subtotal;

    private BigDecimal totalAmount;

    private OrderStatus orderStatus;

    /** Order placement date — serves as the invoice issue date. */
    private LocalDateTime orderDate;

    // ---------------------------------------------------------
    // Reconciliation (always computed, never stored)
    // ---------------------------------------------------------

    /** Sum of SUCCESS payments against this order. */
    private BigDecimal paidAmount;

    /** totalAmount - paidAmount. */
    private BigDecimal outstandingAmount;

    /** UNPAID / PARTIALLY_PAID / PAID derived from paid vs total. */
    private InvoiceStatus invoiceStatus;

    /** Number of recorded payments (any status). */
    private int paymentCount;

    // Latest payment summary (null until a payment is recorded)
    private Long paymentId;

    private PaymentStatus paymentStatus;

    private BigDecimal paymentAmount;

    private String paymentMethod;

    private String transactionId;

    private LocalDateTime paymentDate;
}
