package com.distributrack.service;

import com.distributrack.dto.request.*;
import com.distributrack.dto.response.AuthResponse;
import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.dto.response.VerifyResetOtpResponse;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    RefreshTokenResponse refreshToken(RefreshTokenRequest request);

    void logout(LogoutRequest request);

    void changePassword(String email,
                        ChangePasswordRequest request);

    String forgotPassword(ForgotPasswordRequest request);

    VerifyResetOtpResponse verifyResetOtp(VerifyResetOtpRequest request);

    void resetPassword(ResetPasswordRequest request);

    /**
     * Returns the currently authenticated user, resolved from the
     * security context (never from a request parameter).
     */
    UserResponse getCurrentUser();

    UserResponse updateProfile(String email, UpdateProfileRequest request);
}