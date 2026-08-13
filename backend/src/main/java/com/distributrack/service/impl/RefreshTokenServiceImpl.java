package com.distributrack.service.impl;

import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.entity.RefreshToken;
import com.distributrack.entity.User;
import com.distributrack.repository.RefreshTokenRepository;
import com.distributrack.security.JwtService;
import com.distributrack.service.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;

    @Override
    public RefreshTokenResponse createRefreshToken(User user) {

        // Delete existing refresh token (if any)
        refreshTokenRepository.deleteByUserId(user.getId());

        // Generate new tokens
        String accessToken = jwtService.generateAccessToken(user.getEmail());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        // Save refresh token
        RefreshToken token = RefreshToken.builder()
                .token(refreshToken)
                .user(user)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .build();

        refreshTokenRepository.save(token);

        // Return both tokens
        return RefreshTokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public RefreshTokenResponse refreshToken(String refreshToken) {

        RefreshToken token = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() ->
                        new RuntimeException("Invalid Refresh Token"));

        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {

            refreshTokenRepository.delete(token);

            throw new RuntimeException("Refresh Token Expired");
        }

        String newAccessToken =
                jwtService.generateAccessToken(token.getUser().getEmail());

        return RefreshTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .build();
    }

    @Override
    public void deleteRefreshToken(Long userId) {

        refreshTokenRepository.deleteByUserId(userId);
    }
    @Override
    public RefreshToken findByToken(String refreshToken) {

        return refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() ->
                        new RuntimeException("Refresh Token Not Found"));
    }

}