package com.distributrack;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.distributrack.dto.request.CreateUserRequest;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.PasswordResetTokenRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BackendApplicationTests {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void contextLoads() {
    }

    @Test
    void testCreateDeliveryBoyConstraintsAndEncoding() {
        // 1. Setup authenticated admin context
        User admin = User.builder()
                .email("admin@distributrack.com")
                .role(new Role(null, RoleName.SUPER_ADMIN))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, admin.getAuthorities())
        );

        // 2. Prepare user request
        String email = "verify.boy@example.com";
        String phone = "9998887776";
        String rawPassword = "password123";

        // Clean up if previous runs left it — must remove tokens first
        // because the FK from password_reset_tokens.user_id prevents user deletion.
        userRepository.findByEmail(email).ifPresent(u -> {
            passwordResetTokenRepository.findByUserId(u.getId())
                    .ifPresent(passwordResetTokenRepository::delete);
            userRepository.delete(u);
        });

        CreateUserRequest request = CreateUserRequest.builder()
                .fullName("Verify Delivery Boy")
                .email(email)
                .password(rawPassword)
                .phone(phone)
                .role(RoleName.DELIVERY_BOY)
                .build();

        // 3. Create user and verify response
        var response = userService.createUser(request);
        assertNotNull(response);
        assertEquals(email, response.getEmail());
        assertEquals(RoleName.DELIVERY_BOY, response.getRole());

        // 4. Retrieve from DB and verify password is encrypted
        User persisted = userRepository.findByEmail(email).orElse(null);
        assertNotNull(persisted);
        assertNotEquals(rawPassword, persisted.getPassword());
        assertTrue(passwordEncoder.matches(rawPassword, persisted.getPassword()));

        // 5. Verify duplicate email check
        Exception emailEx = assertThrows(RuntimeException.class, () -> {
            userService.createUser(request);
        });
        assertEquals("Email already exists", emailEx.getMessage());

        // 6. Verify duplicate phone check
        CreateUserRequest phoneDupRequest = CreateUserRequest.builder()
                .fullName("Different Name")
                .email("different.email@example.com")
                .password(rawPassword)
                .phone(phone)
                .role(RoleName.DELIVERY_BOY)
                .build();
        Exception phoneEx = assertThrows(RuntimeException.class, () -> {
            userService.createUser(phoneDupRequest);
        });
        assertEquals("Phone number already exists", phoneEx.getMessage());

        // Cleanup — remove tokens first to satisfy FK constraint
        passwordResetTokenRepository.findByUserId(persisted.getId())
                .ifPresent(passwordResetTokenRepository::delete);
        userRepository.delete(persisted);
        SecurityContextHolder.clearContext();
    }
}
