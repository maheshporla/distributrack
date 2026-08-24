package com.distributrack.security;

import com.distributrack.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Service
public class JwtService {

    /**
     * Signing secret. Override via the APP_JWT_SECRET environment
     * variable in production; the default keeps local development
     * tokens working as before.
     */
    @Value("${app.jwt.secret:MyDistribuTrackSecretKeyMyDistribuTrackSecretKey12345}")
    private String secret = "MyDistribuTrackSecretKeyMyDistribuTrackSecretKey12345";

    /** Access-token lifetime. Configurable via APP_JWT_ACCESS_EXPIRATION_MS. */
    private static final long ACCESS_TOKEN_EXPIRATION =
            1000L * 60 * 60 * 24;     // 24 Hours

    private static final long REFRESH_TOKEN_EXPIRATION =
            1000L * 60 * 60 * 24 * 7; // 7 Days

    private SecretKey secretKey;

    /** Lazy so both Spring (@Value injects) and plain instantiation work. */
    private SecretKey secretKey() {
        if (secretKey == null) {
            secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        }
        return secretKey;
    }

    /**
     * Issues an access token carrying the claims the client needs for
     * role-based behavior:
     *   - sub      -> email (kept for backward compatibility)
     *   - userId   -> user id
     *   - fullName -> user's full name
     *   - role     -> role name (e.g. OWNER)
     *
     * Passwords are never embedded in the token.
     */
    public String generateAccessToken(User user) {

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("fullName", user.getFullName())
                .claim("role", user.getRole().getName().name())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()
                        + ACCESS_TOKEN_EXPIRATION))
                .signWith(secretKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefreshToken(String email) {

        return Jwts.builder()
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis()
                        + REFRESH_TOKEN_EXPIRATION))
                .signWith(secretKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token,
                              Function<Claims, T> resolver) {

        Claims claims = Jwts.parser()
                .verifyWith(secretKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return resolver.apply(claims);
    }

    public boolean isTokenValid(String token, String email) {
        return extractEmail(token).equals(email);
    }
}