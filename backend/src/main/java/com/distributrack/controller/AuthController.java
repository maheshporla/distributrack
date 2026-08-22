package com.distributrack.controller;

import com.distributrack.dto.request.*;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.dto.response.VerifyResetOtpResponse;
import com.distributrack.security.JwtService;
import com.distributrack.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request) {

        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request) {

        return authService.login(request);
    }

    /**
     * Returns the currently authenticated user, resolved from the JWT
     * principal in the security context. Deliberately takes NO userId
     * parameter — the identity always comes from the token.
     */
    @GetMapping("/me")
    public UserResponse me() {
        return authService.getCurrentUser();
    }

    @PostMapping("/refresh")
    public RefreshTokenResponse refreshToken(
            @RequestBody RefreshTokenRequest request) {

        return authService.refreshToken(request);
    }

    @PostMapping("/logout")
    public String logout(
            @RequestBody LogoutRequest request) {

        authService.logout(request);

        return "Logout Successful";
    }

    @PutMapping("/change-password")
    public String changePassword(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody ChangePasswordRequest request) {

        String token = authHeader.substring(7);

        String email = jwtService.extractEmail(token);

        authService.changePassword(email, request);

        return "Password changed successfully";
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @Valid @RequestBody UpdateProfileRequest request) {

        String token = authHeader.substring(7);

        String email = jwtService.extractEmail(token);

        return authService.updateProfile(email, request);
    }

    @PostMapping("/forgot-password")
    public String forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        return authService.forgotPassword(request);
    }

    @PostMapping("/verify-reset-otp")
    public VerifyResetOtpResponse verifyResetOtp(
            @Valid @RequestBody VerifyResetOtpRequest request) {

        return authService.verifyResetOtp(request);
    }

    @PostMapping("/reset-password")
    public String resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        authService.resetPassword(request);

        return "Password reset successfully";
    }
}