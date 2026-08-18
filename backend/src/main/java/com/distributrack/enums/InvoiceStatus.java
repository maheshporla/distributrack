package com.distributrack.enums;

/**
 * Invoice settlement status, derived from the sum of SUCCESS payments
 * against the order total — never stored, always computed:
 *
 *   UNPAID          — no successful payment yet (paid == 0)
 *   PARTIALLY_PAID  — 0 < paid < total
 *   PAID            — paid >= total (fully settled)
 */
public enum InvoiceStatus {
    UNPAID,
    PARTIALLY_PAID,
    PAID
}
