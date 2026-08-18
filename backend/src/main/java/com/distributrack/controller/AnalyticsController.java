package com.distributrack.controller;

import com.distributrack.dto.response.AnalyticsResponse;
import com.distributrack.dto.response.DeliveryAnalyticsResponse;
import com.distributrack.dto.response.InventoryAnalyticsResponse;
import com.distributrack.dto.response.PaymentAnalyticsResponse;
import com.distributrack.dto.response.SalesAnalyticsResponse;
import com.distributrack.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Business analytics. SecurityConfig restricts /api/analytics/** to
 * SUPER_ADMIN / OWNER / MANAGER — business-wide financial data is never
 * exposed to SHOPKEEPER / DELIVERY_BOY / SALESMAN.
 *
 * All values come from the real database; nothing is mocked.
 */
@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    /** KPI overview across orders, payments, inventory and deliveries. */
    @GetMapping("/overview")
    public AnalyticsResponse getOverview() {
        return analyticsService.getAnalytics();
    }

    /** Sales trend, top products, top shops + status distributions. */
    @GetMapping("/sales")
    public SalesAnalyticsResponse getSales(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        return analyticsService.getSalesAnalytics(from, to);
    }

    @GetMapping("/payments")
    public PaymentAnalyticsResponse getPayments() {
        return analyticsService.getPaymentAnalytics();
    }

    @GetMapping("/deliveries")
    public DeliveryAnalyticsResponse getDeliveries() {
        return analyticsService.getDeliveryAnalytics();
    }

    @GetMapping("/inventory")
    public InventoryAnalyticsResponse getInventory() {
        return analyticsService.getInventoryAnalytics();
    }
}
