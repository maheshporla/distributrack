package com.distributrack.service;

import com.distributrack.dto.request.CreateDeliveryBatchRequest;
import com.distributrack.dto.response.DeliveryBatchResponse;
import com.distributrack.dto.response.EligibleOrdersResponse;

import java.math.BigDecimal;
import java.util.List;

public interface DeliveryBatchService {

    /** Preview eligible orders/shops within the specified area. */
    EligibleOrdersResponse previewEligibleOrders(
            String areaName,
            BigDecimal centerLat,
            BigDecimal centerLng,
            BigDecimal radiusKm
    );

    /** Create a delivery batch assigning all eligible orders in the area to a delivery boy. */
    DeliveryBatchResponse createDeliveryBatch(CreateDeliveryBatchRequest request);

    /** Get all batches (admin view). */
    List<DeliveryBatchResponse> getAllBatches();

    /** Get batch details with shop-wise and delivery-wise breakdowns. */
    DeliveryBatchResponse getBatchById(Long batchId);

    /** Get the current active batch for the authenticated delivery boy. */
    DeliveryBatchResponse getMyActiveBatch();

    /** Get all batches for the authenticated delivery boy. */
    List<DeliveryBatchResponse> getMyBatches();

    /** Start delivery on a batch (delivery boy marks as in-progress). */
    DeliveryBatchResponse startBatch(Long batchId);

    /** Complete a batch (called when all deliveries in the batch are done). */
    DeliveryBatchResponse completeBatch(Long batchId);
}
