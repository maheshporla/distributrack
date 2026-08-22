package com.distributrack.controller;

import com.distributrack.dto.request.CreateDeliveryBatchRequest;
import com.distributrack.dto.response.DeliveryBatchResponse;
import com.distributrack.dto.response.EligibleOrdersResponse;
import com.distributrack.service.DeliveryBatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/delivery-batches")
@RequiredArgsConstructor
public class DeliveryBatchController {

    private final DeliveryBatchService deliveryBatchService;

    /** Preview eligible orders/shops within the specified area radius. */
    @GetMapping("/preview")
    public EligibleOrdersResponse previewEligibleOrders(
            @RequestParam String areaName,
            @RequestParam BigDecimal centerLatitude,
            @RequestParam BigDecimal centerLongitude,
            @RequestParam BigDecimal radiusKm) {

        return deliveryBatchService.previewEligibleOrders(
                areaName, centerLatitude, centerLongitude, radiusKm);
    }

    /** Create a delivery batch assigning all eligible orders to a delivery boy. */
    @PostMapping
    public DeliveryBatchResponse createDeliveryBatch(
            @Valid @RequestBody CreateDeliveryBatchRequest request) {

        return deliveryBatchService.createDeliveryBatch(request);
    }

    /** List all delivery batches (admin view). */
    @GetMapping
    public List<DeliveryBatchResponse> getAllBatches() {
        return deliveryBatchService.getAllBatches();
    }

    /** Get batch details with shop-wise and delivery-wise breakdowns. */
    @GetMapping("/{id}")
    public DeliveryBatchResponse getBatchById(@PathVariable Long id) {
        return deliveryBatchService.getBatchById(id);
    }

    /** Delivery boy: get my current active batch. */
    @GetMapping("/my/active")
    public DeliveryBatchResponse getMyActiveBatch() {
        return deliveryBatchService.getMyActiveBatch();
    }

    /** Delivery boy: get all my batches. */
    @GetMapping("/my")
    public List<DeliveryBatchResponse> getMyBatches() {
        return deliveryBatchService.getMyBatches();
    }

    /** Delivery boy: start delivery on a batch (marks as IN_PROGRESS). */
    @PostMapping("/{id}/start")
    public DeliveryBatchResponse startBatch(@PathVariable Long id) {
        return deliveryBatchService.startBatch(id);
    }

    /** Complete a batch (called when all deliveries in the batch are done). */
    @PostMapping("/{id}/complete")
    public DeliveryBatchResponse completeBatch(@PathVariable Long id) {
        return deliveryBatchService.completeBatch(id);
    }
}
