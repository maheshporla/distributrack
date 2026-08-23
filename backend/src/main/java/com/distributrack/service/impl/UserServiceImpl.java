package com.distributrack.service.impl;

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
import com.distributrack.entity.PasswordResetToken;
import com.distributrack.repository.PasswordResetTokenRepository;
import com.distributrack.service.AuditService;
import com.distributrack.service.NotificationService;
import com.distributrack.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final NotificationService notificationService;

    // ------------------------------------------------------------------
    // Role matrix — who may create/manage which roles.
    //   SUPER_ADMIN: OWNER, MANAGER, SALESMAN, DELIVERY_BOY, SHOPKEEPER
    //   OWNER:       OWNER, MANAGER, SALESMAN, DELIVERY_BOY, SHOPKEEPER
    //   MANAGER:     MANAGER, SALESMAN, DELIVERY_BOY, SHOPKEEPER
    //   SALESMAN/DELIVERY_BOY/SHOPKEEPER: none
    //
    // Nobody — not even a SUPER_ADMIN — can create or assign the
    // SUPER_ADMIN role through user management. The first-admin setup
    // is the ONLY way a SUPER_ADMIN account can come into existence.
    // ------------------------------------------------------------------
    private boolean canManageRole(RoleName actorRole, RoleName targetRole) {
        return switch (actorRole) {
            case SUPER_ADMIN -> targetRole != RoleName.SUPER_ADMIN;
            case OWNER -> targetRole != RoleName.SUPER_ADMIN;
            case MANAGER -> targetRole == RoleName.MANAGER
                    || targetRole == RoleName.SALESMAN
                    || targetRole == RoleName.DELIVERY_BOY
                    || targetRole == RoleName.SHOPKEEPER;
            default -> false;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(RoleName role, String search) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        // SALESMAN may only view customers (SHOPKEEPER accounts).
        if (actorRole == RoleName.SALESMAN) {
            role = RoleName.SHOPKEEPER;
        }

        List<User> users = role != null
                ? userRepository.findByRole_Name(role)
                : userRepository.findAll();

        if (search != null && !search.isBlank()) {
            String keyword = search.trim().toLowerCase();
            users = users.stream()
                    .filter(u ->
                            u.getFullName().toLowerCase().contains(keyword)
                                    || u.getEmail().toLowerCase().contains(keyword)
                                    || u.getPhone().contains(keyword))
                    .toList();
        }

        return users.stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        // SALESMAN may only view customers.
        if (actorRole == RoleName.SALESMAN
                && user.getRole().getName() != RoleName.SHOPKEEPER) {
            throw new RuntimeException("User not found with id: " + id);
        }

        return mapToResponse(user);
    }

    @Override
    public UserResponse createUser(CreateUserRequest request) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        if (request.getRole() == RoleName.SUPER_ADMIN) {
            throw new RuntimeException(
                    "SUPER_ADMIN accounts can only be created through the first-admin setup"
            );
        }

        if (!canManageRole(actorRole, request.getRole())) {
            throw new RuntimeException(
                    "Your role (" + actorRole + ") cannot create a " + request.getRole() + " account"
            );
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already exists");
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role not found: " + request.getRole()));

        boolean isStaff = request.getRole() == RoleName.DELIVERY_BOY 
                || request.getRole() == RoleName.SALESMAN 
                || request.getRole() == RoleName.MANAGER 
                || request.getRole() == RoleName.OWNER;

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone().trim())
                .shopName(trimToNull(request.getShopName()))
                .address(trimToNull(request.getAddress()))
                .enabled(!isStaff) // Staff are created disabled, active only after setting password
                .role(role)
                .emailNotificationsEnabled(request.getEmailNotificationsEnabled() != null ? request.getEmailNotificationsEnabled() : true)
                .smsNotificationsEnabled(request.getSmsNotificationsEnabled() != null ? request.getSmsNotificationsEnabled() : true)
                .build();

        user = userRepository.save(user);

        if (isStaff) {
            String token = UUID.randomUUID().toString();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .token(token)
                    .user(user)
                    .expiryDate(LocalDateTime.now().plusDays(7)) // 7 days activation window
                    .build();
            passwordResetTokenRepository.save(resetToken);

            notificationService.notifyWorkerCreated(user, token);
        }

        auditService.log("USER_CREATE", "User", user.getId(),
                request.getRole() + " account created: " + user.getEmail()
                        + " (" + user.getFullName() + ")");

        return mapToResponse(user);
    }

    @Override
    public UserResponse updateUser(Long id, UpdateUserRequest request) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        boolean isSelf = user.getId().equals(current.getId());

        // A user can never modify their own role or disable themselves.
        if (isSelf
                && (request.getRole() != user.getRole().getName()
                    || Boolean.FALSE.equals(request.getEnabled()))) {
            throw new RuntimeException("You cannot change your own role or disable your own account");
        }

        // Managing another user requires authority over their current role.
        if (!isSelf && !canManageRole(actorRole, user.getRole().getName())) {
            throw new RuntimeException(
                    "Your role (" + actorRole + ") cannot manage a " + user.getRole().getName() + " account"
            );
        }

        // Role reassignment requires authority over the new role. Keeping
        // your own (unchanged) role is never a reassignment, so self-edits
        // with the same role pass through even for a SUPER_ADMIN.
        if (request.getRole() != user.getRole().getName()
                && !canManageRole(actorRole, request.getRole())) {
            throw new RuntimeException(
                    "Your role (" + actorRole + ") cannot assign the " + request.getRole() + " role"
            );
        }

        if (request.getRole() == RoleName.SUPER_ADMIN
                && user.getRole().getName() != RoleName.SUPER_ADMIN) {
            throw new RuntimeException(
                    "SUPER_ADMIN role cannot be assigned through user management"
            );
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new RuntimeException("Role not found: " + request.getRole()));

        // Email update — normalize and enforce uniqueness
        String newEmail = request.getEmail().trim().toLowerCase();
        if (!newEmail.equals(user.getEmail())) {
            Optional<User> existingByEmail = userRepository.findByEmail(newEmail);
            if (existingByEmail.isPresent()) {
                throw new RuntimeException("This email address is already registered");
            }
            user.setEmail(newEmail);
        }

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        user.setShopName(trimToNull(request.getShopName()));
        user.setAddress(trimToNull(request.getAddress()));
        user.setRole(role);
        user.setEnabled(request.getEnabled());
        if (request.getEmailNotificationsEnabled() != null) {
            user.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
        }
        if (request.getSmsNotificationsEnabled() != null) {
            user.setSmsNotificationsEnabled(request.getSmsNotificationsEnabled());
        }

        // Optional admin password reset — only applied when a non-blank
        // password was sent. Always BCrypt-encoded, never stored raw.
        boolean passwordReset = request.getPassword() != null
                && !request.getPassword().isBlank();
        if (passwordReset) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        user = userRepository.save(user);

        auditService.log("USER_UPDATE", "User", user.getId(),
                "Account updated: role " + request.getRole()
                        + ", enabled=" + request.getEnabled()
                        + (passwordReset ? ", password reset" : ""));

        return mapToResponse(user);
    }

    @Override
    public void deleteUser(Long id) {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        if (user.getId().equals(current.getId())) {
            throw new RuntimeException("You cannot disable your own account");
        }

        if (!canManageRole(actorRole, user.getRole().getName())) {
            throw new RuntimeException(
                    "Your role (" + actorRole + ") cannot manage a " + user.getRole().getName() + " account"
            );
        }

        // Soft delete: disable the account, keep referential integrity
        // for existing orders / deliveries / payments.
        user.setEnabled(false);
        userRepository.save(user);

        auditService.log("USER_DISABLE", "User", user.getId(),
                user.getRole().getName() + " account disabled: " + user.getEmail());
    }

    private UserResponse mapToResponse(User user) {

        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .shopName(user.getShopName())
                .address(user.getAddress())
                .city(user.getCity())
                .vehicleType(user.getVehicleType())
                .vehicleNumber(user.getVehicleNumber())
                .role(user.getRole().getName())
                .enabled(user.getEnabled())
                .availability(user.getAvailability())
                .emailNotificationsEnabled(user.getEmailNotificationsEnabled())
                .smsNotificationsEnabled(user.getSmsNotificationsEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }

    // --- Delivery Partner Applications ---

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getPendingDeliveryApplications() {
        return userRepository
                .findByRole_NameAndEnabled(RoleName.DELIVERY_BOY, false)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    public UserResponse approveDeliveryApplication(Long userId) {
        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        if (actorRole != RoleName.SUPER_ADMIN
                && actorRole != RoleName.OWNER
                && actorRole != RoleName.MANAGER) {
            throw new RuntimeException("Only admin/owner/manager can approve delivery applications");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (user.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("User is not a delivery partner applicant");
        }

        if (user.getEnabled()) {
            throw new RuntimeException("Application is already approved");
        }

        user.setEnabled(true);
        user = userRepository.save(user);

        auditService.log("DELIVERY_APP_APPROVE", "User", user.getId(),
                "Delivery partner application approved: " + user.getEmail()
                        + " (" + user.getFullName() + ")");

        log.info("Delivery partner approved: {}", user.getEmail());

        return mapToResponse(user);
    }

    @Override
    public UserResponse rejectDeliveryApplication(Long userId) {
        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        if (actorRole != RoleName.SUPER_ADMIN
                && actorRole != RoleName.OWNER
                && actorRole != RoleName.MANAGER) {
            throw new RuntimeException("Only admin/owner/manager can reject delivery applications");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        if (user.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("User is not a delivery partner applicant");
        }

        if (user.getEnabled()) {
            throw new RuntimeException("Cannot reject an already approved application");
        }

        // Soft-delete: keep disabled, the user simply cannot log in.
        userRepository.delete(user);

        auditService.log("DELIVERY_APP_REJECT", "User", userId,
                "Delivery partner application rejected: " + user.getEmail());

        log.info("Delivery partner rejected: {}", user.getEmail());

        // Return a synthetic response since the entity is deleted.
        return UserResponse.builder()
                .id(userId)
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .city(user.getCity())
                .vehicleType(user.getVehicleType())
                .vehicleNumber(user.getVehicleNumber())
                .role(RoleName.DELIVERY_BOY)
                .enabled(false)
                .createdAt(user.getCreatedAt())
                .build();
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // --- Worker Availability ---

    @Override
    public UserResponse toggleAvailability(WorkerAvailability targetAvailability) {

        User current = currentUserService.getCurrentUser();

        if (current.getRole().getName() != RoleName.DELIVERY_BOY) {
            throw new RuntimeException("Only delivery workers can change availability");
        }

        if (!Boolean.TRUE.equals(current.getEnabled())) {
            throw new RuntimeException("Your account is disabled");
        }

        // Workers can only toggle between AVAILABLE and OFFLINE.
        if (targetAvailability != WorkerAvailability.AVAILABLE
                && targetAvailability != WorkerAvailability.OFFLINE) {
            throw new RuntimeException(
                    "Workers can only set availability to AVAILABLE or OFFLINE");
        }

        current.setAvailability(targetAvailability);
        current = userRepository.save(current);

        auditService.log("WORKER_AVAILABILITY", "User", current.getId(),
                "Availability changed to " + targetAvailability);

        log.info("Worker {} availability changed to {}",
                current.getEmail(), targetAvailability);

        return mapToResponse(current);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDeliveryBoyStatistics() {

        User current = currentUserService.getCurrentUser();
        RoleName actorRole = current.getRole().getName();

        if (actorRole != RoleName.SUPER_ADMIN
                && actorRole != RoleName.OWNER
                && actorRole != RoleName.MANAGER) {
            throw new RuntimeException("Only admin/owner/manager can view delivery boy statistics");
        }

        List<User> allWorkers = userRepository.findByRole_Name(RoleName.DELIVERY_BOY);

        long total = allWorkers.size();
        long available = allWorkers.stream()
                .filter(u -> u.getEnabled()
                        && u.getAvailability() == WorkerAvailability.AVAILABLE)
                .count();
        long offline = allWorkers.stream()
                .filter(u -> u.getEnabled()
                        && u.getAvailability() == WorkerAvailability.OFFLINE)
                .count();
        long pending = allWorkers.stream()
                .filter(u -> !Boolean.TRUE.equals(u.getEnabled()))
                .count();

        return Map.of(
                "total", total,
                "available", available,
                "offline", offline,
                "pendingApplications", pending
        );
    }
}
