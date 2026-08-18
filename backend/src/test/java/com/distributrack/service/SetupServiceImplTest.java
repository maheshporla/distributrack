package com.distributrack.service;

import com.distributrack.dto.request.FirstAdminRequest;
import com.distributrack.dto.response.SetupStatusResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.service.impl.SetupServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.mockito.ArgumentCaptor;

class SetupServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    private final SetupServiceImpl setupService =
            new SetupServiceImpl(userRepository, roleRepository, passwordEncoder);

    private FirstAdminRequest request;

    @BeforeEach
    void setUp() {
        request = FirstAdminRequest.builder()
                .fullName("Root Admin")
                .email("root@example.com")
                .phone("1112223333")
                .password("rootpass123")
                .build();
    }

    @Test
    void statusIsSetupRequiredOnlyWhenNoSuperAdminExists() {
        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(false);
        assertTrue(setupService.getStatus().isSetupRequired());

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(true);
        assertFalse(setupService.getStatus().isSetupRequired());
    }

    @Test
    void createFirstAdminWorksOnEmptySystemAndEncodesPassword() {

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByPhone(request.getPhone())).thenReturn(false);
        when(roleRepository.findByName(RoleName.SUPER_ADMIN))
                .thenReturn(Optional.of(new Role(1L, RoleName.SUPER_ADMIN)));

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        UserResponse response = setupService.createFirstAdmin(request);

        assertEquals(RoleName.SUPER_ADMIN, response.getRole());
        assertTrue(response.getEnabled());

        // The saved user must have a BCrypt hash, never the raw password.
        User saved = captureSavedUser();
        assertNotNull(saved);
        assertNotEquals(request.getPassword(), saved.getPassword());
        assertTrue(passwordEncoder.matches(request.getPassword(), saved.getPassword()));
        assertEquals(RoleName.SUPER_ADMIN, saved.getRole().getName());
        assertTrue(saved.getEnabled());
    }

    @Test
    void createFirstAdminRejectsWhenSuperAdminAlreadyExists() {

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(true);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> setupService.createFirstAdmin(request)
        );

        assertTrue(ex.getMessage().contains("SUPER_ADMIN already exists"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createFirstAdminRejectsDuplicateEmail() {

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(true);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> setupService.createFirstAdmin(request)
        );

        assertEquals("Email already exists", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void createFirstAdminRejectsDuplicatePhone() {

        when(userRepository.existsByRole_Name(RoleName.SUPER_ADMIN)).thenReturn(false);
        when(userRepository.existsByEmail(request.getEmail())).thenReturn(false);
        when(userRepository.existsByPhone(request.getPhone())).thenReturn(true);

        RuntimeException ex = assertThrows(
                RuntimeException.class,
                () -> setupService.createFirstAdmin(request)
        );

        assertEquals("Phone number already exists", ex.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    private User captureSavedUser() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        return captor.getValue();
    }
}
