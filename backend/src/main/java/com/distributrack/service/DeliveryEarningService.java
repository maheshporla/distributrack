package com.distributrack.service;

import com.distributrack.dto.response.DeliveryEarningsDashboard;
import com.distributrack.dto.response.DeliveryEarningResponse;
import com.distributrack.entity.Delivery;

import java.util.List;

public interface DeliveryEarningService {

    /**
     * Calculate and save earning for a completed delivery.
     * Called when delivery status transitions to DELIVERED.
     * Safe to call multiple times — duplicate deliveries are rejected.
     */
    DeliveryEarningResponse createEarningIfNotExists(Delivery delivery);

    /**
     * Delivery boy: get full earnings dashboard (today, month, history).
     */
    DeliveryEarningsDashboard getMyEarningsDashboard();

    /**
     * Admin: get aggregated earnings dashboard for all delivery boys.
     */
    DeliveryEarningsDashboard getAdminEarningsDashboard();

    /**
     * Admin: get detailed earnings dashboard for a specific delivery boy.
     */
    DeliveryEarningsDashboard getDeliveryBoyEarningsDashboard(Long deliveryBoyId);

    /**
     * Delivery boy: get order-wise earnings history.
     */
    List<DeliveryEarningResponse> getMyEarningsHistory();

    /**
     * Admin: get all earnings for a specific delivery boy.
     */
    List<DeliveryEarningResponse> getDeliveryBoyEarningsHistory(Long deliveryBoyId);
}
