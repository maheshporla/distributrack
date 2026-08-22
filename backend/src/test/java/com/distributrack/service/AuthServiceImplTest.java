package com.distributrack.service;

import com.distributrack.dto.request.ForgotPasswordRequest;
import com.distributrack.dto.request.RegisterRequest;
import com.distributrack.dto.request.ResetPasswordRequest;
import com.distributrack.dto.request.VerifyResetOtpRequest;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.dto.response.VerifyResetOtpResponse;
import com.distributrack.entity.PasswordResetToken;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.notification.SmsService;
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
    private final SmsService smsService = mock(SmsService.class);

    private final AuthServiceImpl authService = new AuthServiceImpl(
            smsService,
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
    // OTP Password Reset Tests
    // =========================================================

    private User testUser() {
        return User.builder()
                .id(10L)
                .fullName("Test User")
                .email("test@test.com")
                .phone("+919876543210")
                .enabled(true)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();
    }

    // ---- Forgot Password (OTP Send) Tests ----

    @Test
    void forgotPasswordSendsOtpForExistingEmail() {

        User user = testUser();
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(0);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-otp");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        String response = authService.forgotPassword(request);

        assertTrue(response.contains("OTP has been sent"));
        // Verify OTP record was saved
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
        // Verify SMS was sent
        verify(smsService).send(eq("+919876543210"), anyString());
    }

    @Test
    void forgotPasswordReturnsSameMessageForNonExistingEmail() {

        when(userRepository.findByEmail("unknown@test.com"))
                .thenReturn(Optional.empty());

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("unknown@test.com");

        String response = authService.forgotPassword(request);

        // Same message — no user enumeration
        assertTrue(response.contains("OTP has been sent"));
        verify(smsService, never()).send(anyString(), anyString());
        verify(passwordResetTokenRepository, never()).save(any());
    }

    @Test
    void forgotPasswordHandlesUserWithoutPhone() {

        User user = User.builder()
                .id(20L)
                .fullName("No Phone User")
                .email("nophone@test.com")
                .phone(null)
                .enabled(true)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        when(userRepository.findByEmail("nophone@test.com"))
                .thenReturn(Optional.of(user));

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("nophone@test.com");

        String response = authService.forgotPassword(request);

        // Same generic message — never reveals internal state
        assertTrue(response.contains("OTP has been sent"));
        verify(smsService, never()).send(anyString(), anyString());
    }

    @Test
    void forgotPasswordDeletesOldTokenBeforeCreatingNew() {

        User user = testUser();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(1);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-otp");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        authService.forgotPassword(request);

        // Old token deleted, new one saved
        verify(passwordResetTokenRepository).deleteByUserId(10L);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));
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
                    .phone("+91900000000" + role.ordinal())
                    .enabled(true)
                    .role(new Role((long) role.ordinal() + 1, role))
                    .build();

            when(userRepository.findByEmail(user.getEmail()))
                    .thenReturn(Optional.of(user));
            when(passwordResetTokenRepository.findByUserId(user.getId()))
                    .thenReturn(Optional.empty());
            when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));
            when(passwordEncoder.encode(anyString())).thenReturn("hashed-otp");

            ForgotPasswordRequest request = new ForgotPasswordRequest();
            request.setEmail(user.getEmail());

            String response = authService.forgotPassword(request);

            assertTrue(response.contains("OTP has been sent"),
                    role + " should receive OTP");
            verify(smsService).send(eq(user.getPhone()), anyString());

            // Reset mocks for next iteration
            reset(userRepository, passwordResetTokenRepository, smsService, passwordEncoder);
        }
    }

    @Test
    void forgotPasswordDoesNotReturnOtpInResponse() {

        User user = testUser();
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(0);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-otp");

        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@test.com");

        String response = authService.forgotPassword(request);

        // Response must NEVER contain the actual OTP or its hash
        assertFalse(response.matches(".*\\d{6}.*"),
                "Response must not contain the OTP digits");
        assertFalse(response.contains("hashed-otp"));
    }

    // ---- Verify OTP Tests ----

    @Test
    void verifyOtpSucceedsForValidOtp() {

        User user = testUser();
        String otpHash = "$2a$10$hashedotp"; // Simulated bcrypt hash
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .verified(false)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));
        when(passwordEncoder.matches("482913", otpHash)).thenReturn(true);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("482913");

        VerifyResetOtpResponse response = authService.verifyResetOtp(request);

        assertNotNull(response.getResetToken());
        assertEquals("OTP verified successfully.", response.getMessage());
        // Verify the record was updated
        verify(passwordResetTokenRepository).save(argThat(r ->
                r.getVerified() && r.getToken() != null));
    }

    @Test
    void verifyOtpFailsForInvalidOtp() {

        User user = testUser();
        String otpHash = "$2a$10$hashedotp";
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .verified(false)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));
        when(passwordEncoder.matches("111111", otpHash)).thenReturn(false);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("111111");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("Invalid OTP"));
        assertTrue(ex.getMessage().contains("attempt(s) remaining"));
        // Attempts should be incremented
        assertEquals(1, resetRecord.getAttempts());
    }

    @Test
    void verifyOtpIncrementsAttemptsOnFailure() {

        User user = testUser();
        String otpHash = "$2a$10$hashedotp";
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .attempts(2) // Already 2 failed attempts
                .verified(false)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));
        when(passwordEncoder.matches("111111", otpHash)).thenReturn(false);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("111111");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("2 attempt(s) remaining"));
        assertEquals(3, resetRecord.getAttempts());
    }

    @Test
    void verifyOtpInvalidatesAfterMaxAttempts() {

        User user = testUser();
        String otpHash = "$2a$10$hashedotp";
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .attempts(4) // Already 4 failed attempts
                .verified(false)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));
        when(passwordEncoder.matches("111111", otpHash)).thenReturn(false);

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("111111");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("Too many incorrect attempts"));
        verify(passwordResetTokenRepository).delete(resetRecord);
    }

    @Test
    void verifyOtpFailsForExpiredOtp() {

        User user = testUser();
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash("$2a$10$hashedotp")
                .expiryDate(LocalDateTime.now().minusMinutes(1))
                .attempts(0)
                .verified(false)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("482913");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("expired"));
        verify(passwordResetTokenRepository).delete(resetRecord);
    }

    @Test
    void verifyOtpFailsForAlreadyVerifiedOtp() {

        User user = testUser();
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .id(1L)
                .user(user)
                .otpHash(null)
                .token("existing-reset-token")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .attempts(0)
                .verified(true)
                .maskedPhone("+91******3210")
                .build();

        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.of(resetRecord));

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("482913");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("already verified"));
    }

    @Test
    void verifyOtpFailsForNonExistentEmail() {

        when(userRepository.findByEmail("unknown@test.com"))
                .thenReturn(Optional.empty());

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("unknown@test.com");
        request.setOtp("482913");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        // Same error for non-existent email — prevents enumeration
        assertTrue(ex.getMessage().contains("Invalid or expired OTP"));
    }

    @Test
    void verifyOtpFailsWhenNoActiveOtp() {

        User user = testUser();
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findByUserId(10L))
                .thenReturn(Optional.empty());

        VerifyResetOtpRequest request = new VerifyResetOtpRequest();
        request.setEmail("test@test.com");
        request.setOtp("482913");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.verifyResetOtp(request));

        assertTrue(ex.getMessage().contains("No active OTP"));
    }

    @Test
    void requestingNewOtpInvalidatesPreviousOtp() {

        User user = testUser();
        when(userRepository.findByEmail("test@test.com"))
                .thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.deleteByUserId(10L)).thenReturn(1);
        when(passwordResetTokenRepository.save(any(PasswordResetToken.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("new-hashed-otp");

        // First request
        ForgotPasswordRequest request1 = new ForgotPasswordRequest();
        request1.setEmail("test@test.com");
        authService.forgotPassword(request1);

        // Second request — should delete old OTP
        ForgotPasswordRequest request2 = new ForgotPasswordRequest();
        request2.setEmail("test@test.com");
        authService.forgotPassword(request2);

        // Old token deleted twice (once per request), new one saved twice
        verify(passwordResetTokenRepository, times(2)).deleteByUserId(10L);
        verify(passwordResetTokenRepository, times(2)).save(any(PasswordResetToken.class));
    }

    // ---- Reset Password Tests (after OTP verification) ----

    @Test
    void resetPasswordWithValidTokenSucceeds() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("valid-reset-token")
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(true) // OTP was verified
                .build();

        when(passwordResetTokenRepository.findByToken("valid-reset-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPass123")).thenReturn("encoded-new-pass");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("valid-reset-token");
        request.setNewPassword("newPass123");

        authService.resetPassword(request);

        verify(userRepository).save(argThat(u -> u.getPassword().equals("encoded-new-pass")));
        verify(passwordResetTokenRepository).delete(token);
    }

    @Test
    void resetPasswordWithExpiredTokenFails() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("expired-token")
                .user(user)
                .expiryDate(LocalDateTime.now().minusMinutes(5))
                .verified(true)
                .build();

        when(passwordResetTokenRepository.findByToken("expired-token"))
                .thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("expired-token");
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
        request.setResetToken("bad-token");
        request.setNewPassword("newPass123");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.resetPassword(request));

        assertTrue(ex.getMessage().contains("Invalid reset token"));
    }

    @Test
    void resetPasswordWithUnverifiedOtpTokenFails() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("unverified-token")
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(false) // OTP NOT verified
                .build();

        when(passwordResetTokenRepository.findByToken("unverified-token"))
                .thenReturn(Optional.of(token));

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("unverified-token");
        request.setNewPassword("newPass123");

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.resetPassword(request));

        assertTrue(ex.getMessage().contains("Invalid reset token"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPasswordEnablesDisabledUser() {

        User user = testUser();
        user.setEnabled(false);
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("valid-token")
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(true)
                .build();

        when(passwordResetTokenRepository.findByToken("valid-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPass123")).thenReturn("encoded-new-pass");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("valid-token");
        request.setNewPassword("newPass123");

        authService.resetPassword(request);

        verify(userRepository).save(argThat(User::getEnabled));
    }

    @Test
    void resetPasswordCannotBeReused() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("single-use-token")
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(true)
                .build();

        when(passwordResetTokenRepository.findByToken("single-use-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("newPass123")).thenReturn("encoded-new-pass");

        // First use succeeds
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("single-use-token");
        request.setNewPassword("newPass123");
        authService.resetPassword(request);

        // Token is deleted after use
        verify(passwordResetTokenRepository).delete(token);

        // Second use fails
        when(passwordResetTokenRepository.findByToken("single-use-token"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> authService.resetPassword(request));

        assertTrue(ex.getMessage().contains("Invalid reset token"));
    }

    @Test
    void passwordIsSecurelyHashed() {

        User user = testUser();
        PasswordResetToken token = PasswordResetToken.builder()
                .id(1L)
                .token("hash-check-token")
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .verified(true)
                .build();

        when(passwordResetTokenRepository.findByToken("hash-check-token"))
                .thenReturn(Optional.of(token));
        when(passwordEncoder.encode("MyPassword@123"))
                .thenReturn("$2a$10$encodedpasswordhash");

        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setResetToken("hash-check-token");
        request.setNewPassword("MyPassword@123");

        authService.resetPassword(request);

        verify(userRepository).save(argThat(u ->
                u.getPassword().startsWith("$2a$") // bcrypt prefix
                        && !u.getPassword().equals("MyPassword@123")));
    }
}
