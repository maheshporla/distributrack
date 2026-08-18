package com.distributrack.controller;

import com.distributrack.dto.request.DeliveryRequest;
import com.distributrack.dto.request.LocationUpdateRequest;
import com.distributrack.dto.response.DeliveryResponse;
import com.distributrack.service.DeliveryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/delivery")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;

    // Create Delivery
    @PostMapping
    public DeliveryResponse createDelivery(
            @Valid @RequestBody DeliveryRequest request) {

        return deliveryService.createDelivery(request);
    }

    // Get All Deliveries
    @GetMapping
    public List<DeliveryResponse> getAllDeliveries() {

        return deliveryService.getAllDeliveries();
    }

    // Get Delivery By Id
    @GetMapping("/{id}")
    public DeliveryResponse getDeliveryById(
            @PathVariable Long id) {

        return deliveryService.getDeliveryById(id);
    }

    // Update Delivery Status
    @PutMapping("/{id}/status")
    public DeliveryResponse updateDeliveryStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        return deliveryService.updateDeliveryStatus(id, status);
    }

    // Update Delivery Live GPS Location
    @PutMapping("/{id}/location")
    public DeliveryResponse updateDeliveryLocation(
            @PathVariable Long id,
            @Valid @RequestBody LocationUpdateRequest request) {

        return deliveryService.updateDeliveryLocation(
                id,
                request.getLatitude(),
                request.getLongitude()
        );
    }

    // Delete Delivery
    @DeleteMapping("/{id}")
    public String deleteDelivery(
            @PathVariable Long id) {

        deliveryService.deleteDelivery(id);

        return "Delivery deleted successfully";
    }

    // Get Deliveries By Delivery Boy
    @GetMapping("/delivery-boy/{deliveryBoyId}")
    public List<DeliveryResponse> getDeliveriesByDeliveryBoy(
            @PathVariable Long deliveryBoyId) {

        return deliveryService.getDeliveriesByDeliveryBoy(deliveryBoyId);
    }

    // Get Deliveries By Status
    @GetMapping("/status/{status}")
    public List<DeliveryResponse> getDeliveriesByStatus(
            @PathVariable String status) {

        return deliveryService.getDeliveriesByStatus(status);
    }
}