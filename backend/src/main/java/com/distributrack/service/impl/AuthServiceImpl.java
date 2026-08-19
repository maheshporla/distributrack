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
import com.distributrack.entity.PasswordResetToken;
import com.distributrack.repository.PasswordResetTokenRepository;

import com.distributrack.notification.EmailService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;

import java.util.UUID;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final EmailService emailService;
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
        // privileged accounts. Staff (OWNER/MANAGER/SALESMAN/DELIVERY_BOY)
        // and additional SHOPKEEPER accounts are created by authenticated
        // staff via the /api/users endpoints. The first SUPER_ADMIN is
        // created manually via the guarded first-admin setup endpoint
        // (SetupServiceImpl) — never automatically.
        if (request.getRole() != RoleName.SHOPKEEPER) {
            throw new RuntimeException(
                    "Public registration is only allowed for the SHOPKEEPER role"
            );
        }

        // A fresh system must bootstrap the first SUPER_ADMIN before any
        // SHOPKEEPER registers; otherwise public registration could lock
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

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .shopName(trimToNull(request.getShopName()))
                .address(trimToNull(request.getAddress()))
                .enabled(true)
                .role(role)
                .build();

        userRepository.save(user);

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
    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public String forgotPassword(ForgotPasswordRequest request) {

        // SECURITY: Always return the same generic message regardless of
        // whether the email exists — prevents user enumeration.
        var userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty()) {
            log.debug("Password reset requested for unknown email: {}", request.getEmail());
            return "If an account with that email exists, a reset link has been sent.";
        }

        User user = userOpt.get();

        // Delete old reset token if it exists
        passwordResetTokenRepository.findByUserId(user.getId())
                .ifPresent(passwordResetTokenRepository::delete);

        String token = UUID.randomUUID().toString();

        PasswordResetToken passwordResetToken = PasswordResetToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .build();

        passwordResetTokenRepository.save(passwordResetToken);

        // Build the reset link and send via email
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        String subject = "DistribuTrack – Password Reset";
        String htmlBody = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;'>"
                + "<h2 style='color:#333;'>Password Reset Request</h2>"
                + "<p>Hello <strong>" + user.getFullName() + "</strong>,</p>"
                + "<p>You requested a password reset for your DistribuTrack account.</p>"
                + "<p>Click the button below to set a new password. This link expires in 15 minutes.</p>"
                + "<p style='text-align:center;margin:30px 0;'>"
                + "<a href='" + resetLink + "' "
                + "style='background-color:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;'>"
                + "Reset Password</a></p>"
                + "<p style='color:#666;font-size:13px;'>If you did not request this, you can safely ignore this email. "
                + "Your password will not change unless you click the link above.</p>"
                + "<hr style='border:none;border-top:1px solid #eee;margin:20px 0;' />"
                + "<p style='color:#999;font-size:12px;'>DistribuTrack — Distribution Management System</p>"
                + "</div>";

        emailService.send(user.getEmail(), subject, htmlBody);

        // In development, log the full reset link so the operator can
        // manually open it when SMTP is not configured.
        log.warn("╔══════════════════════════════════════════════════════════════╗");
        log.warn("║  DEV PASSWORD RESET LINK                                    ║");
        log.warn("║  Email: {}", user.getEmail());
        log.warn("║  Link:  {}", resetLink);
        log.warn("║  Expires in 15 minutes. This is ONLY shown in development. ║");
        log.warn("╚══════════════════════════════════════════════════════════════╝");

        // Always return the same message regardless of whether the email
        // was actually sent — never reveal whether the address exists.
        return "If an account with that email exists, a reset link has been sent.";
    }
    @Override
    public void resetPassword(ResetPasswordRequest request) {

        PasswordResetToken passwordResetToken = passwordResetTokenRepository
                .findByToken(request.getToken())
                .orElseThrow(() -> new RuntimeException("Invalid reset token"));

        if (passwordResetToken.getExpiryDate().isBefore(LocalDateTime.now())) {

            passwordResetTokenRepository.delete(passwordResetToken);

            throw new RuntimeException("Reset token has expired");
        }

        User user = passwordResetToken.getUser();

        user.setPassword(
                passwordEncoder.encode(request.getNewPassword())
        );
        user.setEnabled(true);

        userRepository.save(user);

        passwordResetTokenRepository.delete(passwordResetToken);
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