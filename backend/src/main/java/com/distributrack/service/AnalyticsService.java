package com.distributrack.service;

import com.distributrack.dto.response.AnalyticsResponse;
import com.distributrack.dto.response.DeliveryAnalyticsResponse;
import com.distributrack.dto.response.InventoryAnalyticsResponse;
import com.distributrack.dto.response.PaymentAnalyticsResponse;
import com.distributrack.dto.response.SalesAnalyticsResponse;

import java.time.LocalDate;

/**
 * Business analytics. Access is restricted to business roles
 * (SUPER_ADMIN / OWNER / MANAGER) by SecurityConfig; nothing here is
 * exposed to SHOPKEEPER / DELIVERY_BOY / SALESMAN.
 *
 * All figures come from real repository data — no mock statistics.
 * Revenue follows the established rule: only DELIVERED/COMPLETED orders
 * count, each order exactly once.
 */
public interface AnalyticsService {

    /** KPI overview across orders, payments, inventory and deliveries. */
    AnalyticsResponse getAnalytics();

    /** Sales trend, top products, top shops + status distributions. */
    SalesAnalyticsResponse getSalesAnalytics(LocalDate from, LocalDate to);

    PaymentAnalyticsResponse getPaymentAnalytics();

    DeliveryAnalyticsResponse getDeliveryAnalytics();

    InventoryAnalyticsResponse getInventoryAnalytics();
}