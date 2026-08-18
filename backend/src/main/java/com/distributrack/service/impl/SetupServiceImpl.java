package com.distributrack.service.impl;

import com.distributrack.dto.request.FirstAdminRequest;
import com.distributrack.dto.response.SetupStatusResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.service.SetupService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Guarded first-admin setup.
 *
 * Security model:
 *  - The endpoint is public in SecurityConfig, but the guard below is the
 *    real gate: it only works while NO SUPER_ADMIN exists in the system.
 *  - Once the first SUPER_ADMIN is created, this endpoint is permanently
 *    closed. Further admin accounts are created by an authenticated
 *    SUPER_ADMIN via the Staff Management endpoints.
 *  - The role is hard-coded to SUPER_ADMIN; the caller cannot influence
 *    it. The password is always BCrypt-encoded via the application's
 *    PasswordEncoder — never stored in plain text.
 *  - Shopkeepers can register (via public registration) even before the
 *    first admin exists, so the admin setup is not blocked by shopkeeper
 *    registration.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SetupServiceImpl implements SetupService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public SetupStatusResponse getStatus() {
        return SetupStatusResponse.builder()
                .setupRequired(!hasAnySuperAdmin())
                .build();
    }

    @Override
    public UserResponse createFirstAdmin(FirstAdminRequest request) {

        // The gate: only works while no SUPER_ADMIN exists. Once the first
        // admin is created, this endpoint is permanently closed.
        if (hasAnySuperAdmin()) {
            throw new RuntimeException(
                    "First admin setup is no longer available — a SUPER_ADMIN already exists"
            );
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already exists");
        }

        Role adminRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                .orElseThrow(() -> new IllegalStateException(
                        "SUPER_ADMIN role missing — roles should be seeded at startup"
                ));

        User admin = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone().trim())
                .enabled(true)
                .role(adminRole)
                .build();

        User saved = userRepository.save(admin);

        return UserResponse.builder()
                .id(saved.getId())
                .fullName(saved.getFullName())
                .email(saved.getEmail())
                .phone(saved.getPhone())
                .role(saved.getRole().getName())
                .enabled(saved.getEnabled())
                .createdAt(saved.getCreatedAt())
                .build();
    }

    /** Checks whether at least one SUPER_ADMIN user exists. */
    private boolean hasAnySuperAdmin() {
        return userRepository.existsByRole_Name(RoleName.SUPER_ADMIN);
    }
}
