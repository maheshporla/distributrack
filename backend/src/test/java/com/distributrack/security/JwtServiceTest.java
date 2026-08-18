package com.distributrack.security;

import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService();

    @Test
    void accessTokenCarriesUserIdFullNameRoleAndEmail() {

        Role role = new Role(1L, RoleName.OWNER);

        User user = User.builder()
                .id(42L)
                .fullName("Test Owner")
                .email("owner@test.com")
                .role(role)
                .build();

        String token = jwtService.generateAccessToken(user);

        assertNotNull(token);

        // Existing claim kept: sub == email.
        assertEquals("owner@test.com", jwtService.extractEmail(token));

        // New claims.
        Long userId = jwtService.extractClaim(token, claims -> claims.get("userId", Long.class));
        assertEquals(42L, userId.longValue());
        assertEquals("Test Owner", jwtService.extractClaim(token, claims -> claims.get("fullName", String.class)));
        assertEquals("OWNER", jwtService.extractClaim(token, claims -> claims.get("role", String.class)));
    }
}
