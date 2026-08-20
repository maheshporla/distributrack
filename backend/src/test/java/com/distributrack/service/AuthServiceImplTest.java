package com.distributrack.service;

import com.distributrack.dto.request.ForgotPasswordRequest;
import com.distributrack.dto.request.RegisterRequest;
import com.distributrack.dto.request.ResetPasswordRequest;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.entity.PasswordResetToken;
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

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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

    // =========================================================
    // Forgot Password Tests
    // =========================================================

    private User testUser() {
        return User.builder()
                .id(10L)
                .fullName("Test User")
                .email("test@test.com")
                .phone("9876543210")
                .enabled(true)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();
    }

    @Test
    void forgotPasswordReturnsSameMessageForExistingEmail() {

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser()));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.empty());
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        String response = authService.forgotPassword(request);

        assertTrue(response.contains("reset link has been sent"));
        verify(emailService).send(eq("test@test.com"), anyString(), anyString());
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPasswordReturnsSameMessageForNonExistingEmail() {

        when(userRepository.findByEmail("unknown@test.com"))
                .thenReturn(Optional.empty());

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("unknown@test.com");

        String response = authService.forgotPassword(request);

        // Same message — no user enumeration
        assertTrue(response.contains("reset link has been sent"));
        verify(emailService, never()).send(anyString(), anyString(), anyString());
        verify(passwordResetTokenRepository, never()).save(any());
    }

    @Test
    void forgotPasswordDeletesOldTokenAndCreatesNew() {

        User user = testUser();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(1);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        authService.forgotPassword(request);

        // Old token deleted, new one saved
        verify(passwordResetTokenRepository).deleteByUserId(10L);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPasswordSecondRequestDeletesFirstToken() {

        User user = testUser();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(1);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        authService.forgotPassword(request);

        // Old token deleted, new one created
        verify(passwordResetTokenRepository).deleteByUserId(10L);
        verify(passwordResetTokenRepository, times(1)).save(any(PasswordResetToken.class));
    }

    @Test
    void forgotPasswordWorksForAllRoles() {

        for (RoleName role : new RoleName[]{
                RoleName.SUPER_ADMIN, RoleName.SHOPKEEPER, RoleName.DELIVERY_BOY
        }) {
            User user = User.builder()
                    .id(100L + role.ordinal())
                    .fullName("User " + role)
                    .email(role.name().toLowerCase() + "@test.com")
                    .phone("900000000" + role.ordinal())
                    .enabled(true)
                    .role(new Role((long) role.ordinal() + 1, role))
                    .build();

            when(userRepository.findByEmail(user.getEmail()))
                    .thenReturn(Optional.of(user));
            when(passwordResetTokenRepository.findByUserId(user.getId()))
                    .thenReturn(Optional.empty());
            when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            ForgotPasswordRequest request = new ForgotPasswordRequest();
            request.setEmail(user.getEmail());

            String response = authService.forgotPassword(request);

            assertTrue(response.contains("reset link has been sent"),
                    role + " should receive reset link");
            verify(emailService).send(eq(user.getEmail()), anyString(), anyString());

            // Reset mocks for next iteration
            reset(userRepository, passwordResetTokenRepository, emailService);
        }
    }

    @Test
    void forgotPasswordUsesConfiguredFrontendUrl() {

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(testUser()));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(0);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        authService.forgotPassword(request);

        // Verify email was sent (the reset URL is embedded in the HTML body)
        verify(emailService).send(eq("test@test.com"), anyString(), anyString());
    }

    @Test
    void resetPasswordWithValidTokenSucceeds() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).token("valid-token").user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(10)).build();

        when(passwordResetTokenRepository.findByToken("valid-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPass123")).thenReturn("encoded-new-pass");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("newPass123");

        authService.resetPassword(request);

        verify(userRepository).save(argThat(u -> u.getPassword().equals("encoded-new-pass")));
        verify(passwordResetTokenRepository).delete(token);
    }

    @Test
    void resetPasswordWithExpiredTokenFails() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).token("expired-token").user(user)
                .expiryDate(LocalDateTime.now().minusMinutes(5)).build();

        when(passwordResetTokenRepository.findByToken("expired-token"))
                .thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("expired-token");
        request.setNewPassword("newPass123");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.resetPassword(request));

        assertTrue(ex.getMessage().contains("expired"));
        verify(passwordResetTokenRepository).delete(token);
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPasswordWithInvalidTokenFails() {

        when(passwordResetTokenRepository.findByToken("bad-token"))
                .thenReturn(Optional.empty());

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("bad-token");
        request.setNewPassword("newPass123");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.resetPassword(request));

        assertTrue(ex.getMessage().contains("Invalid reset token"));
    }

    @Test
    void resetPasswordEnablesDisabledUser() {

        User user = testUser();
        user.setEnabled(false);
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L).token("valid-token").user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(10)).build();

        when(passwordResetTokenRepository.findByToken("valid-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPass123")).thenReturn("encoded-new-pass");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("newPass123");

        authService.resetPassword(request);

        verify(userRepository).save(argThat(u -> u.getEnabled()));
    }
}
