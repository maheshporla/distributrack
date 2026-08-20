package com.distributrack.service.impl;

import com.distributrack.dto.request.DeliveryRequest;
import com.distributrack.dto.response.DeliveryResponse;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.Order;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.OrderStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.DeliveryService;
import com.distributrack.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeliveryServiceImpl implements DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    @Override
    @Transactional
    public DeliveryResponse createDelivery(DeliveryRequest request) {

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new RuntimeException("Order not found"));

        // A delivery can only be assigned to a DELIVERY_BOY account.
        User deliveryBoy = userRepository.findById(request.getDeliveryBoyId())
                .orElseThrow(() -> new RuntimeException("Delivery Boy not found"));

        if (deliveryBoy.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("Delivery can only be assigned to a DELIVERY_BOY account");
        }

        // A FAILED delivery may be re-assigned: replace the failed record
        // (the order is back to APPROVED after a failure, so the transition
        // below is legal). Any other existing delivery blocks re-assignment.
        deliveryRepository.findByOrder(order).ifPresent(existing -> {
            if (existing.getDeliveryStatus() != DeliveryStatus.FAILED) {
                throw new RuntimeException("A delivery already exists for this order");
            }
            deliveryRepository.delete(existing);
        });

        // Creating a delivery is the "assign" step of the order lifecycle.
        order.transitionTo(OrderStatus.ASSIGNED);

        Delivery delivery = Delivery.builder()
                .order(order)
                .deliveryBoy(deliveryBoy)
                .deliveryAddress(request.getDeliveryAddress())
                .vehicleNumber(request.getVehicleNumber())
                .deliveryStatus(DeliveryStatus.ASSIGNED)
                .assignedAt(LocalDateTime.now())
                .build();

        delivery = deliveryRepository.save(delivery);
        orderRepository.save(order);

        notificationService.notifyDeliveryAssigned(delivery);

        auditService.log("DELIVERY_ASSIGN", "Delivery", delivery.getId(),
                "Order " + order.getOrderNumber() + " assigned to delivery boy "
                        + deliveryBoy.getFullName());

        return mapToResponse(delivery);
    }

    @Override
    public List<DeliveryResponse> getAllDeliveries() {

        User current = currentUserService.getCurrentUser();

        List<Delivery> deliveries;

        if (current.getRole().getName() == RoleName.DELIVERY_BOY) {
            // Workers see only their own assigned deliveries.
            deliveries = deliveryRepository.findByDeliveryBoy(current);
        } else if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            // Shopkeepers see deliveries for their own orders (all statuses).
            deliveries = deliveryRepository.findAll().stream()
                    .filter(d -> d.getOrder().getShopkeeper().getId().equals(current.getId()))
                    .toList();
        } else {
            // Admin/distributor sees everything.
            deliveries = deliveryRepository.findAll();
        }

        return deliveries.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public DeliveryResponse getDeliveryById(Long id) {

        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + id));

        assertCanView(delivery);

        return mapToResponse(delivery);
    }

    @Override
    @Transactional
    public DeliveryResponse updateDeliveryStatus(Long id, String status, String failureReason) {

        DeliveryStatus nextStatus = parseDeliveryStatus(status);

        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + id));

        assertCanModify(delivery);

        // Validate the transition before mutating.
        if (!delivery.getDeliveryStatus().canTransitionTo(nextStatus)) {
            throw new IllegalStateException(
                    "Invalid delivery status transition: " + delivery.getDeliveryStatus() + " -> " + nextStatus
            );
        }

        delivery.setDeliveryStatus(nextStatus);

        // Persist failure reason when the delivery is marked as failed.
        if (nextStatus == DeliveryStatus.FAILED) {
            delivery.setFailureReason(
                    failureReason != null && !failureReason.isBlank() ? failureReason.trim() : null
            );
        }

        if (nextStatus == DeliveryStatus.OUT_FOR_DELIVERY) {
            // The boy started the run — sync the order so the lifecycle
            // stays consistent (ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED).
            delivery.getOrder().transitionTo(OrderStatus.OUT_FOR_DELIVERY);
            orderRepository.save(delivery.getOrder());
        } else if (nextStatus == DeliveryStatus.DELIVERED) {
            delivery.setDeliveredAt(LocalDateTime.now());
            // Delivering the order is the "delivered" step of the order lifecycle.
            delivery.getOrder().transitionTo(OrderStatus.DELIVERED);
            orderRepository.save(delivery.getOrder());
        } else if (nextStatus == DeliveryStatus.FAILED) {
            // Delivery failed — send the order back to APPROVED so it can
            // be re-assigned to another delivery boy (see createDelivery).
            delivery.getOrder().transitionTo(OrderStatus.APPROVED);
            orderRepository.save(delivery.getOrder());
        } else if (nextStatus == DeliveryStatus.CANCELLED) {
            delivery.getOrder().transitionTo(OrderStatus.CANCELLED);
            orderRepository.save(delivery.getOrder());
        }

        delivery = deliveryRepository.save(delivery);

        // Notify the shopkeeper about the delivery status.
        switch (nextStatus) {
            case OUT_FOR_DELIVERY -> notificationService.notifyDeliveryOutForDelivery(delivery);
            case DELIVERED -> notificationService.notifyDeliveryDelivered(delivery);
            case FAILED -> notificationService.notifyDeliveryFailed(delivery);
            case CANCELLED -> notificationService.notifyDeliveryCancelled(delivery);
            default -> { }
        }

        auditService.log("DELIVERY_STATUS", "Delivery", delivery.getId(),
                "Delivery for order " + delivery.getOrder().getOrderNumber()
                        + " status changed to " + nextStatus);

        return mapToResponse(delivery);
    }

    @Override
    public void deleteDelivery(Long id) {

        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + id));

        deliveryRepository.delete(delivery);
    }

    @Override
    public List<DeliveryResponse> getDeliveriesByDeliveryBoy(Long deliveryBoyId) {

        User current = currentUserService.getCurrentUser();

        // DELIVERY_BOY can only ever query their own deliveries.
        if (current.getRole().getName() == RoleName.DELIVERY_BOY) {
            deliveryBoyId = current.getId();
        }

        User deliveryBoy = userRepository.findById(deliveryBoyId)
                .orElseThrow(() -> new RuntimeException("Delivery Boy not found"));

        return deliveryRepository.findByDeliveryBoy(deliveryBoy)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<DeliveryResponse> getDeliveriesByStatus(String status) {

        DeliveryStatus deliveryStatus = parseDeliveryStatus(status);

        User current = currentUserService.getCurrentUser();

        List<Delivery> deliveries;

        if (current.getRole().getName() == RoleName.DELIVERY_BOY) {
            deliveries = deliveryRepository.findByDeliveryBoy(current).stream()
                    .filter(d -> d.getDeliveryStatus() == deliveryStatus)
                    .toList();
        } else if (current.getRole().getName() == RoleName.SHOPKEEPER) {
            deliveries = deliveryRepository.findAll().stream()
                    .filter(d -> d.getDeliveryStatus() == deliveryStatus
                            && d.getOrder().getShopkeeper().getId().equals(current.getId()))
                    .toList();
        } else {
            deliveries = deliveryRepository.findByDeliveryStatus(deliveryStatus);
        }

        return deliveries.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public DeliveryResponse updateDeliveryLocation(Long id, Double latitude, Double longitude) {

        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + id));

        assertCanModify(delivery);

        delivery.setLatitude(latitude);
        delivery.setLongitude(longitude);
        delivery.setLastLocationAt(LocalDateTime.now());

        delivery = deliveryRepository.save(delivery);

        return mapToResponse(delivery);
    }

    // ------------------------------------------------------------------
    // Scoping helpers
    // ------------------------------------------------------------------

    /**
     * DELIVERY_BOY: own deliveries only.
     * SHOPKEEPER: deliveries for their own orders only.
     * Business roles: any delivery.
     */
    private void assertCanView(Delivery delivery) {

        User current = currentUserService.getCurrentUser();
        RoleName role = current.getRole().getName();

        // DELIVERY_BOY can view AVAILABLE deliveries (to accept them)
        // and their own assigned deliveries.
        if (role == RoleName.DELIVERY_BOY) {
            if (delivery.getDeliveryBoy() != null
                    && !delivery.getDeliveryBoy().getId().equals(current.getId())) {
                throw new RuntimeException("Delivery not found with id: " + delivery.getId());
            }
            // AVAILABLE deliveries with null deliveryBoy are viewable by all workers.
        }

        if (role == RoleName.SHOPKEEPER
                && !delivery.getOrder().getShopkeeper().getId().equals(current.getId())) {
            throw new RuntimeException("Delivery not found with id: " + delivery.getId());
        }
    }

    /**
     * DELIVERY_BOY: may update their own deliveries only.
     * SHOPKEEPER may never modify a delivery.
     * Business roles may modify any delivery.
     */
    private void assertCanModify(Delivery delivery) {

        User current = currentUserService.getCurrentUser();
        RoleName role = current.getRole().getName();

        if (role == RoleName.DELIVERY_BOY) {
            // Must have an assigned delivery boy and it must be the current user.
            if (delivery.getDeliveryBoy() == null
                    || !delivery.getDeliveryBoy().getId().equals(current.getId())) {
                throw new RuntimeException("Delivery not found with id: " + delivery.getId());
            }
        }

        if (role == RoleName.SHOPKEEPER) {
            throw new RuntimeException("You are not allowed to modify this delivery");
        }
    }

    private DeliveryStatus parseDeliveryStatus(String status) {
        try {
            return DeliveryStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid delivery status: " + status);
        }
    }

    // --- Automatic delivery workflow ---

    @Override
    public List<DeliveryResponse> getAvailableDeliveries() {
        return deliveryRepository.findAvailableDeliveries()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DeliveryResponse acceptDelivery(Long deliveryId) {

        User current = currentUserService.getCurrentUser();

        // Only DELIVERY_BOY can accept.
        if (current.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("Only delivery workers can accept deliveries");
        }

        // Disabled workers cannot accept.
        if (!Boolean.TRUE.equals(current.getEnabled())) {
            throw new RuntimeException("Your account is disabled");
        }

        // Atomic pessimistic lock — only one transaction wins.
        Delivery delivery = deliveryRepository.findByIdWithLock(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + deliveryId));

        // Must be AVAILABLE with no worker assigned.
        if (delivery.getDeliveryStatus() != DeliveryStatus.AVAILABLE) {
            throw new RuntimeException("This delivery is no longer available");
        }
        if (delivery.getDeliveryBoy() != null) {
            throw new RuntimeException("This delivery has already been accepted by another worker");
        }

        // Atomically assign.
        delivery.setDeliveryBoy(current);
        delivery.setDeliveryStatus(DeliveryStatus.ASSIGNED);
        delivery.setAssignedAt(LocalDateTime.now());

        delivery = deliveryRepository.save(delivery);

        // Sync order lifecycle.
        delivery.getOrder().transitionTo(OrderStatus.ASSIGNED);
        orderRepository.save(delivery.getOrder());

        // Notify.
        notificationService.notifyDeliveryAssigned(delivery);

        auditService.log("DELIVERY_ACCEPT", "Delivery", delivery.getId(),
                "Order " + delivery.getOrder().getOrderNumber()
                        + " accepted by delivery boy " + current.getFullName());

        return mapToResponse(delivery);
    }

    @Override
    @Transactional
    public DeliveryResponse emergencyReassign(Long deliveryId) {

        User current = currentUserService.getCurrentUser();
        RoleName role = current.getRole().getName();

        // Only admin/distributor roles can emergency reassign.
        if (role != RoleName.SUPER_ADMIN && role != RoleName.OWNER && role != RoleName.MANAGER) {
            throw new RuntimeException("Only administrators can perform emergency reassignment");
        }

        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found with id: " + deliveryId));

        // Can only reassign ASSIGNED deliveries that haven't started.
        if (delivery.getDeliveryStatus() != DeliveryStatus.ASSIGNED) {
            throw new RuntimeException("Emergency reassignment is only available for ASSIGNED deliveries");
        }

        User previousWorker = delivery.getDeliveryBoy();

        // Move back to AVAILABLE.
        delivery.setDeliveryBoy(null);
        delivery.setDeliveryStatus(DeliveryStatus.AVAILABLE);
        delivery.setAvailableAt(LocalDateTime.now());
        delivery.setAssignedAt(null);

        delivery = deliveryRepository.save(delivery);

        // Sync order lifecycle — order goes back to APPROVED.
        delivery.getOrder().transitionTo(OrderStatus.APPROVED);
        orderRepository.save(delivery.getOrder());

        String workerName = previousWorker != null ? previousWorker.getFullName() : "unknown";
        auditService.log("DELIVERY_EMERGENCY_REASSIGN", "Delivery", delivery.getId(),
                "Order " + delivery.getOrder().getOrderNumber()
                        + " emergency reassignment from worker " + workerName
                        + " by " + current.getFullName());

        return mapToResponse(delivery);
    }

    private DeliveryResponse mapToResponse(Delivery delivery) {

        return DeliveryResponse.builder()
                .id(delivery.getId())
                .orderId(delivery.getOrder().getId())
                .orderNumber(delivery.getOrder().getOrderNumber())
                .deliveryBoyId(delivery.getDeliveryBoy() != null ? delivery.getDeliveryBoy().getId() : null)
                .deliveryBoyName(delivery.getDeliveryBoy() != null ? delivery.getDeliveryBoy().getFullName() : null)
                .shopkeeperId(delivery.getOrder().getShopkeeper().getId())
                .shopkeeperName(delivery.getOrder().getShopkeeper().getFullName())
                .shopkeeperPhone(delivery.getOrder().getShopkeeper().getPhone())
                .orderTotalAmount(delivery.getOrder().getTotalAmount())
                .deliveryStatus(delivery.getDeliveryStatus())
                .failureReason(delivery.getFailureReason())
                .orderStatus(delivery.getOrder().getStatus())
                .deliveryAddress(delivery.getDeliveryAddress())
                .vehicleNumber(delivery.getVehicleNumber())
                .latitude(delivery.getLatitude())
                .longitude(delivery.getLongitude())
                .lastLocationAt(delivery.getLastLocationAt())
                .availableAt(delivery.getAvailableAt())
                .assignedAt(delivery.getAssignedAt())
                .deliveredAt(delivery.getDeliveredAt())
                .build();
    }
}
