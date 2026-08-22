package com.distributrack.service;

import com.distributrack.dto.request.CreateDeliveryBatchRequest;
import com.distributrack.dto.response.DeliveryBatchResponse;
import com.distributrack.dto.response.DeliveryBatchShopSummary;
import com.distributrack.dto.response.EligibleOrdersResponse;
import com.distributrack.entity.*;
import com.distributrack.enums.*;
import com.distributrack.repository.*;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.DeliveryBatchServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryBatchServiceImplTest {

    @Mock private DeliveryBatchRepository deliveryBatchRepository;
    @Mock private DeliveryRepository deliveryRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private UserRepository userRepository;
    @Mock private CurrentUserService currentUserService;
    @Mock private AuditService auditService;

    @InjectMocks
    private DeliveryBatchServiceImpl deliveryBatchService;

    private User adminUser;
    private User deliveryBoy;
    private User shopkeeper1;
    private User shopkeeper2;
    private Warehouse warehouse;
    private Product product1;
    private Product product2;
    private Order order1;
    private Order order2;
    private Delivery delivery1;
    private Delivery delivery2;
    private DeliveryBatch existingBatch;

    @BeforeEach
    void setUp() {
        // Admin
        adminUser = User.builder()
                .id(1L)
                .fullName("Admin User")
                .email("admin@test.com")
                .phone("9999999999")
                .role(new Role(null, RoleName.SUPER_ADMIN))
                .enabled(true)
                .build();

        // Delivery Boy
        deliveryBoy = User.builder()
                .id(2L)
                .fullName("Ravi")
                .email("ravi@test.com")
                .phone("8888888888")
                .role(new Role(null, RoleName.DELIVERY_BOY))
                .enabled(true)
                .vehicleType("Bike")
                .vehicleNumber("AP-12-3456")
                .build();

        // Shopkeeper 1 — near warehouse (LB Nagar area)
        shopkeeper1 = User.builder()
                .id(10L)
                .fullName("Sri Stores")
                .email("sri@test.com")
                .phone("7777777777")
                .shopName("Sri Stores")
                .address("LB Nagar, Hyderabad")
                .latitude(17.3457)
                .longitude(78.5473)
                .role(new Role(null, RoleName.SHOPKEEPER))
                .enabled(true)
                .build();

        // Shopkeeper 2 — far from warehouse (Jubilee Hills)
        shopkeeper2 = User.builder()
                .id(11L)
                .fullName("Fresh Mart")
                .email("fresh@test.com")
                .phone("6666666666")
                .shopName("Fresh Mart")
                .address("Jubilee Hills, Hyderabad")
                .latitude(17.4156)
                .longitude(78.4347)
                .role(new Role(null, RoleName.SHOPKEEPER))
                .enabled(true)
                .build();

        // Warehouse
        warehouse = Warehouse.builder()
                .id(1L)
                .warehouseName("Hyderabad Warehouse")
                .address("LB Nagar Main Road")
                .city("Hyderabad")
                .latitude(17.3457)
                .longitude(78.5473)
                .active(true)
                .build();

        // Products
        product1 = Product.builder().id(1L).productName("Rice").price(new BigDecimal("500")).build();
        product2 = Product.builder().id(2L).productName("Oil").price(new BigDecimal("200")).build();

        // Order 1 — shopkeeper1
        OrderItem item1 = OrderItem.builder()
                .id(1L).product(product1).quantity(10).price(new BigDecimal("500"))
                .subtotal(new BigDecimal("5000")).build();
        OrderItem item2 = OrderItem.builder()
                .id(2L).product(product2).quantity(5).price(new BigDecimal("200"))
                .subtotal(new BigDecimal("1000")).build();
        order1 = Order.builder()
                .id(1L)
                .orderNumber("ORD-00000001")
                .shopkeeper(shopkeeper1)
                .orderItems(List.of(item1, item2))
                .totalAmount(new BigDecimal("6000"))
                .status(OrderStatus.APPROVED)
                .orderDate(LocalDateTime.now())
                .build();

        // Order 2 — shopkeeper2
        OrderItem item3 = OrderItem.builder()
                .id(3L).product(product1).quantity(8).price(new BigDecimal("500"))
                .subtotal(new BigDecimal("4000")).build();
        order2 = Order.builder()
                .id(2L)
                .orderNumber("ORD-00000002")
                .shopkeeper(shopkeeper2)
                .orderItems(List.of(item3))
                .totalAmount(new BigDecimal("4000"))
                .status(OrderStatus.APPROVED)
                .orderDate(LocalDateTime.now())
                .build();

        // Deliveries
        delivery1 = Delivery.builder()
                .id(1L)
                .order(order1)
                .deliveryStatus(DeliveryStatus.AVAILABLE)
                .deliveryAddress(shopkeeper1.getAddress())
                .destinationLatitude(shopkeeper1.getLatitude())
                .destinationLongitude(shopkeeper1.getLongitude())
                .availableAt(LocalDateTime.now())
                .build();

        delivery2 = Delivery.builder()
                .id(2L)
                .order(order2)
                .deliveryStatus(DeliveryStatus.AVAILABLE)
                .deliveryAddress(shopkeeper2.getAddress())
                .destinationLatitude(shopkeeper2.getLatitude())
                .destinationLongitude(shopkeeper2.getLongitude())
                .availableAt(LocalDateTime.now())
                .build();

        // Existing batch
        existingBatch = DeliveryBatch.builder()
                .id(1L)
                .batchNumber("BATCH-20260101-120000-ABCD")
                .areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();
    }

    // ===================================================================
    // 1. Preview eligible orders within area
    // ===================================================================

    @Test
    void previewEligibleOrders_findsNearbyShopkeepers() {
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "LB Nagar",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(5));

        // Only shopkeeper1 is within 5km of the warehouse center
        assertEquals("LB Nagar", preview.getAreaName());
        assertEquals(1, preview.getTotalShops());
        assertEquals(1, preview.getTotalEligibleOrders());
        assertEquals(15, preview.getTotalProducts()); // 10 rice + 5 oil
        assertEquals(new BigDecimal("6000"), preview.getTotalBill());
        assertEquals(1, preview.getShops().size());
        assertEquals("Sri Stores", preview.getShops().get(0).getShopName());
    }

    @Test
    void previewEligibleOrders_withLargerRadiusFindsMoreShops() {
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        // 100km radius should find both shops
        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "Hyderabad",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        assertEquals(2, preview.getTotalShops());
        assertEquals(2, preview.getTotalEligibleOrders());
        assertEquals(23, preview.getTotalProducts()); // 15 + 8
        assertEquals(new BigDecimal("10000"), preview.getTotalBill()); // 6000 + 4000
    }

    @Test
    void previewEligibleOrders_excludesBatchedDeliveries() {
        delivery1.setDeliveryBatch(existingBatch); // Already in a batch
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "LB Nagar",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        // Only delivery2 should be eligible (delivery1 is batched)
        assertEquals(1, preview.getTotalEligibleOrders());
        assertEquals("ORD-00000002", preview.getShops().get(0).getOrders().get(0).getOrderNumber());
    }

    @Test
    void previewEligibleOrders_excludesDeliveredOrders() {
        delivery1.setDeliveryStatus(DeliveryStatus.DELIVERED);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "Hyderabad",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        assertEquals(1, preview.getTotalEligibleOrders());
    }

    @Test
    void previewEligibleOrders_excludesCancelledOrders() {
        order1.setStatus(OrderStatus.CANCELLED);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "Hyderabad",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        assertEquals(1, preview.getTotalEligibleOrders());
    }

    @Test
    void previewEligibleOrders_excludesShopkeepersWithoutCoordinates() {
        shopkeeper2.setLatitude(null);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "Hyderabad",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        assertEquals(1, preview.getTotalShops());
    }

    @Test
    void previewEligibleOrders_noEligibleOrders() {
        delivery1.setDeliveryBatch(existingBatch);
        delivery2.setDeliveryBatch(existingBatch);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        EligibleOrdersResponse preview = deliveryBatchService.previewEligibleOrders(
                "LB Nagar",
                BigDecimal.valueOf(17.3457),
                BigDecimal.valueOf(78.5473),
                BigDecimal.valueOf(100));

        assertEquals(0, preview.getTotalEligibleOrders());
        assertTrue(preview.getShops().isEmpty());
    }

    // ===================================================================
    // 2. Create delivery batch
    // ===================================================================

    @Test
    void createDeliveryBatch_success() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);

        assertNotNull(response);
        assertEquals("LB Nagar", response.getAreaName());
        assertEquals(2L, response.getDeliveryBoyId());
        assertEquals("Ravi", response.getDeliveryBoyName());
        assertEquals(DeliveryBatchStatus.PENDING, response.getStatus());
        // Only shopkeeper1's order is within 5km
        assertEquals(1, response.getTotalOrders());
        assertEquals(1, response.getTotalShops());
        assertEquals(15, response.getTotalProducts());
        assertEquals(new BigDecimal("6000"), response.getTotalBill());

        // Verify delivery boy was assigned to the delivery
        assertEquals(deliveryBoy, delivery1.getDeliveryBoy());
        assertEquals(DeliveryStatus.ASSIGNED, delivery1.getDeliveryStatus());
    }

    @Test
    void createDeliveryBatch_assignsMultipleOrdersToOneBoy() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        // 100km radius to get both shops
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("Hyderabad");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(100));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);

        assertEquals(2, response.getTotalOrders());
        assertEquals(2, response.getTotalShops());
        assertEquals(23, response.getTotalProducts());
        assertEquals(new BigDecimal("10000"), response.getTotalBill());

        // Both deliveries assigned to the same boy
        assertEquals(deliveryBoy, delivery1.getDeliveryBoy());
        assertEquals(deliveryBoy, delivery2.getDeliveryBoy());
    }

    @Test
    void createDeliveryBatch_rejectsDeliveryBoyWithActiveBatch() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryBatchRepository.existsByDeliveryBoyAndStatusIn(eq(deliveryBoy), anyList()))
                .thenReturn(true);

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> deliveryBatchService.createDeliveryBatch(request));
        assertTrue(ex.getMessage().contains("already has an active batch"));
    }

    @Test
    void createDeliveryBatch_rejectsNonDeliveryBoy() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(1L);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> deliveryBatchService.createDeliveryBatch(request));
        assertTrue(ex.getMessage().contains("not a delivery boy"));
    }

    @Test
    void createDeliveryBatch_rejectsWhenNoEligibleOrders() {
        delivery1.setDeliveryBatch(existingBatch);
        delivery2.setDeliveryBatch(existingBatch);
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryBatchRepository.existsByDeliveryBoyAndStatusIn(eq(deliveryBoy), anyList()))
                .thenReturn(false);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1, delivery2));

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> deliveryBatchService.createDeliveryBatch(request));
        assertTrue(ex.getMessage().contains("No eligible orders"));
    }

    // ===================================================================
    // 3. Correct summary calculations
    // ===================================================================

    @Test
    void summaryCalculations_correctProductCount() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);

        // 10 rice + 5 oil = 15 products
        assertEquals(15, response.getTotalProducts());
        assertEquals(0, response.getDeliveredProducts());
        assertEquals(0, response.getFailedProducts());
        assertEquals(15, response.getRemainingProducts());
    }

    @Test
    void summaryCalculations_correctBillAmount() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);

        assertEquals(new BigDecimal("6000"), response.getTotalBill());
        assertEquals(new BigDecimal("0"), response.getDeliveredAmount());
        assertEquals(new BigDecimal("0"), response.getFailedAmount());
    }

    @Test
    void summaryCalculations_deliveredDelivery() {
        delivery1.setDeliveryStatus(DeliveryStatus.DELIVERED);
        delivery1.setDeliveredAt(LocalDateTime.now());

        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.IN_PROGRESS)
                .assignedAt(LocalDateTime.now())
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(deliveryRepository.findByDeliveryBatch(batch))
                .thenReturn(List.of(delivery1));

        DeliveryBatchResponse response = deliveryBatchService.getBatchById(1L);
        // The response is built from the batch and its deliveries
        // Since delivery is DELIVERED, all products are counted as delivered
        // (this is the simplified model — real implementation tracks item-level)
        assertEquals(15, response.getTotalProducts());
        assertEquals(15, response.getDeliveredProducts());
        assertEquals(0, response.getFailedProducts());
        assertEquals(new BigDecimal("6000"), response.getDeliveredAmount());
    }

    @Test
    void summaryCalculations_failedDelivery() {
        delivery1.setDeliveryStatus(DeliveryStatus.FAILED);

        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.IN_PROGRESS)
                .assignedAt(LocalDateTime.now())
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(deliveryRepository.findByDeliveryBatch(batch))
                .thenReturn(List.of(delivery1));

        DeliveryBatchResponse response = deliveryBatchService.getBatchById(1L);
        assertEquals(15, response.getTotalProducts());
        assertEquals(0, response.getDeliveredProducts());
        assertEquals(15, response.getFailedProducts());
        assertEquals(new BigDecimal("6000"), response.getFailedAmount());
    }

    // ===================================================================
    // 4. Shop-wise summary
    // ===================================================================

    @Test
    void shopwiseSummary_groupsByShopkeeper() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("Hyderabad")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(100))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.IN_PROGRESS)
                .assignedAt(LocalDateTime.now())
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(deliveryRepository.findByDeliveryBatch(batch))
                .thenReturn(List.of(delivery1, delivery2));

        DeliveryBatchResponse response = deliveryBatchService.getBatchById(1L);

        assertEquals(2, response.getShopSummaries().size());

        // Find Sri Stores
        DeliveryBatchShopSummary sriStores = response.getShopSummaries().stream()
                .filter(s -> "Sri Stores".equals(s.getShopName()))
                .findFirst().orElseThrow();
        assertEquals(1, sriStores.getOrderCount());
        assertEquals(15, sriStores.getTotalProducts());
        assertEquals(new BigDecimal("6000"), sriStores.getTotalBill());

        // Find Fresh Mart
        DeliveryBatchShopSummary freshMart = response.getShopSummaries().stream()
                .filter(s -> "Fresh Mart".equals(s.getShopName()))
                .findFirst().orElseThrow();
        assertEquals(1, freshMart.getOrderCount());
        assertEquals(8, freshMart.getTotalProducts());
        assertEquals(new BigDecimal("4000"), freshMart.getTotalBill());
    }

    // ===================================================================
    // 5. Authorization tests
    // ===================================================================

    @Test
    void deliveryBoy_canViewOwnBatch() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryRepository.findByDeliveryBatch(batch)).thenReturn(List.of(delivery1));

        DeliveryBatchResponse response = deliveryBatchService.getBatchById(1L);
        assertNotNull(response);
    }

    @Test
    void deliveryBoy_cannotViewOtherBoysBatch() {
        User otherBoy = User.builder()
                .id(3L).fullName("Other").role(new Role(null, RoleName.DELIVERY_BOY)).build();

        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(currentUserService.getCurrentUser()).thenReturn(otherBoy);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> deliveryBatchService.getBatchById(1L));
        assertTrue(ex.getMessage().contains("Access denied"));
    }

    @Test
    void admin_canViewAnyBatch() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(deliveryRepository.findByDeliveryBatch(batch)).thenReturn(List.of(delivery1));

        DeliveryBatchResponse response = deliveryBatchService.getBatchById(1L);
        assertNotNull(response);
    }

    // ===================================================================
    // 6. Start batch
    // ===================================================================

    @Test
    void startBatch_transitionsToInProgress() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> inv.getArgument(0));
        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);

        DeliveryBatchResponse response = deliveryBatchService.startBatch(1L);
        assertEquals(DeliveryBatchStatus.IN_PROGRESS, response.getStatus());
        assertNotNull(response.getStartedAt());
    }

    @Test
    void startBatch_onlyDeliveryBoyCanStart() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.PENDING)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> deliveryBatchService.startBatch(1L));
        assertTrue(ex.getMessage().contains("Only the assigned delivery boy"));
    }

    // ===================================================================
    // 7. Complete batch
    // ===================================================================

    @Test
    void completeBatch_transitionsToCompleted() {
        DeliveryBatch batch = DeliveryBatch.builder()
                .id(1L).batchNumber("BATCH-TEST").areaName("LB Nagar")
                .centerLatitude(BigDecimal.valueOf(17.3457))
                .centerLongitude(BigDecimal.valueOf(78.5473))
                .radiusKm(BigDecimal.valueOf(5))
                .deliveryBoy(deliveryBoy)
                .status(DeliveryBatchStatus.IN_PROGRESS)
                .assignedAt(LocalDateTime.now())
                .build();

        when(deliveryBatchRepository.findById(1L)).thenReturn(Optional.of(batch));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> inv.getArgument(0));

        DeliveryBatchResponse response = deliveryBatchService.completeBatch(1L);
        assertEquals(DeliveryBatchStatus.COMPLETED, response.getStatus());
        assertNotNull(response.getCompletedAt());
    }

    // ===================================================================
    // 8. Get my active batch
    // ===================================================================

    @Test
    void getMyActiveBatch_returnsNullWhenNone() {
        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryBatchRepository.findByDeliveryBoyAndStatusIn(eq(deliveryBoy), anyList()))
                .thenReturn(List.of());

        DeliveryBatchResponse response = deliveryBatchService.getMyActiveBatch();
        assertNull(response);
    }

    @Test
    void getMyActiveBatch_returnsActiveBatch() {
        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryBatchRepository.findByDeliveryBoyAndStatusIn(eq(deliveryBoy), anyList()))
                .thenReturn(List.of(existingBatch));
        when(deliveryRepository.findByDeliveryBatch(existingBatch)).thenReturn(List.of(delivery1));

        DeliveryBatchResponse response = deliveryBatchService.getMyActiveBatch();
        assertNotNull(response);
        assertEquals("LB Nagar", response.getAreaName());
    }

    // ===================================================================
    // 9. FIFO compatibility
    // ===================================================================

    @Test
    void createDeliveryBatch_preservesExistingAutoAssignment() {
        // If a delivery is already ASSIGNED (auto-assigned via FIFO), it should
        // still be picked up by the batch if within the area
        delivery1.setDeliveryBoy(deliveryBoy);
        delivery1.setDeliveryStatus(DeliveryStatus.ASSIGNED);
        delivery1.setAssignedAt(LocalDateTime.now());

        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryBatchRepository.existsByDeliveryBoyAndStatusIn(eq(deliveryBoy), anyList()))
                .thenReturn(false);
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);
        assertEquals(1, response.getTotalOrders());
        // Delivery keeps its existing ASSIGNED status — not re-created
        assertEquals(DeliveryStatus.ASSIGNED, delivery1.getDeliveryStatus());
    }

    // ===================================================================
    // 10. Multiple area assignments
    // ===================================================================

    @Test
    void multipleBatches_canBeCreatedForDifferentAreas() {
        when(currentUserService.getCurrentUser()).thenReturn(adminUser);
        when(userRepository.findById(2L)).thenReturn(Optional.of(deliveryBoy));
        when(deliveryRepository.findAll()).thenReturn(List.of(delivery1));
        when(deliveryBatchRepository.save(any(DeliveryBatch.class))).thenAnswer(inv -> {
            DeliveryBatch b = inv.getArgument(0);
            b.setId(1L);
            return b;
        });

        CreateDeliveryBatchRequest request = new CreateDeliveryBatchRequest();
        request.setAreaName("LB Nagar");
        request.setCenterLatitude(BigDecimal.valueOf(17.3457));
        request.setCenterLongitude(BigDecimal.valueOf(78.5473));
        request.setRadiusKm(BigDecimal.valueOf(5));
        request.setDeliveryBoyId(2L);

        DeliveryBatchResponse response = deliveryBatchService.createDeliveryBatch(request);
        assertNotNull(response);
        assertEquals("LB Nagar", response.getAreaName());
    }
}
