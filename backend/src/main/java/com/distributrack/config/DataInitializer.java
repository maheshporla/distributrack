package com.distributrack.config;

import com.distributrack.entity.Role;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds reference data on startup, safely (idempotent, never overwrites):
 *
 * 1. The six {@link RoleName} rows, if missing.
 *
 * It deliberately creates NO user accounts. The first SUPER_ADMIN is
 * created manually by the operator through the guarded first-admin setup
 * endpoint (POST /api/setup/first-admin), which only works while the
 * users table is completely empty. Staff accounts are then created by
 * that administrator via the authenticated /api/users endpoints.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements ApplicationRunner {

    private final RoleRepository roleRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedRoles();
    }

    private void seedRoles() {

        for (RoleName name : RoleName.values()) {
            if (roleRepository.findByName(name).isEmpty()) {
                roleRepository.save(new Role(null, name));
                log.info("Seeded role: {}", name);
            }
        }
    }
}
