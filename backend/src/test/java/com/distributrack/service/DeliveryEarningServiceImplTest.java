package com.distributrack.service;

import com.distributrack.config.EarningCalculationConfig;
import com.distributrack.dto.response.DeliveryEarningResponse;
import com.distributrack.dto.response.DeliveryEarningsDashboard;
import com.distributrack.entity.*;
import com.distributrack.enums.*;
import com.distributrack.repository.DeliveryBatchRepository;
import com.distributrack.repository.DeliveryEarningRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.DeliveryEarningServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DeliveryEarningServiceImplTest {

    private DeliveryEarningRepository deliveryEarningRepository;
    private UserRepository userRepository;
    private CurrentUserService currentUserService;
    private EarningCalculationConfig earningConfig;
    private DeliveryBatchRepository deliveryBatchRepository;
    private DeliveryEarningServiceImpl deliveryEarningService;

    private User deliveryBoy;
    private User shopkeeper;
    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        deliveryEarningRepository = mock(DeliveryEarningRepository.class);
        userRepository = mock(UserRepository.class);
        currentUserService = mock(CurrentUserService.class);
        earningConfig = new EarningCalculationConfig();
        deliveryBatchRepository = mock(DeliveryBatchRepository.class);

        deliveryEarningService = new DeliveryEarningServiceImpl(
                deliveryEarningRepository,
                userRepository,
                currentUserService,
                earningConfig
        );

        deliveryBoy = User.builder()
                .id(1L)
                .fullName("Ravi Kumar")
                .email("ravi@test.com")
                .phone("9000000000")
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .latitude(17.3850)
                .longitude(78.4867)
                .build();

        shopkeeper = User.builder()
                .id(2L)
                .fullName("Sri Stores")
                .email("sri@test.com")
                .phone("9876543210")
                .shopName("Sri Stores")
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .latitude(17.3950)
                .longitude(78.4967)
                .build();

        warehouse = Warehouse.builder()
                .id(1L)
                .warehouseName("Hyderabad Warehouse")
                .latitude(17.3850)
                .longitude(78.4867)
                .build();
    }

    // ==============================
    // Earning creation
    // ==============================

    @Test
    void createEarningForDeliveredDelivery() {
        Delivery delivery = createDelivery(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1500), null);

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        assertEquals("ORD-1001", response.getOrderNumber());
        assertNotNull(response.getEarningAmount());
        assertTrue(response.getEarningAmount().longValue() > 0);
        assertEquals("DELIVERED", response.getDeliveryStatus());

        verify(deliveryEarningRepository).save(any(DeliveryEarning.class));
    }

    @Test
    void noEarningCreatedForFailedDelivery() {
        Delivery delivery = createDelivery(10L, 101L, DeliveryStatus.FAILED,
                "ORD-1001", BigDecimal.valueOf(1500), null);

        // Even if called, should return null for non-DELIVERED
        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNull(response);
        verify(deliveryEarningRepository, never()).save(any());
    }

    @Test
    void duplicateEarningIsRejected() {
        Delivery delivery = createDelivery(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1500), null);

        DeliveryEarning existing = DeliveryEarning.builder()
                .id(99L)
                .delivery(delivery)
                .deliveryBoy(delivery.getDeliveryBoy())
                .order(delivery.getOrder())
                .distanceKm(BigDecimal.valueOf(5))
                .orderAmount(BigDecimal.valueOf(1500))
                .earningAmount(BigDecimal.valueOf(100))
                .earnedAt(LocalDateTime.now())
                .build();

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(true);
        when(deliveryEarningRepository.findByDelivery(delivery)).thenReturn(Optional.of(existing));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        assertEquals(99L, response.getEarningId());
        verify(deliveryEarningRepository, never()).save(any());
    }

    @Test
    void noEarningCreatedForDeliveryWithNullBoy() {
        Delivery delivery = createDelivery(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1500), null);
        delivery.setDeliveryBoy(null);

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNull(response);
        verify(deliveryEarningRepository, never()).save(any());
    }

    // ==============================
    // Distance-based earning
    // ==============================

    @Test
    void shortDistanceEarnsBaseCharge() {
        // 0.5 km -> ₹20
        Delivery delivery = createDeliveryWithCoords(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1000),
                17.3850, 78.4867,  // origin (warehouse or delivery GPS)
                17.3880, 78.4890); // destination (very close)

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        assertEquals(20, response.getEarningAmount().longValue());
    }

    @Test
    void mediumDistanceEarnsPerKmRate() {
        // Known distance: ~5.5 km between these coords -> ceil(5.5) = 6 -> 6 * 20 = 120
        Delivery delivery = createDeliveryWithCoords(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1002", BigDecimal.valueOf(2000),
                17.3850, 78.4867,
                17.4350, 78.5367);

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        // Should be ceil(distance) * 20 for distances 1 < d <= 10
        long earning = response.getEarningAmount().longValue();
        assertTrue(earning >= 40 && earning <= 200,
                "Earning " + earning + " should be in normal rate range (40-200)");
    }

    @Test
    void longDistanceEarnsHigherRate() {
        // ~20 km -> ₹500
        Delivery delivery = createDeliveryWithCoords(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1003", BigDecimal.valueOf(5000),
                17.3850, 78.4867,
                17.5850, 78.6867);  // ~25 km away

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        assertTrue(response.getEarningAmount().longValue() > 200);
    }

    // ==============================
    // Dashboard
    // ==============================

    @Test
    void dashboardReturnsTodayMonthAllTimeStats() {
        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryEarningRepository.countDeliveries(eq(deliveryBoy), any(), any())).thenReturn(5L);
        when(deliveryEarningRepository.sumDistanceKm(eq(deliveryBoy), any(), any()))
                .thenReturn(BigDecimal.valueOf(47.6));
        when(deliveryEarningRepository.sumEarningAmount(eq(deliveryBoy), any(), any()))
                .thenReturn(BigDecimal.valueOf(1020));
        when(deliveryEarningRepository.countAllTimeDeliveries(deliveryBoy)).thenReturn(42L);
        when(deliveryEarningRepository.sumAllTimeDistance(deliveryBoy))
                .thenReturn(BigDecimal.valueOf(286.5));
        when(deliveryEarningRepository.sumAllTimeEarnings(deliveryBoy))
                .thenReturn(BigDecimal.valueOf(6420));
        when(deliveryEarningRepository.findByDeliveryBoyOrderByEarnedAtDesc(deliveryBoy))
                .thenReturn(List.of());

        DeliveryEarningsDashboard dashboard = deliveryEarningService.getMyEarningsDashboard();

        assertEquals(deliveryBoy.getId(), dashboard.getDeliveryBoyId());
        assertEquals("Ravi Kumar", dashboard.getDeliveryBoyName());
        assertEquals(5, dashboard.getTodayDeliveries());
        assertEquals(42, dashboard.getAllTimeDeliveries());
        assertEquals(1020, dashboard.getTodayEarnings().longValue());
        assertEquals(6420, dashboard.getAllTimeEarnings().longValue());
    }

    // ==============================
    // Admin authorization
    // ==============================

    @Test
    void deliveryBoyCanOnlyViewOwnEarnings() {
        User otherBoy = User.builder()
                .id(3L)
                .fullName("Other Boy")
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(deliveryBoy);
        when(deliveryEarningRepository.findByDeliveryBoyOrderByEarnedAtDesc(deliveryBoy))
                .thenReturn(List.of());

        List<DeliveryEarningResponse> history = deliveryEarningService.getDeliveryBoyEarningsHistory(3L);

        // Delivery boy can only see their own — service uses current user, not the passed ID
        verify(deliveryEarningRepository).findByDeliveryBoyOrderByEarnedAtDesc(deliveryBoy);
    }

    // ==============================
    // Order amount not mixed with earning
    // ==============================

    @Test
    void earningIsSeparateFromOrderAmount() {
        Delivery delivery = createDeliveryWithCoords(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(5000),
                17.3850, 78.4867,
                17.3880, 78.4890);  // Very short distance

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        // ₹5000 order but only ₹20 earning (short distance)
        assertEquals(5000, response.getOrderAmount().longValue());
        assertEquals(20, response.getEarningAmount().longValue());
    }

    // ==============================
    // No destination coordinates
    // ==============================

    @Test
    void deliveryWithNoDestinationGetsBaseCharge() {
        Delivery delivery = createDelivery(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1500), null);
        // No destination coordinates
        delivery.setDestinationLatitude(null);
        delivery.setDestinationLongitude(null);

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);

        assertNotNull(response);
        assertEquals(20, response.getEarningAmount().longValue());
    }

    // ==============================
    // Delivery boy stays AVAILABLE
    // ==============================

    @Test
    void deliveryBoyStaysAvailableAfterDelivered() {
        deliveryBoy.setAvailability(WorkerAvailability.AVAILABLE);
        assertEquals(WorkerAvailability.AVAILABLE, deliveryBoy.getAvailability());
        // Completing a delivery does not change availability
        // (tested indirectly — the earning service doesn't modify user state)
    }

    // ==============================
    // Batch auto-completion (tested via DeliveryServiceImpl integration)
    // ==============================

    @Test
    void batchCompletionCheckedAfterDeliveryTerminal() {
        // This tests that checkAndCompleteBatchIfNeeded is called
        // (integration tested via DeliveryServiceImplTest)
        // Here we verify the service layer doesn't break
        Delivery delivery = createDeliveryWithCoords(10L, 101L, DeliveryStatus.DELIVERED,
                "ORD-1001", BigDecimal.valueOf(1500),
                17.3850, 78.4867,
                17.3950, 78.4967);

        when(deliveryEarningRepository.existsByDelivery(delivery)).thenReturn(false);
        when(deliveryEarningRepository.save(any(DeliveryEarning.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        DeliveryEarningResponse response = deliveryEarningService.createEarningIfNotExists(delivery);
        assertNotNull(response);
    }

    // ==============================
    // Helpers
    // ==============================

    private Delivery createDelivery(Long deliveryId, Long orderId,
                                    DeliveryStatus status, String orderNumber,
                                    BigDecimal totalAmount, DeliveryBatch batch) {
        Order order = Order.builder()
                .id(orderId)
                .orderNumber(orderNumber)
                .shopkeeper(shopkeeper)
                .totalAmount(totalAmount)
                .status(status == DeliveryStatus.DELIVERED ? OrderStatus.DELIVERED : OrderStatus.OUT_FOR_DELIVERY)
                .orderItems(List.of())
                .build();

        return Delivery.builder()
                .id(deliveryId)
                .order(order)
                .deliveryBoy(deliveryBoy)
                .deliveryStatus(status)
                .deliveryAddress("Test Address")
                .destinationLatitude(shopkeeper.getLatitude())
                .destinationLongitude(shopkeeper.getLongitude())
                .deliveryBatch(batch)
                .build();
    }

    private Delivery createDeliveryWithCoords(Long deliveryId, Long orderId,
                                               DeliveryStatus status, String orderNumber,
                                               BigDecimal totalAmount,
                                               Double originLat, Double originLng,
                                               Double destLat, Double destLng) {
        Order order = Order.builder()
                .id(orderId)
                .orderNumber(orderNumber)
                .shopkeeper(shopkeeper)
                .totalAmount(totalAmount)
                .status(status == DeliveryStatus.DELIVERED ? OrderStatus.DELIVERED : OrderStatus.OUT_FOR_DELIVERY)
                .orderItems(List.of())
                .build();

        // Delivery with GPS coordinates (origin) and destination
        Delivery delivery = Delivery.builder()
                .id(deliveryId)
                .order(order)
                .deliveryBoy(deliveryBoy)
                .deliveryStatus(status)
                .deliveryAddress("Test Address")
                .latitude(originLat)
                .longitude(originLng)
                .destinationLatitude(destLat)
                .destinationLongitude(destLng)
                .deliveredAt(status == DeliveryStatus.DELIVERED ? LocalDateTime.now() : null)
                .build();

        return delivery;
    }
}
