package com.distributrack.controller;

import com.distributrack.dto.response.DeliveryEarningsDashboard;
import com.distributrack.dto.response.DeliveryEarningResponse;
import com.distributrack.service.DeliveryEarningService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/delivery-earnings")
@RequiredArgsConstructor
public class DeliveryEarningController {

    private final DeliveryEarningService deliveryEarningService;

    /**
     * Delivery boy: get my full earnings dashboard
     * (today, month, all-time, today's breakdown, history).
     */
    @GetMapping("/my/dashboard")
    public DeliveryEarningsDashboard getMyDashboard() {
        return deliveryEarningService.getMyEarningsDashboard();
    }

    /**
     * Delivery boy: get my order-wise earnings history.
     */
    @GetMapping("/my/history")
    public List<DeliveryEarningResponse> getMyHistory() {
        return deliveryEarningService.getMyEarningsHistory();
    }

    /**
     * Admin: get aggregated earnings across all delivery boys.
     */
    @GetMapping("/admin/dashboard")
    public DeliveryEarningsDashboard getAdminDashboard() {
        return deliveryEarningService.getAdminEarningsDashboard();
    }

    /**
     * Admin: get detailed earnings for a specific delivery boy.
     */
    @GetMapping("/admin/{deliveryBoyId}/dashboard")
    public DeliveryEarningsDashboard getDeliveryBoyDashboard(
            @PathVariable Long deliveryBoyId) {
        return deliveryEarningService.getDeliveryBoyEarningsDashboard(deliveryBoyId);
    }

    /**
     * Admin/Delivery Boy: get order-wise earnings for a specific delivery boy.
     * Delivery boy can only access their own (enforced in service).
     */
    @GetMapping("/admin/{deliveryBoyId}/history")
    public List<DeliveryEarningResponse> getDeliveryBoyHistory(
            @PathVariable Long deliveryBoyId) {
        return deliveryEarningService.getDeliveryBoyEarningsHistory(deliveryBoyId);
    }
}
