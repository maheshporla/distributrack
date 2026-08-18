package com.distributrack.enums;

/**
 * How stock changed for an inventory record.
 *
 * IN         — stock received (purchase / restock); quantity is the
 *              positive change.
 * OUT        — stock dispatched / consumed; quantity is the positive
 *              change that is subtracted.
 * ADJUSTMENT — direct correction; quantity is the new absolute balance.
 */
public enum StockMovementType {
    IN,
    OUT,
    ADJUSTMENT
}
