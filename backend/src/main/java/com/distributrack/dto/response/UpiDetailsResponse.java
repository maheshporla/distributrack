package com.distributrack.dto.response;

import lombok.*;

import java.math.BigDecimal;

/**
 * UPI payment details returned to the shopkeeper.
 *
 * Contains everything needed to make a UPI payment:
 * distributor name, UPI VPA, amount, order reference, and the
 * complete UPI URI for QR code generation.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpiDetailsResponse {

    /** Distributor display name. */
    private String distributorName;

    /** Distributor's UPI VPA (e.g. name@bank). */
    private String upiId;

    /** Payment amount in INR. */
    private BigDecimal amount;

    /** Order number for reference. */
    private String orderNumber;

    /** Order ID. */
    private Long orderId;

    /**
     * Complete UPI payment URI following the UPI deep-link spec.
     * Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
     * The frontend renders this as a QR code.
     */
    private String upiUri;
}
