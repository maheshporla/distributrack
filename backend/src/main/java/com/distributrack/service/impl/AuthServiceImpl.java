package com.distributrack.service.impl;
import com.distributrack.dto.request.ChangePasswordRequest;
import com.distributrack.dto.request.LoginRequest;
import com.distributrack.dto.request.LogoutRequest;
import com.distributrack.dto.request.RefreshTokenRequest;
import com.distributrack.dto.request.RegisterRequest;
import com.distributrack.dto.request.UpdateProfileRequest;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.enums.RoleName;
import com.distributrack.security.CurrentUserService;
import com.distributrack.entity.RefreshToken;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.service.AuthService;
import com.distributrack.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import com.distributrack.dto.request.ForgotPasswordRequest;
import com.distributrack.dto.request.ResetPasswordRequest;
import com.distributrack.dto.request.VerifyResetOtpRequest;
import com.distributrack.entity.PasswordResetToken;
import com.distributrack.repository.PasswordResetTokenRepository;

import com.distributrack.notification.SmsService;
import com.distributrack.dto.response.VerifyResetOtpResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.UUID;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final SmsService smsService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    private final CurrentUserService currentUserService;
    @Override
    public AuthResponse register(RegisterRequest request) {

        // SECURITY: public self-registration must never be able to create
        // privileged accounts. Only SHOPKEEPER and DELIVERY_BOY are allowed
        // through public registration. All other roles (SUPER_ADMIN, OWNER,
        // MANAGER, SALESMAN) are created by authenticated staff via
        // /api/users endpoints.
        if (request.getRole() != RoleName.SHOPKEEPER
                && request.getRole() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException(
                    "Public registration is only allowed for Shopkeeper and Delivery Partner roles"
            );
        }

        // A fresh system must bootstrap the first SUPER_ADMIN before any
        // registration; otherwise public registration could lock
        // the system out of first-admin setup (which requires an empty
        // users table).
        if (!userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)) {
            throw new RuntimeException(
                    "Registration is unavailable until the first administrator account is created"
            );
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        boolean isDeliveryBoy = request.getRole() == RoleName.DELIVERY_BOY;

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .shopName(trimToNull(request.getShopName()))
                .address(trimToNull(request.getAddress()))
                .city(trimToNull(request.getCity()))
                .vehicleType(trimToNull(request.getVehicleType()))
                .vehicleNumber(trimToNull(request.getVehicleNumber()))
                // Delivery partners require admin approval before they can
                // log in or access the delivery portal.
                .enabled(!isDeliveryBoy)
                .role(role)
                .build();

        userRepository.save(user);

        if (isDeliveryBoy) {
            // No tokens — the account is disabled until an admin approves it.
            log.info("Delivery partner registered: {} (pending approval)",
                    user.getEmail());
            return AuthResponse.builder()
                    .message("Registration submitted successfully. Your account is waiting for admin approval.")
                    .build();
        }

        RefreshTokenResponse tokenResponse =
                refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .message("User Registered Successfully")
                .accessToken(tokenResponse.getAccessToken())
                .refreshToken(tokenResponse.getRefreshToken())
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        RefreshTokenResponse tokenResponse =
                refreshTokenService.createRefreshToken(user);

        return AuthResponse.builder()
                .message("Login Successful")
                .accessToken(tokenResponse.getAccessToken())
                .refreshToken(tokenResponse.getRefreshToken())
                .build();
    }

    @Override
    public RefreshTokenResponse refreshToken(RefreshTokenRequest request) {

        return refreshTokenService.refreshToken(request.getRefreshToken());
    }

    @Override
    public void logout(LogoutRequest request) {

        RefreshToken token =
                refreshTokenService.findByToken(request.getRefreshToken());

        refreshTokenService.deleteRefreshToken(token.getUser().getId());
    }
    @Override
    public void changePassword(String email,
                               ChangePasswordRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(
                request.getOldPassword(),
                user.getPassword())) {

            throw new RuntimeException("Old password is incorrect");
        }

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );

        userRepository.save(user);
    }
    private static final int OTP_LENGTH = 6;
    private static final int OTP_MIN = 100000;
    private static final int OTP_MAX = 999999;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;

    private final SecureRandom secureRandom = new SecureRandom();

    // =========================================================
    // OTP Password Reset Flow
    // =========================================================

    /**
     * Generate a cryptographically secure 6-digit OTP (100000–999999).
     * Never uses Math.random() or java.util.Random.
     */
    private String generateOtp() {
        int otp = OTP_MIN + secureRandom.nextInt(OTP_MAX - OTP_MIN + 1);
        return String.valueOf(otp);
    }

    /**
     * Mask a phone number for safe display: +91******1234
     * Shows country code (first 3 chars) and last 4 digits.
     */
    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return "******";
        }
        String clean = phone.startsWith("+") ? phone.substring(1) : phone;
        String countryCode = clean.length() >= 12 ? clean.substring(0, 3) : "+91";
        String lastFour = clean.substring(clean.length() - 4);
        int starCount = clean.length() - 7;
        return "+" + countryCode + "*".repeat(Math.max(starCount, 6)) + lastFour;
    }

    @Override
    @Transactional
    public String forgotPassword(ForgotPasswordRequest request) {

        log.info("[OTP-RESET] Password reset requested for email={}", request.getEmail());

        // SECURITY: Always return the same generic message regardless of
        // whether the email exists — prevents user enumeration.
        String genericMessage = "If an account exists, an OTP has been sent to the registered phone number.";

        var userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty()) {
            log.info("[OTP-RESET] No user found for email={} — returning generic response", request.getEmail());
            return genericMessage;
        }

        User user = userOpt.get();
        log.info("[OTP-RESET] User found: id={}, email={}", user.getId(), user.getEmail());

        // Validate user has a registered phone number
        if (user.getPhone() == null || user.getPhone().isBlank()) {
            log.warn("[OTP-RESET] User has no registered phone number (user={})", user.getId());
            // Return same generic message — never reveal internal state
            return genericMessage;
        }

        // Delete ALL old reset tokens for this user.
        // The @OneToOne on user_id creates a UNIQUE constraint in MySQL,
        // so we MUST remove the old row before inserting a new one.
        int deleted = passwordResetTokenRepository.deleteByUserId(user.getId());
        if (deleted > 0) {
            log.info("[OTP-RESET] Deleted {} old token(s) for user={}", deleted, user.getId());
        }

        // Generate and hash the OTP
        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        // Create the reset record with OTP
        PasswordResetToken resetRecord = PasswordResetToken.builder()
                .user(user)
                .otpHash(otpHash)
                .expiryDate(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .attempts(0)
                .verified(false)
                .maskedPhone(maskPhone(user.getPhone()))
                .build();

        passwordResetTokenRepository.save(resetRecord);
        log.info("[OTP-RESET] OTP record created for user={}", user.getId());

        // Send OTP via SMS using the user's registered phone number
        String smsMessage = "Your DistribuTrack password reset OTP is: " + otp + ". It expires in 5 minutes. Do not share this code.";
        smsService.send(user.getPhone(), smsMessage);
        log.info("[OTP-RESET] SMS send initiated for user={}", user.getId());

        // Always return the same message — never reveal whether the email exists
        return genericMessage;
    }

    @Override
    @Transactional
    public VerifyResetOtpResponse verifyResetOtp(VerifyResetOtpRequest request) {

        log.info("[OTP-RESET] OTP verification requested for email={}", request.getEmail());

        var userOpt = userRepository.findByEmail(request.getEmail());
        if (userOpt.isEmpty()) {
            // SECURITY: Same error for non-existent email — prevents enumeration
            throw new RuntimeException("Invalid or expired OTP");
        }

        User user = userOpt.get();

        // Find the active OTP record for this user
        PasswordResetToken resetRecord = passwordResetTokenRepository
                .findByUserId(user.getId())
                .orElseThrow(() -> new RuntimeException("No active OTP. Please request a new one."));

        // Check if OTP is already verified (cannot reuse)
        if (Boolean.TRUE.equals(resetRecord.getVerified())) {
            log.warn("[OTP-RESET] OTP already verified for user={}", user.getId());
            throw new RuntimeException("OTP already verified. Please request a new one.");
        }

        // Check if OTP has expired
        if (resetRecord.getExpiryDate().isBefore(LocalDateTime.now())) {
            log.warn("[OTP-RESET] OTP expired for user={}", user.getId());
            passwordResetTokenRepository.delete(resetRecord);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        // Check attempt limit
        if (resetRecord.getAttempts() >= MAX_OTP_ATTEMPTS) {
            log.warn("[OTP-RESET] Max attempts exceeded for user={}", user.getId());
            passwordResetTokenRepository.delete(resetRecord);
            throw new RuntimeException("Too many incorrect attempts. Please request a new OTP.");
        }

        // Verify the OTP
        boolean otpValid = passwordEncoder.matches(request.getOtp(), resetRecord.getOtpHash());

        if (!otpValid) {
            resetRecord.setAttempts(resetRecord.getAttempts() + 1);
            int remainingAttempts = MAX_OTP_ATTEMPTS - resetRecord.getAttempts();
            passwordResetTokenRepository.save(resetRecord);

            if (remainingAttempts <= 0) {
                log.warn("[OTP-RESET] OTP invalidated after max attempts for user={}", user.getId());
                passwordResetTokenRepository.delete(resetRecord);
                throw new RuntimeException("Too many incorrect attempts. Please request a new OTP.");
            }

            log.warn("[OTP-RESET] Invalid OTP for user={}, attempts={}", user.getId(), resetRecord.getAttempts());
            throw new RuntimeException("Invalid OTP. " + remainingAttempts + " attempt(s) remaining.");
        }

        // OTP is valid — issue a short-lived reset token
        String resetToken = UUID.randomUUID().toString();
        resetRecord.setToken(resetToken);
        resetRecord.setVerified(true);
        resetRecord.setOtpHash(null); // Clear OTP hash — no longer needed
        resetRecord.setExpiryDate(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        resetRecord.setAttempts(0);
        passwordResetTokenRepository.save(resetRecord);

        log.info("[OTP-RESET] OTP verified and reset token issued for user={}", user.getId());

        return VerifyResetOtpResponse.builder()
                .message("OTP verified successfully.")
                .resetToken(resetToken)
                .build();
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {

        log.info("[RESET-PASSWORD] Password reset requested");

        PasswordResetToken passwordResetToken = passwordResetTokenRepository
                .findByToken(request.getResetToken())
                .orElseThrow(() -> {
                    log.warn("[RESET-PASSWORD] Invalid or non-existent token");
                    return new RuntimeException("Invalid reset token");
                });

        // Validate the reset token was verified via OTP (not a stale/old-style token)
        if (!Boolean.TRUE.equals(passwordResetToken.getVerified())) {
            log.warn("[RESET-PASSWORD] Token not verified via OTP for user={}", passwordResetToken.getUser().getId());
            throw new RuntimeException("Invalid reset token");
        }

        // Validate expiry
        if (passwordResetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            log.warn("[RESET-PASSWORD] Token expired for user={}", passwordResetToken.getUser().getId());
            passwordResetTokenRepository.delete(passwordResetToken);
            throw new RuntimeException("Reset token has expired");
        }

        User user = passwordResetToken.getUser();
        log.info("[RESET-PASSWORD] Valid verified token for user={}; resetting password", user.getId());

        // Hash and set the new password
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEnabled(true);
        userRepository.save(user);

        // Invalidate the reset token — prevent reuse
        passwordResetTokenRepository.delete(passwordResetToken);

        log.info("[RESET-PASSWORD] Password reset completed for user={}", user.getId());
    }

    @Override
    public UserResponse getCurrentUser() {

        User user = currentUserService.getCurrentUser();

        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .shopName(user.getShopName())
                .address(user.getAddress())
                .latitude(user.getLatitude())
                .longitude(user.getLongitude())
                .role(user.getRole().getName())
                .enabled(user.getEnabled())
                .emailNotificationsEnabled(user.getEmailNotificationsEnabled())
                .smsNotificationsEnabled(user.getSmsNotificationsEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    public UserResponse updateProfile(String email, UpdateProfileRequest request) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newPhone = request.getPhone().trim();

        // Check if phone number already exists for another user
        userRepository.findByPhone(newPhone).ifPresent(otherUser -> {
            if (!otherUser.getId().equals(user.getId())) {
                throw new RuntimeException("Phone number already exists");
            }
        });

        user.setFullName(request.getFullName().trim());
        user.setPhone(newPhone);
        user.setShopName(trimToNull(request.getShopName()));
        user.setAddress(trimToNull(request.getAddress()));
        // Update shop location if provided (nullable — clearing is allowed).
        user.setLatitude(request.getLatitude());
        user.setLongitude(request.getLongitude());
        if (request.getEmailNotificationsEnabled() != null) {
            user.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
        }
        if (request.getSmsNotificationsEnabled() != null) {
            user.setSmsNotificationsEnabled(request.getSmsNotificationsEnabled());
        }

        User savedUser = userRepository.save(user);

        return UserResponse.builder()
                .id(savedUser.getId())
                .fullName(savedUser.getFullName())
                .email(savedUser.getEmail())
                .phone(savedUser.getPhone())
                .shopName(savedUser.getShopName())
                .address(savedUser.getAddress())
                .latitude(savedUser.getLatitude())
                .longitude(savedUser.getLongitude())
                .role(savedUser.getRole().getName())
                .enabled(savedUser.getEnabled())
                .emailNotificationsEnabled(savedUser.getEmailNotificationsEnabled())
                .smsNotificationsEnabled(savedUser.getSmsNotificationsEnabled())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}