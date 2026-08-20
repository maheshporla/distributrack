package com.distributrack.service;

import com.distributrack.dto.request.DeliveryRequest;
import com.distributrack.dto.response.DeliveryResponse;

import java.util.List;

public interface DeliveryService {

    // Create Delivery (admin emergency or initial)
    DeliveryResponse createDelivery(DeliveryRequest request);

    // Get All Deliveries
    List<DeliveryResponse> getAllDeliveries();

    // Get Delivery By Id
    DeliveryResponse getDeliveryById(Long id);

    // Update Delivery Status
    DeliveryResponse updateDeliveryStatus(Long id, String status, String failureReason);

    // Delete Delivery
    void deleteDelivery(Long id);

    // Get Deliveries By Delivery Boy
    List<DeliveryResponse> getDeliveriesByDeliveryBoy(Long deliveryBoyId);

    // Get Deliveries By Status
    List<DeliveryResponse> getDeliveriesByStatus(String status);

    // Update Live GPS Location For A Delivery
    DeliveryResponse updateDeliveryLocation(Long id, Double latitude, Double longitude);

    // --- Automatic delivery workflow ---

    /** Get AVAILABLE deliveries visible to online workers. */
    List<DeliveryResponse> getAvailableDeliveries();

    /**
     * Worker accepts an AVAILABLE delivery. Atomic first-accept:
     * only one worker succeeds if multiple try simultaneously.
     */
    DeliveryResponse acceptDelivery(Long deliveryId);

    /**
     * Admin/Distributor emergency reassignment.
     * Moves a delivery back to AVAILABLE so another worker can accept it.
     */
    DeliveryResponse emergencyReassign(Long deliveryId);
}