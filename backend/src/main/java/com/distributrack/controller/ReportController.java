package com.distributrack.controller;

import com.distributrack.dto.response.DeliveryReportResponse;
import com.distributrack.dto.response.InventoryReportResponse;
import com.distributrack.dto.response.OrdersReportResponse;
import com.distributrack.dto.response.PaymentReportResponse;
import com.distributrack.dto.response.SalesReportResponse;
import com.distributrack.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // Sales Report (optional date range)
    @GetMapping("/sales")
    public SalesReportResponse getSalesReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getSalesReport(from, to);
    }

    // Orders Report (optional date range)
    @GetMapping("/orders")
    public OrdersReportResponse getOrdersReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getOrdersReport(from, to);
    }

    // Inventory Report
    @GetMapping("/inventory")
    public InventoryReportResponse getInventoryReport() {
        return reportService.getInventoryReport();
    }

    // Delivery Report (optional date range)
    @GetMapping("/deliveries")
    public DeliveryReportResponse getDeliveryReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getDeliveryReport(from, to);
    }

    // Payment Report (optional date range)
    @GetMapping("/payments")
    public PaymentReportResponse getPaymentReport(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getPaymentReport(from, to);
    }
}