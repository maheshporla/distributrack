package com.distributrack.service;

import com.distributrack.dto.response.RefreshTokenResponse;
import com.distributrack.entity.RefreshToken;
import com.distributrack.entity.User;

public interface RefreshTokenService {

    RefreshTokenResponse createRefreshToken(User user);

    RefreshTokenResponse refreshToken(String refreshToken);

    void deleteRefreshToken(Long userId);

    RefreshToken findByToken(String refreshToken);

}