package com.distributrack.config;

import com.distributrack.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final AuthenticationProvider authenticationProvider;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(
                                "/test",
                                "/api/auth/**"
                        ).permitAll()

                        .requestMatchers("/api/admin/**")
                        .hasRole("SUPER_ADMIN")

                        .requestMatchers("/api/owner/**")
                        .hasRole("OWNER")

                        .requestMatchers("/api/manager/**")
                        .hasAnyRole("OWNER", "MANAGER")

                        .requestMatchers("/api/products/**")
                        .hasAnyRole("OWNER", "MANAGER")

                        .requestMatchers("/api/orders/**")
                        .hasAnyRole(
                                "OWNER",
                                "MANAGER",
                                "SALESMAN",
                                "SHOPKEEPER"
                        )

                        .requestMatchers("/api/delivery/**")
                        .hasAnyRole(
                                "OWNER",
                                "MANAGER",
                                "DELIVERY_BOY"
                        )

                        .anyRequest()
                        .authenticated()
                )

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authenticationProvider(authenticationProvider)

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}