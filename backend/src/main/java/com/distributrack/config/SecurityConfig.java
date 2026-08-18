package com.distributrack.config;

import com.distributrack.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})

                .authorizeHttpRequests(auth -> auth

                        // =====================================================
                        // Public APIs (no authentication)
                        // =====================================================
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                // Gateway webhook — public because the
                                // gateway cannot authenticate; the payload
                                // signature (HMAC) is the gate, verified
                                // in PaymentServiceImpl.handleWebhook.
                                "/api/payments/webhook"
                        ).permitAll()

                        // First-admin setup — publicly reachable so the
                        // operator can bootstrap a fresh system, but the
                        // service hard-gates it to an empty users table
                        // (see SetupServiceImpl). Once the first
                        // SUPER_ADMIN exists these endpoints reject all
                        // calls.
                        .requestMatchers("/api/setup/**")
                        .permitAll()

                        // =====================================================
                        // Authenticated auth endpoints
                        // =====================================================
                        .requestMatchers(
                                "/api/auth/me",
                                "/api/auth/logout",
                                "/api/auth/change-password",
                                "/api/auth/profile"
                        ).authenticated()

                        // =====================================================
                        // Notifications — any authenticated user; ownership
                        // (own notifications only) is enforced in the service
                        // via the JWT principal.
                        // =====================================================
                        .requestMatchers("/api/notifications/**")
                        .authenticated()

                        // =====================================================
                        // Super Admin only
                        // =====================================================
                        .requestMatchers("/api/admin/**")
                        .hasRole("SUPER_ADMIN")

                        // =====================================================
                        // Owner only
                        // =====================================================
                        .requestMatchers("/api/owner/**")
                        .hasRole("OWNER")

                        // =====================================================
                        // Manager (operational) — OWNER also manages
                        // =====================================================
                        .requestMatchers("/api/manager/**")
                        .hasAnyRole("OWNER", "MANAGER")

                        // =====================================================
                        // Audit trail — who did what
                        // =====================================================
                        .requestMatchers("/api/audit-logs/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER")

                        // =====================================================
                        // Users / staff / customers
                        // =====================================================
                        // SALESMAN may view customers (SHOPKEEPER accounts).
                        .requestMatchers(HttpMethod.GET, "/api/users/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN")

                        .requestMatchers("/api/users/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Products — read/write separation
                        // =====================================================
                        // Read: all business roles incl. SALESMAN and SHOPKEEPER
                        .requestMatchers(HttpMethod.GET, "/api/products/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER")

                        // Write: admin roles only
                        .requestMatchers("/api/products/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Inventory — read/write separation
                        // =====================================================
                        .requestMatchers(HttpMethod.GET, "/api/inventory/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN")

                        .requestMatchers("/api/inventory/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Warehouses — management only (per requirements)
                        // =====================================================
                        .requestMatchers("/api/warehouses/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Orders
                        // =====================================================
                        // Read + create: SHOPKEEPER creates own orders, SALESMAN
                        // manages sales orders (ownership enforced in service).
                        .requestMatchers(HttpMethod.GET, "/api/orders/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER")

                        .requestMatchers(HttpMethod.POST, "/api/orders/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER")

                        // Status updates (approval / rejection): sales staff
                        // approve the orders they handle (sales workflow) plus
                        // the operational admin roles.
                        .requestMatchers(HttpMethod.PUT, "/api/orders/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN")

                        // Delete: admin roles only
                        .requestMatchers(HttpMethod.DELETE, "/api/orders/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Deliveries
                        // =====================================================
                        // Read: DELIVERY_BOY + SHOPKEEPER see only their own
                        // deliveries (enforced in service).
                        .requestMatchers(HttpMethod.GET, "/api/delivery/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "DELIVERY_BOY", "SHOPKEEPER")

                        // Status + live location updates: DELIVERY_BOY for own
                        // deliveries only (enforced in service).
                        .requestMatchers(HttpMethod.PUT, "/api/delivery/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "DELIVERY_BOY")

                        // Assignment + delete: admin roles only
                        .requestMatchers("/api/delivery/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Payments
                        // =====================================================
                        // Read: SHOPKEEPER sees own orders' payments only
                        // (enforced in service). SALESMAN has business access.
                        .requestMatchers(HttpMethod.GET, "/api/payments/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER")

                        // Online payment flow: the SHOPKEEPER pays for their
                        // own DELIVERED orders. The backend verifies the
                        // signature/capture server-side — the frontend is
                        // never trusted. SALESMAN is deliberately excluded.
                        // UPI initiation is also SHOPKEEPER-only (the admin
                        // verifies UPI payments via PUT /status).
                        .requestMatchers(HttpMethod.POST, "/api/payments/initiate", "/api/payments/verify", "/api/payments/upi-initiate")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SHOPKEEPER")

                        // Manual recording + status changes: admin roles only
                        .requestMatchers("/api/payments/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Invoices (derived, read-only — see InvoiceController)
                        // =====================================================
                        // SHOPKEEPER sees own orders' invoices (service-scoped);
                        // SALESMAN has business view; DELIVERY_BOY is denied.
                        .requestMatchers(HttpMethod.GET, "/api/invoices/**")
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER")

                        // =====================================================
                        // Reports / Analytics / Dashboard — business-wide
                        // =====================================================
                        .requestMatchers(
                                "/api/reports/**",
                                "/api/analytics/**",
                                "/api/dashboard/**"
                        )
                        .hasAnyRole("SUPER_ADMIN", "OWNER", "MANAGER")

                        // =====================================================
                        // Any other request
                        // =====================================================
                        .anyRequest()
                        .authenticated()
                )

                // =============================================================
                // Stateless Session
                // =============================================================
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // =============================================================
                // Authentication Provider
                // =============================================================
                .authenticationProvider(authenticationProvider)

                // =============================================================
                // JWT Authentication Filter
                // =============================================================
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )

                // =============================================================
                // Error semantics: 401 for missing/invalid credentials, 403
                // for authenticated-but-forbidden. The frontend treats 401 as
                // "session expired — sign in again" and 403 as "not allowed".
                // =============================================================
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"status\":401,\"error\":\"Unauthorized\","
                                            + "\"message\":\"Authentication is required or the token is invalid/expired\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"status\":403,\"error\":\"Forbidden\","
                                            + "\"message\":\"You do not have permission to perform this action\"}"
                            );
                        })
                );

        return http.build();
    }
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of(
                "https://distributrack.vercel.app",
                "https://distributrack-mzmfv6unm-maheshporla93-4929s-projects.vercel.app"
        ));

        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "DELETE",
                "PATCH",
                "OPTIONS"
        ));

        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type"
        ));

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
