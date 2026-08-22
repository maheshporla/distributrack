package com.distributrack.config;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for the centralized delivery earning rate formula.
 *
 * Formula:
 *   if distance <= 1:  earning = ₹20 (base charge)
 *   else if distance <= 10: earning = ceil(distance) * ₹20
 *   else: earning = (10 * ₹20) + (ceil(distance) - 10) * ₹30
 *
 * Uses ceiling/round-up for decimal distances.
 */
class EarningCalculationConfigTest {

    private EarningCalculationConfig config;

    @BeforeEach
    void setUp() {
        config = new EarningCalculationConfig();
        // Default values
        config.setBaseChargeThresholdKm(1.0);
        config.setBaseDeliveryCharge(20);
        config.setNormalRatePerKm(20);
        config.setLongDistanceThresholdKm(10);
        config.setLongDistanceRatePerKm(30);
    }

    // =====================
    // Below 1 km: flat ₹20
    // =====================

    @Test
    void zeroDistanceEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(0));
    }

    @Test
    void negativeDistanceEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(-5));
    }

    @Test
    void halfKmEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(0.5));
    }

    @Test
    void point2KmEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(0.2));
    }

    @Test
    void point9KmEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(0.9));
    }

    @Test
    void exactly1KmEarnsBaseCharge() {
        assertEquals(20, config.calculateEarning(1.0));
    }

    // =====================
    // Between 1 and 10 km: ceil(distance) * 20
    // =====================

    @Test
    void onePoint1KmEarnsCeil40() {
        assertEquals(40, config.calculateEarning(1.1));
    }

    @Test
    void twoKmEarns40() {
        assertEquals(40, config.calculateEarning(2.0));
    }

    @Test
    void twoPoint1KmEarnsCeil60() {
        assertEquals(60, config.calculateEarning(2.1));
    }

    @Test
    void threeKmEarns60() {
        assertEquals(60, config.calculateEarning(3.0));
    }

    @Test
    void fiveKmEarns100() {
        assertEquals(100, config.calculateEarning(5.0));
    }

    @Test
    void fivePoint4KmEarnsCeil120() {
        assertEquals(120, config.calculateEarning(5.4));
    }

    @Test
    void sevenKmEarns140() {
        assertEquals(140, config.calculateEarning(7.0));
    }

    @Test
    void ninePoint7KmEarnsCeil200() {
        assertEquals(200, config.calculateEarning(9.7));
    }

    @Test
    void tenKmEarns200() {
        assertEquals(200, config.calculateEarning(10.0));
    }

    // =====================
    // Above 10 km: 200 + (ceil(distance) - 10) * 30
    // =====================

    @Test
    void tenPoint1KmEarns230() {
        assertEquals(230, config.calculateEarning(10.1));
    }

    @Test
    void elevenKmEarns230() {
        assertEquals(230, config.calculateEarning(11.0));
    }

    @Test
    void elevenPoint4KmEarns260() {
        assertEquals(260, config.calculateEarning(11.4));
    }

    @Test
    void twelveKmEarns260() {
        assertEquals(260, config.calculateEarning(12.0));
    }

    @Test
    void fifteenKmEarns350() {
        assertEquals(350, config.calculateEarning(15.0));
    }

    @Test
    void twentyKmEarns500() {
        assertEquals(500, config.calculateEarning(20.0));
    }

    @Test
    void fiftyKmEarns1400() {
        // 10*20 + (50-10)*30 = 200 + 1200 = 1400
        assertEquals(1400, config.calculateEarning(50.0));
    }

    // =====================
    // Ceiling behavior
    // =====================

    @Test
    void decimalDistanceRoundsUp() {
        // 1.01 -> ceil = 2 -> 2 * 20 = 40
        assertEquals(40, config.calculateEarning(1.01));
    }

    @Test
    void exactlyIntegerDoesNotOverCharge() {
        assertEquals(60, config.calculateEarning(3.0));
    }

    // =====================
    // Config flexibility
    // =====================

    @Test
    void customRatesAreHonored() {
        config.setBaseDeliveryCharge(30);
        config.setNormalRatePerKm(25);
        config.setLongDistanceRatePerKm(40);

        assertEquals(30, config.calculateEarning(0.5));
        assertEquals(75, config.calculateEarning(3.0));  // 3 * 25
        assertEquals(250, config.calculateEarning(10.0)); // 10 * 25
        assertEquals(290, config.calculateEarning(11.0)); // 10*25 + 1*40
    }
}
