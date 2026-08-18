package com.distributrack.controller;

import com.distributrack.dto.response.InvoiceResponse;
import com.distributrack.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Derived, read-only invoices (no invoice table — built from orders and
 * their payments on the fly).
 *
 * Access (SecurityConfig + service):
 *   - GET: SUPER_ADMIN, OWNER, MANAGER, SALESMAN, SHOPKEEPER
 *     (SHOPKEEPER sees only their own orders' invoices)
 *   - DELIVERY_BOY: no access
 */
@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public List<InvoiceResponse> getAllInvoices() {
        return invoiceService.getAllInvoices();
    }

    /** Invoice for a specific order (orderId is the natural key). */
    @GetMapping("/{orderId}")
    public InvoiceResponse getInvoiceByOrderId(@PathVariable Long orderId) {
        return invoiceService.getInvoiceByOrderId(orderId);
    }
}
