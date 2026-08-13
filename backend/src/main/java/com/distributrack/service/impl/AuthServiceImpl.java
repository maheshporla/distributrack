package com.distributrack.service.impl;
import com.distributrack.dto.request.ChangePasswordRequest;
import com.distributrack.dto.request.LoginRequest;
import com.distributrack.dto.request.LogoutRequest;
import com.distributrack.dto.request.RefreshTokenRequest;
import com.distributrack.dto.request.RegisterRequest;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
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

import java.util.UUID;
import java.time.LocalDateTime;
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokenService refreshTokenService;
    @Override
    public AuthResponse register(RegisterRequest request) {

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
    @Override
    public String forgotPassword(ForgotPasswordRequest request) {

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

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

        // Later you can send this by email
        return token;
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

        userRepository.save(user);

        passwordResetTokenRepository.delete(passwordResetToken);
    }




}