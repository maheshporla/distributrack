package com.distributrack.service;

import com.distributrack.dto.response.InvoiceResponse;

import java.util.List;

/**
 * Read-only, derived invoice views (no separate invoice table).
 *
 * Access mirrors payments:
 *   - SHOPKEEPER sees invoices for their own orders only
 *   - SALESMAN + business roles see operational invoices
 *   - DELIVERY_BOY has no invoice access (SecurityConfig denies)
 */
public interface InvoiceService {

    List<InvoiceResponse> getAllInvoices();

    InvoiceResponse getInvoiceByOrderId(Long orderId);
}
