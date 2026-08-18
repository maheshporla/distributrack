package com.distributrack.service;

import com.distributrack.dto.response.DeliveryReportResponse;
import com.distributrack.dto.response.InventoryReportResponse;
import com.distributrack.dto.response.OrdersReportResponse;
import com.distributrack.dto.response.PaymentReportResponse;
import com.distributrack.dto.response.SalesReportResponse;

import java.time.LocalDate;

/**
 * Operational reports. All endpoints are restricted to business roles
 * (SUPER_ADMIN / OWNER / MANAGER) by SecurityConfig. Revenue follows the
 * established rule: only DELIVERED/COMPLETED orders count, once each.
 */
public interface ReportService {

    // Sales Report (rows + summary; optional date range)
    SalesReportResponse getSalesReport(LocalDate from, LocalDate to);

    // Orders Report (rows + lifecycle counts; optional date range)
    OrdersReportResponse getOrdersReport(LocalDate from, LocalDate to);

    // Inventory Report (rows + summary)
    InventoryReportResponse getInventoryReport();

    // Delivery Report (rows + status counts; optional date range)
    DeliveryReportResponse getDeliveryReport(LocalDate from, LocalDate to);

    // Payment Report (rows + totals; optional date range)
    PaymentReportResponse getPaymentReport(LocalDate from, LocalDate to);
}