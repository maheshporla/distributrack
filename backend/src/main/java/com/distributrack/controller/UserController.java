package com.distributrack.controller;

import com.distributrack.dto.request.CreateUserRequest;
import com.distributrack.dto.request.UpdateUserRequest;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.enums.RoleName;
import com.distributrack.enums.WorkerAvailability;
import com.distributrack.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Staff / customer account management.
 *
 * Access (enforced in SecurityConfig and again in the service):
 *   - GET:    SUPER_ADMIN, OWNER, MANAGER, SALESMAN (SALESMAN sees customers only)
 *   - POST/PUT/DELETE: SUPER_ADMIN, OWNER, MANAGER
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserResponse> getAllUsers(
            @RequestParam(required = false) RoleName role,
            @RequestParam(required = false) String search) {

        return userService.getAllUsers(role, search);
    }

    @GetMapping("/{id}")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    @PostMapping
    public UserResponse createUser(
            @Valid @RequestBody CreateUserRequest request) {

        return userService.createUser(request);
    }

    @PutMapping("/{id}")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request) {

        return userService.updateUser(id, request);
    }

    @DeleteMapping("/{id}")
    public String deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return "User disabled successfully";
    }

    // --- Delivery Partner Applications ---

    @GetMapping("/delivery-applications")
    public List<UserResponse> getPendingDeliveryApplications() {
        return userService.getPendingDeliveryApplications();
    }

    @PutMapping("/delivery-applications/{id}/approve")
    public UserResponse approveDeliveryApplication(@PathVariable Long id) {
        return userService.approveDeliveryApplication(id);
    }

    @PutMapping("/delivery-applications/{id}/reject")
    public UserResponse rejectDeliveryApplication(@PathVariable Long id) {
        return userService.rejectDeliveryApplication(id);
    }

    // --- Worker Availability ---

    @PutMapping("/availability")
    public UserResponse toggleAvailability(
            @RequestParam WorkerAvailability availability) {
        return userService.toggleAvailability(availability);
    }

    // --- Delivery Boy Statistics ---

    @GetMapping("/delivery-boy-stats")
    public Map<String, Object> getDeliveryBoyStatistics() {
        return userService.getDeliveryBoyStatistics();
    }
}
