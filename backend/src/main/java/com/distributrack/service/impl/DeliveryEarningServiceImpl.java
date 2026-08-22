package com.distributrack.service.impl;

import com.distributrack.config.EarningCalculationConfig;
import com.distributrack.dto.response.DeliveryEarningResponse;
import com.distributrack.dto.response.DeliveryEarningsDashboard;
import com.distributrack.entity.Delivery;
import com.distributrack.entity.DeliveryBatch;
import com.distributrack.entity.DeliveryEarning;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryEarningRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.DeliveryEarningService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryEarningServiceImpl implements DeliveryEarningService {

    private final DeliveryEarningRepository deliveryEarningRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final EarningCalculationConfig earningConfig;

    @Override
    @Transactional
    public DeliveryEarningResponse createEarningIfNotExists(Delivery delivery) {
        // Duplicate protection: only create once per delivery
        if (deliveryEarningRepository.existsByDelivery(delivery)) {
            log.info("[EARNING] Earning already exists for delivery={}, skipping", delivery.getId());
            return mapToResponse(deliveryEarningRepository.findByDelivery(delivery).orElseThrow());
        }

        if (delivery.getDeliveryStatus() != DeliveryStatus.DELIVERED) {
            log.warn("[EARNING] Delivery {} is not DELIVERED (status={}), skipping earning",
                    delivery.getId(), delivery.getDeliveryStatus());
            return null;
        }

        if (delivery.getDeliveryBoy() == null) {
            log.warn("[EARNING] Delivery {} has no delivery boy assigned, skipping earning", delivery.getId());
            return null;
        }

        // Calculate distance
        double distanceKm = calculateDistanceKm(delivery);

        // Calculate earning
        long earningAmount = earningConfig.calculateEarning(distanceKm);

        BigDecimal distanceBd = BigDecimal.valueOf(distanceKm).setScale(2, RoundingMode.HALF_UP);
        BigDecimal earningBd = BigDecimal.valueOf(earningAmount);

        DeliveryEarning earning = DeliveryEarning.builder()
                .delivery(delivery)
                .deliveryBoy(delivery.getDeliveryBoy())
                .order(delivery.getOrder())
                .distanceKm(distanceBd)
                .orderAmount(delivery.getOrder().getTotalAmount())
                .earningAmount(earningBd)
                .earnedAt(delivery.getDeliveredAt() != null ? delivery.getDeliveredAt() : LocalDateTime.now())
                .build();

        earning = deliveryEarningRepository.save(earning);

        log.info("[EARNING] Created earning for delivery={}, order={}, distance={}km, amount=₹{}",
                delivery.getId(),
                delivery.getOrder().getOrderNumber(),
                distanceBd,
                earningAmount);

        return mapToResponse(earning);
    }

    // ===================================================================
    // Delivery Boy Dashboard
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public DeliveryEarningsDashboard getMyEarningsDashboard() {
        User current = currentUserService.getCurrentUser();

        DeliveryEarningsDashboard dashboard = buildDashboardForUser(current);
        dashboard.setDeliveryBoyId(current.getId());
        dashboard.setDeliveryBoyName(current.getFullName());

        // Today's breakdown
        dashboard.setTodaysEarnings(getEarningsForDate(current, LocalDate.now()));

        // History grouped by date
        dashboard.setHistory(buildHistoryGroups(current));

        return dashboard;
    }

    // ===================================================================
    // Admin Dashboard
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public DeliveryEarningsDashboard getAdminEarningsDashboard() {
        // Aggregated across all delivery boys
        List<User> allBoys = deliveryEarningRepository.findDistinctDeliveryBoysWithEarnings();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        YearMonth thisMonth = YearMonth.now();
        LocalDateTime monthStart = thisMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = thisMonth.atEndOfMonth().atTime(LocalTime.MAX);

        int todayDeliveries = 0;
        BigDecimal todayDistance = BigDecimal.ZERO;
        BigDecimal todayOrderValue = BigDecimal.ZERO;
        BigDecimal todayEarnings = BigDecimal.ZERO;
        int monthDeliveries = 0;
        BigDecimal monthDistance = BigDecimal.ZERO;
        BigDecimal monthOrderValue = BigDecimal.ZERO;
        BigDecimal monthEarnings = BigDecimal.ZERO;
        int allTimeDeliveries = 0;
        BigDecimal allTimeDistance = BigDecimal.ZERO;
        BigDecimal allTimeOrderValue = BigDecimal.ZERO;
        BigDecimal allTimeEarnings = BigDecimal.ZERO;

        List<DeliveryEarningsDashboard.DeliveryBoyEarningsSummary> summaries = new ArrayList<>();

        for (User boy : allBoys) {
            // Today
            int td = (int) deliveryEarningRepository.countDeliveries(boy, todayStart, todayEnd);
            BigDecimal tDist = deliveryEarningRepository.sumDistanceKm(boy, todayStart, todayEnd);
            BigDecimal tEarn = deliveryEarningRepository.sumEarningAmount(boy, todayStart, todayEnd);
            BigDecimal tOrdVal = sumOrderAmountForRange(boy, todayStart, todayEnd);

            // Month
            int md = (int) deliveryEarningRepository.countDeliveries(boy, monthStart, monthEnd);
            BigDecimal mDist = deliveryEarningRepository.sumDistanceKm(boy, monthStart, monthEnd);
            BigDecimal mEarn = deliveryEarningRepository.sumEarningAmount(boy, monthStart, monthEnd);
            BigDecimal mOrdVal = sumOrderAmountForRange(boy, monthStart, monthEnd);

            // All time
            int atd = (int) deliveryEarningRepository.countAllTimeDeliveries(boy);
            BigDecimal atDist = deliveryEarningRepository.sumAllTimeDistance(boy);
            BigDecimal atEarn = deliveryEarningRepository.sumAllTimeEarnings(boy);
            BigDecimal atOrdVal = sumAllTimeOrderAmount(boy);

            todayDeliveries += td;
            todayDistance = todayDistance.add(tDist);
            todayOrderValue = todayOrderValue.add(tOrdVal);
            todayEarnings = todayEarnings.add(tEarn);
            monthDeliveries += md;
            monthDistance = monthDistance.add(mDist);
            monthOrderValue = monthOrderValue.add(mOrdVal);
            monthEarnings = monthEarnings.add(mEarn);
            allTimeDeliveries += atd;
            allTimeDistance = allTimeDistance.add(atDist);
            allTimeOrderValue = allTimeOrderValue.add(atOrdVal);
            allTimeEarnings = allTimeEarnings.add(atEarn);

            summaries.add(DeliveryEarningsDashboard.DeliveryBoyEarningsSummary.builder()
                    .deliveryBoyId(boy.getId())
                    .deliveryBoyName(boy.getFullName())
                    .deliveryBoyPhone(boy.getPhone())
                    .todayEarnings(tEarn)
                    .monthEarnings(mEarn)
                    .totalDeliveries(atd)
                    .totalDistanceKm(atDist)
                    .build());
        }

        return DeliveryEarningsDashboard.builder()
                .todayDeliveries(todayDeliveries)
                .todayDistanceKm(todayDistance)
                .todayOrderValue(todayOrderValue)
                .todayEarnings(todayEarnings)
                .monthDeliveries(monthDeliveries)
                .monthDistanceKm(monthDistance)
                .monthOrderValue(monthOrderValue)
                .monthEarnings(monthEarnings)
                .allTimeDeliveries(allTimeDeliveries)
                .allTimeDistanceKm(allTimeDistance)
                .allTimeOrderValue(allTimeOrderValue)
                .allTimeEarnings(allTimeEarnings)
                .allDeliveryBoys(summaries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DeliveryEarningsDashboard getDeliveryBoyEarningsDashboard(Long deliveryBoyId) {
        User current = currentUserService.getCurrentUser();

        // Admin roles can view any delivery boy
        RoleName role = current.getRole().getName();
        User deliveryBoy;

        if (role == RoleName.DELIVERY_BOY) {
            // Delivery boy can only view their own
            deliveryBoy = current;
        } else {
            deliveryBoy = userRepository.findById(deliveryBoyId)
                    .orElseThrow(() -> new RuntimeException("Delivery boy not found: " + deliveryBoyId));
        }

        DeliveryEarningsDashboard dashboard = buildDashboardForUser(deliveryBoy);
        dashboard.setDeliveryBoyId(deliveryBoy.getId());
        dashboard.setDeliveryBoyName(deliveryBoy.getFullName());
        dashboard.setTodaysEarnings(getEarningsForDate(deliveryBoy, LocalDate.now()));
        dashboard.setHistory(buildHistoryGroups(deliveryBoy));

        return dashboard;
    }

    // ===================================================================
    // Earnings History
    // ===================================================================

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryEarningResponse> getMyEarningsHistory() {
        User current = currentUserService.getCurrentUser();
        return deliveryEarningRepository.findByDeliveryBoyOrderByEarnedAtDesc(current)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DeliveryEarningResponse> getDeliveryBoyEarningsHistory(Long deliveryBoyId) {
        User current = currentUserService.getCurrentUser();
        User deliveryBoy;

        if (current.getRole().getName() == RoleName.DELIVERY_BOY) {
            deliveryBoy = current;
        } else {
            deliveryBoy = userRepository.findById(deliveryBoyId)
                    .orElseThrow(() -> new RuntimeException("Delivery boy not found: " + deliveryBoyId));
        }

        return deliveryEarningRepository.findByDeliveryBoyOrderByEarnedAtDesc(deliveryBoy)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ===================================================================
    // Private helpers
    // ===================================================================

    private DeliveryEarningsDashboard buildDashboardForUser(User deliveryBoy) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        YearMonth thisMonth = YearMonth.now();
        LocalDateTime monthStart = thisMonth.atDay(1).atStartOfDay();
        LocalDateTime monthEnd = thisMonth.atEndOfMonth().atTime(LocalTime.MAX);

        return DeliveryEarningsDashboard.builder()
                .todayDeliveries((int) deliveryEarningRepository.countDeliveries(deliveryBoy, todayStart, todayEnd))
                .todayDistanceKm(deliveryEarningRepository.sumDistanceKm(deliveryBoy, todayStart, todayEnd))
                .todayOrderValue(sumOrderAmountForRange(deliveryBoy, todayStart, todayEnd))
                .todayEarnings(deliveryEarningRepository.sumEarningAmount(deliveryBoy, todayStart, todayEnd))
                .monthDeliveries((int) deliveryEarningRepository.countDeliveries(deliveryBoy, monthStart, monthEnd))
                .monthDistanceKm(deliveryEarningRepository.sumDistanceKm(deliveryBoy, monthStart, monthEnd))
                .monthOrderValue(sumOrderAmountForRange(deliveryBoy, monthStart, monthEnd))
                .monthEarnings(deliveryEarningRepository.sumEarningAmount(deliveryBoy, monthStart, monthEnd))
                .allTimeDeliveries((int) deliveryEarningRepository.countAllTimeDeliveries(deliveryBoy))
                .allTimeDistanceKm(deliveryEarningRepository.sumAllTimeDistance(deliveryBoy))
                .allTimeOrderValue(sumAllTimeOrderAmount(deliveryBoy))
                .allTimeEarnings(deliveryEarningRepository.sumAllTimeEarnings(deliveryBoy))
                .build();
    }

    private List<DeliveryEarningResponse> getEarningsForDate(User deliveryBoy, LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        return deliveryEarningRepository
                .findByDeliveryBoyAndEarnedAtBetweenOrderByEarnedAtDesc(deliveryBoy, start, end)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private List<DeliveryEarningsDashboard.DailyEarningGroup> buildHistoryGroups(User deliveryBoy) {
        // Get last 30 days of earnings
        LocalDateTime fromDate = LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime toDate = LocalDate.now().atTime(LocalTime.MAX);

        List<DeliveryEarning> recentEarnings = deliveryEarningRepository
                .findByDeliveryBoyAndEarnedAtBetweenOrderByEarnedAtDesc(deliveryBoy, fromDate, toDate);

        // Group by date
        Map<LocalDate, List<DeliveryEarning>> grouped = recentEarnings.stream()
                .collect(Collectors.groupingBy(
                        e -> e.getEarnedAt().toLocalDate(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<DeliveryEarningsDashboard.DailyEarningGroup> groups = new ArrayList<>();
        for (Map.Entry<LocalDate, List<DeliveryEarning>> entry : grouped.entrySet()) {
            List<DeliveryEarning> dayEarnings = entry.getValue();
            groups.add(DeliveryEarningsDashboard.DailyEarningGroup.builder()
                    .date(entry.getKey())
                    .deliveries(dayEarnings.size())
                    .distanceKm(dayEarnings.stream()
                            .map(DeliveryEarning::getDistanceKm)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .orderValue(dayEarnings.stream()
                            .map(DeliveryEarning::getOrderAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .earnings(dayEarnings.stream()
                            .map(DeliveryEarning::getEarningAmount)
                            .reduce(BigDecimal.ZERO, BigDecimal::add))
                    .earningsList(dayEarnings.stream()
                            .map(this::mapToResponse)
                            .collect(Collectors.toList()))
                    .build());
        }
        return groups;
    }

    /**
     * Calculate delivery distance in km.
     * Priority: warehouse (from batch) → delivery origin → destination.
     * Destination: delivery destination (copied from shopkeeper profile).
     */
    private double calculateDistanceKm(Delivery delivery) {
        Double originLat = null, originLng = null;

        // Try to get warehouse coordinates from the delivery batch
        DeliveryBatch batch = delivery.getDeliveryBatch();
        if (batch != null && batch.getWarehouse() != null) {
            originLat = batch.getWarehouse().getLatitude();
            originLng = batch.getWarehouse().getLongitude();
        }

        // Fall back to delivery's last GPS position (tracking point)
        if (originLat == null || originLng == null) {
            originLat = delivery.getLatitude();
            originLng = delivery.getLongitude();
        }

        // Fall back to delivery available location (if set)
        if (originLat == null || originLng == null) {
            originLat = 0.0;
            originLng = 0.0;
        }

        // Destination from delivery (copied from shopkeeper profile)
        Double destLat = delivery.getDestinationLatitude();
        Double destLng = delivery.getDestinationLongitude();

        if (destLat == null || destLng == null) {
            // Fallback: distance = 0, earn base charge
            log.warn("[EARNING] Delivery {} has no destination coordinates, using base charge",
                    delivery.getId());
            return 0;
        }

        return haversineKm(originLat, originLng, destLat, destLng);
    }

    /**
     * Haversine formula — distance between two lat/lng points in km.
     * Reuses the same formula as DeliveryBatchServiceImpl.
     */
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

    private DeliveryEarningResponse mapToResponse(DeliveryEarning earning) {
        return DeliveryEarningResponse.builder()
                .earningId(earning.getId())
                .deliveryId(earning.getDelivery().getId())
                .orderId(earning.getOrder().getId())
                .orderNumber(earning.getOrder().getOrderNumber())
                .shopName(earning.getOrder().getShopkeeper().getShopName())
                .shopkeeperName(earning.getOrder().getShopkeeper().getFullName())
                .distanceKm(earning.getDistanceKm())
                .orderAmount(earning.getOrderAmount())
                .earningAmount(earning.getEarningAmount())
                .deliveryStatus(earning.getDelivery().getDeliveryStatus().name())
                .earnedAt(earning.getEarnedAt())
                .build();
    }

    private BigDecimal sumOrderAmountForRange(User deliveryBoy, LocalDateTime from, LocalDateTime to) {
        List<DeliveryEarning> earnings = deliveryEarningRepository
                .findByDeliveryBoyAndEarnedAtBetweenOrderByEarnedAtDesc(deliveryBoy, from, to);
        return earnings.stream()
                .map(DeliveryEarning::getOrderAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumAllTimeOrderAmount(User deliveryBoy) {
        List<DeliveryEarning> earnings = deliveryEarningRepository
                .findByDeliveryBoyOrderByEarnedAtDesc(deliveryBoy);
        return earnings.stream()
                .map(DeliveryEarning::getOrderAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
