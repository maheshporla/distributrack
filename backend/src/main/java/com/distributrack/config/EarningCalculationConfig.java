package com.distributrack.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Centralized delivery earning rate configuration.
 * All rates are in INR and can be changed via application.properties
 * without modifying Java code.
 *
 * Formula:
 *   if distance <= BASE_CHARGE_THRESHOLD_KM: earning = BASE_DELIVERY_CHARGE
 *   else if distance <= LONG_DISTANCE_THRESHOLD_KM: earning = ceil(distance) * NORMAL_RATE_PER_KM
 *   else: earning = (LONG_DISTANCE_THRESHOLD_KM * NORMAL_RATE_PER_KM) + (ceil(distance) - LONG_DISTANCE_THRESHOLD_KM) * LONG_DISTANCE_RATE_PER_KM
 */
@Configuration
@ConfigurationProperties(prefix = "app.earning")
public class EarningCalculationConfig {

    /** Base charge for deliveries within this distance (km). Default: 1 km. */
    private double baseChargeThresholdKm = 1.0;

    /** Flat base earning for short distances. Default: ₹20. */
    private int baseDeliveryCharge = 20;

    /** Per-km rate for distances up to threshold. Default: ₹20/km. */
    private int normalRatePerKm = 20;

    /** Distance (km) above which long-distance rate applies. Default: 10 km. */
    private int longDistanceThresholdKm = 10;

    /** Per-km rate above long-distance threshold. Default: ₹30/km. */
    private int longDistanceRatePerKm = 30;

    public double getBaseChargeThresholdKm() { return baseChargeThresholdKm; }
    public void setBaseChargeThresholdKm(double baseChargeThresholdKm) { this.baseChargeThresholdKm = baseChargeThresholdKm; }
    public int getBaseDeliveryCharge() { return baseDeliveryCharge; }
    public void setBaseDeliveryCharge(int baseDeliveryCharge) { this.baseDeliveryCharge = baseDeliveryCharge; }
    public int getNormalRatePerKm() { return normalRatePerKm; }
    public void setNormalRatePerKm(int normalRatePerKm) { this.normalRatePerKm = normalRatePerKm; }
    public int getLongDistanceThresholdKm() { return longDistanceThresholdKm; }
    public void setLongDistanceThresholdKm(int longDistanceThresholdKm) { this.longDistanceThresholdKm = longDistanceThresholdKm; }
    public int getLongDistanceRatePerKm() { return longDistanceRatePerKm; }
    public void setLongDistanceRatePerKm(int longDistanceRatePerKm) { this.longDistanceRatePerKm = longDistanceRatePerKm; }

    /**
     * Calculate delivery earning based on distance.
     * Uses ceiling/round-up for decimal distances.
     */
    public long calculateEarning(double distanceKm) {
        if (distanceKm <= 0) {
            return baseDeliveryCharge;
        }
        if (distanceKm <= baseChargeThresholdKm) {
            return baseDeliveryCharge;
        }

        long ceiledDistance = (long) Math.ceil(distanceKm);

        if (ceiledDistance <= longDistanceThresholdKm) {
            return ceiledDistance * normalRatePerKm;
        } else {
            long longDistanceKm = ceiledDistance - longDistanceThresholdKm;
            return (long) (longDistanceThresholdKm * normalRatePerKm)
                    + longDistanceKm * longDistanceRatePerKm;
        }
    }
}
