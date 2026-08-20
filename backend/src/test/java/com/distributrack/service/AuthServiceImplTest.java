package com.distributrack.service;

import com.distributrack.dto.request.RegisterRequest;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.notification.EmailService;
import com.distributrack.repository.PasswordResetTokenRepository;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
    private final RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);
    private final PasswordResetTokenRepository passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final EmailService emailService = mock(EmailService.class);

    private final AuthServiceImpl authService = new AuthServiceImpl(
            emailService,
            passwordResetTokenRepository,
            userRepository,
            roleRepository,
            passwordEncoder,
            authenticationManager,
            refreshTokenService,
            currentUserService
    );

    private RegisterRequest registerRequest(RoleName role) {
        RegisterRequest request = new RegisterRequest();
        request.setFullName("Shop One");
        request.setEmail("shop@test.com");
        request.setPassword("secret123");
        request.setPhone("9876543210");
        request.setRole(role);
        return request;
    }

    @Test
    void publicRegistrationRejectsPrivilegedRoles() {

        // SHOPKEEPER and DELIVERY_BOY are allowed; everything else is rejected.
        for (RoleName role : new RoleName[]{
                RoleName.SUPER_ADMIN, RoleName.OWNER, RoleName.MANAGER,
                RoleName.SALESMAN
        }) {
            RuntimeException ex = assertThrows(
                    RuntimeException.class,
                    () -> authService.register(registerRequest(role)),
                    "Role " + role + " must be rejected"
            );
            assertTrue(ex.getMessage().contains("Shopkeeper")
                    || ex.getMessage().contains("Delivery Partner"));
        }

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void publicRegistrationAllowsShopkeeperOnly() {

        // A SUPER_ADMIN must already exist for registration to open.
        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(true);
        when(userRepository.existsByEmail("shop@test.com")).thenReturn(false);
        when(userRepository.existsByPhone("9876543210")).thenReturn(false);
        when(roleRepository.findByName(RoleName.SHOPKEEPER))
                .thenReturn(Optional.of(new Role(6L, RoleName.SHOPKEEPER)));
        when(passwordEncoder.encode("secret123")).thenReturn("encoded");
        when(refreshTokenService.createRefreshToken(any(User.class)))
                .thenReturn(RefreshTokenResponse.builder()
                        .accessToken("access")
                        .refreshToken("refresh")
                        .build());

        AuthResponse response = authService.register(registerRequest(RoleName.SHOPKEEPER));

        assertNotNull(response.getAccessToken());
        verify(userRepository).save(argThat(user ->
                user.getRole().getName() == RoleName.SHOPKEEPER
                        && user.getEmail().equals("shop@test.com")));
    }

    @Test
    void publicRegistrationDeliveryBoyCreatesDisabledAccount() {

        // A SUPER_ADMIN must already exist.
        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(true);
        when(userRepository.existsByEmail("shop@test.com")).thenReturn(false);
        when(userRepository.existsByPhone("9876543210")).thenReturn(false);
        when(roleRepository.findByName(RoleName.DELIVERY_BOY))
                .thenReturn(Optional.of(new Role(5L, RoleName.DELIVERY_BOY)));
        when(passwordEncoder.encode("secret123")).thenReturn("encoded");

        // DELIVERY_BOY registration does NOT create tokens — account is pending.
        AuthResponse response = authService.register(registerRequest(RoleName.DELIVERY_BOY));

        // No tokens — pending approval.
        assertNull(response.getAccessToken());
        assertNull(response.getRefreshToken());
        assertTrue(response.getMessage().contains("waiting for admin approval"));

        // User saved with enabled=false.
        verify(userRepository).save(argThat(user ->
                user.getRole().getName() == RoleName.DELIVERY_BOY
                        && !user.getEnabled()));

        // No refresh token should have been created.
        verify(refreshTokenService, never()).createRefreshToken(any());
    }

    @Test
    void publicRegistrationBlockedUntilFirstSuperAdminExists() {

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(false);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> authService.register(registerRequest(RoleName.SHOPKEEPER))
        );

        assertTrue(ex.getMessage().contains("first administrator"));
        verify(userRepository, never()).save(any(User.class));
    }
}
