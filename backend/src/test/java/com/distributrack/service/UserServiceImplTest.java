package com.distributrack.service;

import com.distributrack.dto.request.CreateUserRequest;
import com.distributrack.dto.request.UpdateUserRequest;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.enums.WorkerAvailability;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.impl.UserServiceImpl;
import com.distributrack.repository.PasswordResetTokenRepository;
import com.distributrack.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final RoleRepository roleRepository = mock(RoleRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final CurrentUserService currentUserService = mock(CurrentUserService.class);
    private final AuditService auditService = mock(AuditService.class);
    private final PasswordResetTokenRepository passwordResetTokenRepository = mock(PasswordResetTokenRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);

    private final UserServiceImpl userService = new UserServiceImpl(
            userRepository, roleRepository, passwordEncoder, currentUserService, auditService,
            passwordResetTokenRepository, notificationService
    );

    private User admin;
    private User shopkeeper;

    @BeforeEach
    void setUp() {
        admin = User.builder()
                .id(1L)
                .fullName("System Administrator")
                .email("admin@test.com")
                .phone("9000000000")
                .enabled(true)
                .role(new Role(1L, RoleName.SUPER_ADMIN))
                .build();

        shopkeeper = User.builder()
                .id(3L)
                .fullName("Shop One")
                .email("shop1@test.com")
                .phone("9000000001")
                .enabled(true)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        when(passwordEncoder.encode(any(String.class))).thenReturn("$2a$10$encoded");
        when(roleRepository.findByName(any(RoleName.class))).thenAnswer(invocation -> {
            RoleName roleName = invocation.getArgument(0);
            return Optional.of(new Role((long) roleName.ordinal() + 1, roleName));
        });
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private CreateUserRequest request(RoleName role) {
        return CreateUserRequest.builder()
                .fullName("New Worker")
                .email("worker@test.com")
                .phone("9111111111")
                .password("worker123")
                .role(role)
                .build();
    }

    @Test
    void superAdminCannotCreateAnotherSuperAdmin() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.createUser(request(RoleName.SUPER_ADMIN)));

        assertTrue(ex.getMessage().contains("first-admin setup"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void superAdminCanCreateOwner() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        UserResponse response = userService.createUser(request(RoleName.OWNER));

        assertEquals(RoleName.OWNER, response.getRole());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void managerCannotCreateOwner() {

        User manager = User.builder()
                .id(2L)
                .role(new Role(3L, RoleName.MANAGER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(manager);

        assertThrows(RuntimeException.class,
                () -> userService.createUser(request(RoleName.OWNER)));
    }

    @Test
    void superAdminSelfEditWithSameRoleIsAllowed() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);
        when(userRepository.findById(1L)).thenReturn(Optional.of(admin));

        UpdateUserRequest request = UpdateUserRequest.builder()
                .fullName("System Administrator")
                .phone("9000000000")
                .role(RoleName.SUPER_ADMIN)
                .enabled(true)
                .build();

        UserResponse response = userService.updateUser(1L, request);

        assertEquals(RoleName.SUPER_ADMIN, response.getRole());
        verify(userRepository).save(admin);
    }

    @Test
    void cannotAssignSuperAdminRoleToWorker() {

        User shopkeeper = User.builder()
                .id(3L)
                .fullName("Shop")
                .email("shop@test.com")
                .phone("9222222222")
                .enabled(true)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();

        when(currentUserService.getCurrentUser()).thenReturn(admin);
        when(userRepository.findById(3L)).thenReturn(Optional.of(shopkeeper));

        UpdateUserRequest request = UpdateUserRequest.builder()
                .fullName("Shop")
                .phone("9222222222")
                .role(RoleName.SUPER_ADMIN)
                .enabled(true)
                .build();

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.updateUser(3L, request));

        assertTrue(ex.getMessage().contains("SUPER_ADMIN"));
        verify(userRepository, never()).save(any(User.class));
    }

    // --- Delivery Partner Application Tests ---

    @Test
    void getPendingDeliveryApplications() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        User pendingWorker = User.builder()
                .id(10L)
                .fullName("Pending Worker")
                .email("pending@test.com")
                .phone("9333333333")
                .city("Hyderabad")
                .enabled(false)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        when(userRepository.findByRole_NameAndEnabled(RoleName.DELIVERY_BOY, false))
                .thenReturn(List.of(pendingWorker));

        List<UserResponse> applications = userService.getPendingDeliveryApplications();

        assertEquals(1, applications.size());
        assertEquals("Pending Worker", applications.get(0).getFullName());
        assertEquals("Hyderabad", applications.get(0).getCity());
        assertFalse(applications.get(0).getEnabled());
    }

    @Test
    void adminCanApproveDeliveryApplication() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        User pendingWorker = User.builder()
                .id(10L)
                .fullName("Pending Worker")
                .email("pending@test.com")
                .phone("9333333333")
                .enabled(false)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(pendingWorker));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponse response = userService.approveDeliveryApplication(10L);

        assertTrue(response.getEnabled());
        assertEquals(RoleName.DELIVERY_BOY, response.getRole());
        verify(auditService).log(eq("DELIVERY_APP_APPROVE"), anyString(), eq(10L), anyString());
    }

    @Test
    void nonAdminCannotApproveDeliveryApplication() {

        User shopkeeper = User.builder()
                .id(3L)
                .role(new Role(6L, RoleName.SHOPKEEPER))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        assertThrows(RuntimeException.class,
                () -> userService.approveDeliveryApplication(10L));
    }

    @Test
    void adminCanRejectDeliveryApplication() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        User pendingWorker = User.builder()
                .id(10L)
                .fullName("Pending Worker")
                .email("pending@test.com")
                .phone("9333333333")
                .enabled(false)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(pendingWorker));

        UserResponse response = userService.rejectDeliveryApplication(10L);

        assertFalse(response.getEnabled());
        verify(userRepository).delete(pendingWorker);
        verify(auditService).log(eq("DELIVERY_APP_REJECT"), anyString(), eq(10L), anyString());
    }

    @Test
    void cannotApproveAlreadyApprovedApplication() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        User approvedWorker = User.builder()
                .id(10L)
                .fullName("Approved Worker")
                .email("approved@test.com")
                .phone("9444444444")
                .enabled(true)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();

        when(userRepository.findById(10L)).thenReturn(Optional.of(approvedWorker));

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> userService.approveDeliveryApplication(10L));

        assertTrue(ex.getMessage().contains("already approved"));
    }

    // --- Worker Availability Tests ---

    @Test
    void workerCanToggleToAvailable() {

        User worker = User.builder()
                .id(20L)
                .fullName("Worker")
                .email("worker@test.com")
                .phone("9555555555")
                .enabled(true)
                .availability(WorkerAvailability.OFFLINE)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(worker);

        UserResponse response = userService.toggleAvailability(WorkerAvailability.AVAILABLE);

        assertEquals(WorkerAvailability.AVAILABLE, response.getAvailability());
        verify(userRepository).save(worker);
    }

    @Test
    void workerCanToggleToOffline() {

        User worker = User.builder()
                .id(20L)
                .fullName("Worker")
                .email("worker@test.com")
                .phone("9555555555")
                .enabled(true)
                .availability(WorkerAvailability.AVAILABLE)
                .role(new Role(5L, RoleName.DELIVERY_BOY))
                .build();
        when(currentUserService.getCurrentUser()).thenReturn(worker);

        UserResponse response = userService.toggleAvailability(WorkerAvailability.OFFLINE);

        assertEquals(WorkerAvailability.OFFLINE, response.getAvailability());
        verify(userRepository).save(worker);
    }

    @Test
    void nonWorkerCannotToggleAvailability() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        assertThrows(RuntimeException.class,
                () -> userService.toggleAvailability(WorkerAvailability.AVAILABLE));
    }

    // --- Delivery Boy Statistics Tests ---

    @Test
    void adminCanGetDeliveryBoyStats() {

        when(currentUserService.getCurrentUser()).thenReturn(admin);

        User available = User.builder()
                .id(20L).fullName("A").email("a@test.com")
                .enabled(true).availability(WorkerAvailability.AVAILABLE)
                .role(new Role(5L, RoleName.DELIVERY_BOY)).build();
        User offline = User.builder()
                .id(22L).fullName("C").email("c@test.com")
                .enabled(true).availability(WorkerAvailability.OFFLINE)
                .role(new Role(5L, RoleName.DELIVERY_BOY)).build();
        User pending = User.builder()
                .id(23L).fullName("D").email("d@test.com")
                .enabled(false).availability(WorkerAvailability.OFFLINE)
                .role(new Role(5L, RoleName.DELIVERY_BOY)).build();

        when(userRepository.findByRole_Name(RoleName.DELIVERY_BOY))
                .thenReturn(List.of(available, offline, pending));

        var stats = userService.getDeliveryBoyStatistics();

        assertEquals(3L, stats.get("total"));
        assertEquals(1L, stats.get("available"));
        assertEquals(1L, stats.get("offline"));
        assertEquals(1L, stats.get("pendingApplications"));
    }

    @Test
    void nonAdminCannotGetDeliveryBoyStats() {

        when(currentUserService.getCurrentUser()).thenReturn(shopkeeper);

        assertThrows(RuntimeException.class,
                () -> userService.getDeliveryBoyStatistics());
    }
}
