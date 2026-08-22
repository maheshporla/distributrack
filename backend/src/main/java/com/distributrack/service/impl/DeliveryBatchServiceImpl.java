package com.distributrack.service.impl;

import com.distributrack.dto.request.CreateDeliveryBatchRequest;
import com.distributrack.dto.response.*;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.DeliveryBatch;
import com.distributrack.entity.Order;
import com.distributrack.entity.OrderItem;
import com.distributrack.entity.User;
import com.distributrack.enums.*;
import com.distributrack.repository.DeliveryBatchRepository;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.OrderRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.DeliveryBatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryBatchServiceImpl implements DeliveryBatchService {

    private final DeliveryBatchRepository deliveryBatchRepository;
    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

    private static final DateTimeFormatter BATCH_NUMBER_FMT =
            DateTimeFormatter.ofPattern("'BATCH-'yyyyMMdd'-'HHmmss");

    // ===================================================================
    // Preview eligible orders in an area
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public EligibleOrdersResponse previewEligibleOrders(
            String areaName,
            BigDecimal centerLat,
            BigDecimal centerLng,
            BigDecimal radiusKm) {

        // Find all deliveries that are eligible:
        // - AVAILABLE (not yet accepted) or ASSIGNED (assigned but not started)
        // - Not part of an existing batch
        // - Shopkeeper within the radius from center
        List<Delivery> allDeliveries = deliveryRepository.findAll();
        double radius = radiusKm.doubleValue();
        double centerLatD = centerLat.doubleValue();
        double centerLngD = centerLng.doubleValue();

        // Filter by area and eligibility
        List<Delivery> eligible = allDeliveries.stream()
                .filter(d -> {
                    // Must not be in an existing active batch
                    if (d.getDeliveryBatch() != null) return false;

                    // Must be AVAILABLE or ASSIGNED (not yet started delivery)
                    if (d.getDeliveryStatus() != DeliveryStatus.AVAILABLE
                            && d.getDeliveryStatus() != DeliveryStatus.ASSIGNED) {
                        return false;
                    }

                    // Order must be in a deliverable status
                    OrderStatus os = d.getOrder().getStatus();
                    if (os != OrderStatus.APPROVED && os != OrderStatus.ASSIGNED
                            && os != OrderStatus.OUT_FOR_DELIVERY) {
                        return false;
                    }

                    // Shopkeeper must have coordinates
                    User shopkeeper = d.getOrder().getShopkeeper();
                    if (shopkeeper.getLatitude() == null || shopkeeper.getLongitude() == null) {
                        return false;
                    }

                    // Check distance from center
                    double dist = haversineKm(
                            centerLatD, centerLngD,
                            shopkeeper.getLatitude(), shopkeeper.getLongitude());
                    return dist <= radius;
                })
                .toList();

        // Group by shopkeeper for shop-wise summary
        Map<Long, List<Delivery>> byShopkeeper = eligible.stream()
                .collect(Collectors.groupingBy(d -> d.getOrder().getShopkeeper().getId()));

        List<EligibleShopPreview> shops = new ArrayList<>();
        int totalProducts = 0;
        BigDecimal totalBill = BigDecimal.ZERO;

        for (Map.Entry<Long, List<Delivery>> entry : byShopkeeper.entrySet()) {
            User shopkeeper = null;
            List<EligibleOrderPreview> orderPreviews = new ArrayList<>();
            int shopProducts = 0;
            BigDecimal shopBill = BigDecimal.ZERO;

            for (Delivery delivery : entry.getValue()) {
                Order order = delivery.getOrder();
                if (shopkeeper == null) shopkeeper = order.getShopkeeper();

                int orderProducts = order.getOrderItems().stream()
                        .mapToInt(OrderItem::getQuantity).sum();

                orderPreviews.add(EligibleOrderPreview.builder()
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .totalAmount(order.getTotalAmount())
                        .productCount(orderProducts)
                        .status(order.getStatus().name())
                        .build());

                shopProducts += orderProducts;
                shopBill = shopBill.add(order.getTotalAmount());
            }

            double dist = haversineKm(
                    centerLatD, centerLngD,
                    shopkeeper.getLatitude(), shopkeeper.getLongitude());

            shops.add(EligibleShopPreview.builder()
                    .shopkeeperId(shopkeeper.getId())
                    .shopName(shopkeeper.getShopName())
                    .shopkeeperName(shopkeeper.getFullName())
                    .deliveryAddress(shopkeeper.getAddress())
                    .latitude(shopkeeper.getLatitude())
                    .longitude(shopkeeper.getLongitude())
                    .distanceFromCenterKm(Math.round(dist * 100.0) / 100.0)
                    .orders(orderPreviews)
                    .totalProducts(shopProducts)
                    .totalBill(shopBill)
                    .build());

            totalProducts += shopProducts;
            totalBill = totalBill.add(shopBill);
        }

        return EligibleOrdersResponse.builder()
                .areaName(areaName)
                .centerLatitude(centerLat)
                .centerLongitude(centerLng)
                .radiusKm(radiusKm)
                .totalEligibleOrders(eligible.size())
                .totalShops(shops.size())
                .totalProducts(totalProducts)
                .totalBill(totalBill)
                .shops(shops)
                .build();
    }

    // ===================================================================
    // Create a delivery batch
    // ===================================================================

    @Override
    @Transactional
    public DeliveryBatchResponse createDeliveryBatch(CreateDeliveryBatchRequest request) {

        User current = currentUserService.getCurrentUser();

        // Validate delivery boy exists and is a DELIVERY_BOY
        User deliveryBoy = userRepository.findById(request.getDeliveryBoyId())
                .orElseThrow(() -> new RuntimeException("Delivery boy not found"));

        if (deliveryBoy.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("Selected user is not a delivery boy");
        }

        if (!Boolean.TRUE.equals(deliveryBoy.getEnabled())) {
            throw new RuntimeException("Selected delivery boy is disabled");
        }

        // Check if delivery boy already has an active batch
        List<DeliveryBatchStatus> activeStatuses = List.of(
                DeliveryBatchStatus.PENDING, DeliveryBatchStatus.IN_PROGRESS);
        if (deliveryBatchRepository.existsByDeliveryBoyAndStatusIn(deliveryBoy, activeStatuses)) {
            throw new RuntimeException(
                    "Delivery boy already has an active batch. Complete or cancel it first.");
        }

        // Find eligible deliveries within area
        List<Delivery> allDeliveries = deliveryRepository.findAll();
        double radius = request.getRadiusKm().doubleValue();
        double centerLatD = request.getCenterLatitude().doubleValue();
        double centerLngD = request.getCenterLongitude().doubleValue();

        List<Delivery> eligible = allDeliveries.stream()
                .filter(d -> {
                    if (d.getDeliveryBatch() != null) return false;
                    if (d.getDeliveryStatus() != DeliveryStatus.AVAILABLE
                            && d.getDeliveryStatus() != DeliveryStatus.ASSIGNED) {
                        return false;
                    }
                    OrderStatus os = d.getOrder().getStatus();
                    if (os != OrderStatus.APPROVED && os != OrderStatus.ASSIGNED
                            && os != OrderStatus.OUT_FOR_DELIVERY) {
                        return false;
                    }
                    User shopkeeper = d.getOrder().getShopkeeper();
                    if (shopkeeper.getLatitude() == null || shopkeeper.getLongitude() == null) {
                        return false;
                    }
                    double dist = haversineKm(
                            centerLatD, centerLngD,
                            shopkeeper.getLatitude(), shopkeeper.getLongitude());
                    return dist <= radius;
                })
                .toList();

        if (eligible.isEmpty()) {
            throw new RuntimeException("No eligible orders found in the specified area");
        }

        // Create the batch
        String batchNumber = LocalDateTime.now().format(BATCH_NUMBER_FMT)
                + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();

        DeliveryBatch batch = DeliveryBatch.builder()
                .batchNumber(batchNumber)
                .areaName(request.getAreaName().trim())
                .centerLatitude(request.getCenterLatitude())
                .centerLongitude(request.getCenterLongitude())
                .radiusKm(request.getRadiusKm())
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        // Set warehouse if provided
        if (request.getWarehouseId() != null) {
            // Warehouse lookup would go here if we inject WarehouseRepository
            // For now, skip if not provided
        }

        batch = deliveryBatchRepository.save(batch);

        // Assign all eligible deliveries to this batch
        for (Delivery delivery : eligible) {
            delivery.setDeliveryBatch(batch);

            // Also assign the delivery boy if not already assigned
            if (delivery.getDeliveryBoy() == null) {
                delivery.setDeliveryBoy(deliveryBoy);
                delivery.setDeliveryStatus(DeliveryStatus.ASSIGNED);
                delivery.setAssignedAt(LocalDateTime.now());

                // Sync order lifecycle
                Order order = delivery.getOrder();
                if (order.getStatus() == OrderStatus.APPROVED) {
                    order.transitionTo(OrderStatus.ASSIGNED);
                    orderRepository.save(order);
                }
            }
        }
        deliveryRepository.saveAll(eligible);

        log.info("[BATCH] Created batch {} for area '{}' with {} deliveries assigned to {}",
                batchNumber, request.getAreaName(), eligible.size(), deliveryBoy.getFullName());

        auditService.log("DELIVERY_BATCH_CREATE", "DeliveryBatch", batch.getId(),
                "Batch " + batchNumber + " created for area '" + request.getAreaName()
                        + "' with " + eligible.size() + " deliveries assigned to "
                        + deliveryBoy.getFullName());

        return buildBatchResponse(batch, eligible);
    }

    // ===================================================================
    // Get all batches (admin)
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryBatchResponse> getAllBatches() {
        List<DeliveryBatch> batches = deliveryBatchRepository
                .findAll(Sort.by(Sort.Direction.DESC, "assignedAt"));

        return batches.stream()
                .map(this::buildBatchResponseFromBatch)
                .collect(Collectors.toList());
    }

    // ===================================================================
    // Get batch by ID with full breakdown
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public DeliveryBatchResponse getBatchById(Long batchId) {
        DeliveryBatch batch = deliveryBatchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Delivery batch not found: " + batchId));

        User current = currentUserService.getCurrentUser();

        // Delivery boys can only view their own batches
        if (current.getRole().getName() == RoleName.DELIVERY_BOY
                && !batch.getDeliveryBoy().getId().equals(current.getId())) {
            throw new RuntimeException("Access denied: this is not your batch");
        }

        return buildBatchResponseFromBatch(batch);
    }

    // ===================================================================
    // Delivery boy: get my active batch
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public DeliveryBatchResponse getMyActiveBatch() {
        User current = currentUserService.getCurrentUser();

        List<DeliveryBatchStatus> activeStatuses = List.of(
                DeliveryBatchStatus.PENDING, DeliveryBatchStatus.IN_PROGRESS);

        Optional<DeliveryBatch> activeBatch = deliveryBatchRepository
                .findByDeliveryBoyAndStatusIn(current, activeStatuses)
                .stream()
                .findFirst();

        if (activeBatch.isEmpty()) {
            return null;
        }

        return buildBatchResponseFromBatch(activeBatch.get());
    }

    // ===================================================================
    // Delivery boy: get all my batches
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryBatchResponse> getMyBatches() {
        User current = currentUserService.getCurrentUser();
        List<DeliveryBatch> batches = deliveryBatchRepository
                .findByDeliveryBoyOrderByAssignedAtDesc(current);

        return batches.stream()
                .map(this::buildBatchResponseFromBatch)
                .collect(Collectors.toList());
    }

    // ===================================================================
    // Start batch (delivery boy begins route)
    // ===================================================================

    @Override
    @Transactional
    public DeliveryBatchResponse startBatch(Long batchId) {
        User current = currentUserService.getCurrentUser();

        DeliveryBatch batch = deliveryBatchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Delivery batch not found: " + batchId));

        if (!batch.getDeliveryBoy().getId().equals(current.getId())) {
            throw new RuntimeException("Only the assigned delivery boy can start this batch");
        }

        if (batch.getStatus() != DeliveryBatchStatus.PENDING) {
            throw new RuntimeException("Batch can only be started from PENDING status");
        }

        batch.setStatus(DeliveryBatchStatus.IN_PROGRESS);
        batch.setStartedAt(LocalDateTime.now());
        batch = deliveryBatchRepository.save(batch);

        log.info("[BATCH] Batch {} started by {}", batch.getBatchNumber(), current.getFullName());

        return buildBatchResponseFromBatch(batch);
    }

    // ===================================================================
    // Complete batch
    // ===================================================================

    @Override
    @Transactional
    public DeliveryBatchResponse completeBatch(Long batchId) {
        DeliveryBatch batch = deliveryBatchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Delivery batch not found: " + batchId));

        batch.setStatus(DeliveryBatchStatus.COMPLETED);
        batch.setCompletedAt(LocalDateTime.now());
        batch = deliveryBatchRepository.save(batch);

        log.info("[BATCH] Batch {} completed", batch.getBatchNumber());

        return buildBatchResponseFromBatch(batch);
    }

    // ===================================================================
    // Response building helpers
    // ===================================================================

    private DeliveryBatchResponse buildBatchResponseFromBatch(DeliveryBatch batch) {
        List<Delivery> deliveries = deliveryRepository.findByDeliveryBatch(batch);
        return buildBatchResponse(batch, deliveries);
    }

    private DeliveryBatchResponse buildBatchResponse(DeliveryBatch batch, List<Delivery> deliveries) {

        // Gather all orders and compute summaries
        Map<Long, List<Delivery>> byShopkeeper = deliveries.stream()
                .collect(Collectors.groupingBy(d -> d.getOrder().getShopkeeper().getId()));

        int totalOrders = deliveries.size();
        int totalShops = byShopkeeper.size();
        int totalProducts = 0;
        int deliveredProducts = 0;
        int failedProducts = 0;
        BigDecimal totalBill = BigDecimal.ZERO;
        BigDecimal deliveredAmount = BigDecimal.ZERO;
        BigDecimal failedAmount = BigDecimal.ZERO;

        List<DeliveryBatchShopSummary> shopSummaries = new ArrayList<>();

        for (Map.Entry<Long, List<Delivery>> entry : byShopkeeper.entrySet()) {
            User shopkeeper = entry.getValue().get(0).getOrder().getShopkeeper();
            DeliveryBatchShopSummary shopSummary = buildShopSummary(
                    shopkeeper, entry.getValue());
            shopSummaries.add(shopSummary);

            totalProducts += shopSummary.getTotalProducts();
            deliveredProducts += shopSummary.getDeliveredProducts();
            failedProducts += shopSummary.getFailedProducts();
            totalBill = totalBill.add(shopSummary.getTotalBill());
            deliveredAmount = deliveredAmount.add(shopSummary.getDeliveredAmount());
            failedAmount = failedAmount.add(shopSummary.getFailedAmount());
        }

        User deliveryBoy = batch.getDeliveryBoy();

        return DeliveryBatchResponse.builder()
                .id(batch.getId())
                .batchNumber(batch.getBatchNumber())
                .areaName(batch.getAreaName())
                .centerLatitude(batch.getCenterLatitude())
                .centerLongitude(batch.getCenterLongitude())
                .radiusKm(batch.getRadiusKm())
                .deliveryBoyId(deliveryBoy.getId())
                .deliveryBoyName(deliveryBoy.getFullName())
                .deliveryBoyPhone(deliveryBoy.getPhone())
                .deliveryBoyVehicleType(deliveryBoy.getVehicleType())
                .deliveryBoyVehicleNumber(deliveryBoy.getVehicleNumber())
                .warehouseId(batch.getWarehouse() != null ? batch.getWarehouse().getId() : null)
                .warehouseName(batch.getWarehouse() != null ? batch.getWarehouse().getWarehouseName() : null)
                .status(batch.getStatus())
                .assignedAt(batch.getAssignedAt())
                .startedAt(batch.getStartedAt())
                .completedAt(batch.getCompletedAt())
                .totalOrders(totalOrders)
                .totalShops(totalShops)
                .totalProducts(totalProducts)
                .deliveredProducts(deliveredProducts)
                .failedProducts(failedProducts)
                .remainingProducts(totalProducts - deliveredProducts - failedProducts)
                .totalBill(totalBill)
                .deliveredAmount(deliveredAmount)
                .failedAmount(failedAmount)
                .shopSummaries(shopSummaries)
                .build();
    }

    private DeliveryBatchShopSummary buildShopSummary(User shopkeeper, List<Delivery> deliveries) {
        int totalProducts = 0;
        int deliveredProducts = 0;
        int failedProducts = 0;
        BigDecimal totalBill = BigDecimal.ZERO;
        BigDecimal deliveredAmount = BigDecimal.ZERO;
        BigDecimal failedAmount = BigDecimal.ZERO;

        List<DeliveryBatchDeliverySummary> deliverySummaries = new ArrayList<>();

        for (Delivery delivery : deliveries) {
            DeliveryBatchDeliverySummary ds = buildDeliverySummary(delivery);
            deliverySummaries.add(ds);

            totalProducts += ds.getTotalProducts();
            deliveredProducts += ds.getDeliveredProducts();
            failedProducts += ds.getFailedProducts();
            totalBill = totalBill.add(ds.getBillAmount());
            deliveredAmount = deliveredAmount.add(ds.getDeliveredAmount());
            failedAmount = failedAmount.add(ds.getFailedAmount());
        }

        int remaining = totalProducts - deliveredProducts - failedProducts;
        String status;
        if (deliveredProducts == totalProducts) {
            status = "DELIVERED";
        } else if (failedProducts == totalProducts && totalProducts > 0) {
            status = "FAILED";
        } else if (deliveredProducts > 0 || failedProducts > 0) {
            status = "PARTIAL";
        } else {
            status = "PENDING";
        }

        return DeliveryBatchShopSummary.builder()
                .shopkeeperId(shopkeeper.getId())
                .shopName(shopkeeper.getShopName())
                .shopkeeperName(shopkeeper.getFullName())
                .deliveryAddress(shopkeeper.getAddress())
                .latitude(shopkeeper.getLatitude())
                .longitude(shopkeeper.getLongitude())
                .orderCount(deliveries.size())
                .totalProducts(totalProducts)
                .deliveredProducts(deliveredProducts)
                .failedProducts(failedProducts)
                .remainingProducts(remaining)
                .totalBill(totalBill)
                .deliveredAmount(deliveredAmount)
                .failedAmount(failedAmount)
                .status(status)
                .deliveries(deliverySummaries)
                .build();
    }

    private DeliveryBatchDeliverySummary buildDeliverySummary(Delivery delivery) {
        Order order = delivery.getOrder();
        int totalProducts = 0;
        int deliveredProducts = 0;
        int failedProducts = 0;
        BigDecimal deliveredAmount = BigDecimal.ZERO;
        BigDecimal failedAmount = BigDecimal.ZERO;

        List<DeliveryBatchItemSummary> items = new ArrayList<>();

        for (OrderItem item : order.getOrderItems()) {
            // For now, all ordered = pending delivery
            // Delivered/failed quantities come from actual delivery tracking
            int ordered = item.getQuantity();
            int delivered = 0;
            int failed = 0;

            // If delivery is DELIVERED, all products are delivered
            if (delivery.getDeliveryStatus() == DeliveryStatus.DELIVERED) {
                delivered = ordered;
            }
            // If delivery is FAILED, all products are failed
            else if (delivery.getDeliveryStatus() == DeliveryStatus.FAILED) {
                failed = ordered;
            }

            int remaining = ordered - delivered - failed;
            BigDecimal itemDeliveredAmt = item.getPrice().multiply(BigDecimal.valueOf(delivered));
            BigDecimal itemFailedAmt = item.getPrice().multiply(BigDecimal.valueOf(failed));

            items.add(DeliveryBatchItemSummary.builder()
                    .productId(item.getProduct().getId())
                    .productName(item.getProduct().getProductName())
                    .category(item.getProduct().getCategory())
                    .orderedQuantity(ordered)
                    .deliveredQuantity(delivered)
                    .failedQuantity(failed)
                    .unitPrice(item.getPrice())
                    .subtotal(item.getSubtotal())
                    .build());

            totalProducts += ordered;
            deliveredProducts += delivered;
            failedProducts += failed;
            deliveredAmount = deliveredAmount.add(itemDeliveredAmt);
            failedAmount = failedAmount.add(itemFailedAmt);
        }

        return DeliveryBatchDeliverySummary.builder()
                .deliveryId(delivery.getId())
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .deliveryStatus(delivery.getDeliveryStatus())
                .orderStatus(order.getStatus())
                .totalProducts(totalProducts)
                .deliveredProducts(deliveredProducts)
                .failedProducts(failedProducts)
                .remainingProducts(totalProducts - deliveredProducts - failedProducts)
                .billAmount(order.getTotalAmount())
                .deliveredAmount(deliveredAmount)
                .failedAmount(failedAmount)
                .deliveryAddress(delivery.getDeliveryAddress())
                .assignedAt(delivery.getAssignedAt())
                .deliveredAt(delivery.getDeliveredAt())
                .items(items)
                .build();
    }

    // ===================================================================
    // Haversine formula — distance between two lat/lng points in km
    // ===================================================================

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0; // Earth radius in km
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
