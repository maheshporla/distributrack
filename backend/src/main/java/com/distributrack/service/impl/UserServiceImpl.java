package com.distributrack.service.impl;

import com.distributrack.dto.request.CreateUserRequest;
import com.distributrack.dto.request.UpdateUserRequest;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.entity.Role;
import com.distributrack.entity.User;
import com.distributrack.enums.RoleName;
import com.distributrack.repository.RoleRepository;
import com.distributrack.repository.UserRepository;
import com.distributrack.security.CurrentUserService;
import com.distributrack.service.AuditService;
import com.distributrack.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final CurrentUserService currentUserService;
    private final AuditService auditService;

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

        User user = User.builder()
                .fullName(request.getFullName().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone().trim())
                .shopName(trimToNull(request.getShopName()))
                .address(trimToNull(request.getAddress()))
                .enabled(true)
                .role(role)
                .build();

        user = userRepository.save(user);

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

        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        user.setShopName(trimToNull(request.getShopName()));
        user.setAddress(trimToNull(request.getAddress()));
        user.setRole(role);
        user.setEnabled(request.getEnabled());

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
                .role(user.getRole().getName())
                .enabled(user.getEnabled())
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
}
