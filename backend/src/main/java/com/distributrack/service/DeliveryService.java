package com.distributrack.service;

import com.distributrack.dto.request.DeliveryRequest;
import com.distributrack.dto.response.DeliveryResponse;

import java.util.List;

public interface DeliveryService {

    // Create Delivery
    DeliveryResponse createDelivery(DeliveryRequest request);

    // Get All Deliveries
    List<DeliveryResponse> getAllDeliveries();

    // Get Delivery By Id
    DeliveryResponse getDeliveryById(Long id);

    // Update Delivery Status
    DeliveryResponse updateDeliveryStatus(Long id, String status);

    // Delete Delivery
    void deleteDelivery(Long id);

    // Get Deliveries By Delivery Boy
    List<DeliveryResponse> getDeliveriesByDeliveryBoy(Long deliveryBoyId);

    // Get Deliveries By Status
    List<DeliveryResponse> getDeliveriesByStatus(String status);

    // Update Live GPS Location For A Delivery
    DeliveryResponse updateDeliveryLocation(Long id, Double latitude, Double longitude);
}