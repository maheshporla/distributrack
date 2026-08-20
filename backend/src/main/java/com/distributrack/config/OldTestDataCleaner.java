package com.distributrack.config;

import com.distributrack.entity.Delivery;
import com.distributrack.entity.User;
import com.distributrack.enums.DeliveryStatus;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.DeliveryRepository;
import com.distributrack.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Safely removes old test/development delivery-boy data on startup.
 *
 * <p>This runner ONLY deletes DELIVERY_BOY users that are <b>disabled</b>
 * (i.e. never approved, or manually disabled during development). It will
 * NEVER touch approved/enabled workers, shopkeepers, admins, or any other
 * user role.</p>
 *
 * <p>Deletion order respects foreign-key constraints:</p>
 * <ol>
 *   <li>Delete deliveries referencing the disabled worker</li>
 *   <li>Then delete the worker user</li>
 * </ol>
 *
 * <p>Run with {@code --clean-test-data=true} to activate, or always on
 * the first startup after deployment (controlled by the flag below).</p>
 */
@Component
@Order(1) // Run before SchemaInitializer
@RequiredArgsConstructor
@Slf4j
public class OldTestDataCleaner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DeliveryRepository deliveryRepository;

    @Override
    @Transactional
    public void run(String... args) {

        // Only run if explicitly enabled via environment or property.
        boolean enabled = java.util.Arrays.stream(args)
                .anyMatch(a -> a.equals("--clean-test-data=true"));

        String envFlag = System.getenv("CLEAN_TEST_DATA");
        if (!enabled && !"true".equals(envFlag)) {
            log.info("OldTestDataCleaner: skipped (pass --clean-test-data=true or set CLEAN_TEST_DATA=true to activate)");
            return;
        }

        log.info("OldTestDataCleaner: starting safe cleanup of old delivery boy test data...");

        // Find all disabled DELIVERY_BOY users (these are test/development accounts
        // that were never approved or were manually disabled).
        List<User> disabledWorkers = userRepository
                .findByRole_NameAndEnabled(RoleName.DELIVERY_BOY, false);

        if (disabledWorkers.isEmpty()) {
            log.info("OldTestDataCleaner: no disabled delivery boy accounts to clean up");
            return;
        }

        int deliveriesDeleted = 0;
        int workersDeleted = 0;

        for (User worker : disabledWorkers) {
            // 1. Delete deliveries referencing this worker (respect FK order).
            List<Delivery> workerDeliveries = deliveryRepository.findByDeliveryBoy(worker);
            for (Delivery delivery : workerDeliveries) {
                // Only delete AVAILABLE (unclaimed) or FAILED deliveries.
                // ASSIGNED/OUT_FOR_DELIVERY/DELIVERED should not exist for
                // disabled workers, but if they do, skip them safely.
                if (delivery.getDeliveryStatus() == DeliveryStatus.AVAILABLE
                        || delivery.getDeliveryStatus() == DeliveryStatus.FAILED) {
                    deliveryRepository.delete(delivery);
                    deliveriesDeleted++;
                }
            }

            // 2. Delete the disabled worker user.
            userRepository.delete(worker);
            workersDeleted++;

            log.info("OldTestDataCleaner: removed worker {} ({}), {} deliveries cleaned",
                    worker.getFullName(), worker.getEmail(), workerDeliveries.size());
        }

        log.info("OldTestDataCleaner: cleanup complete — {} workers removed, {} deliveries removed",
                workersDeleted, deliveriesDeleted);
    }
}
