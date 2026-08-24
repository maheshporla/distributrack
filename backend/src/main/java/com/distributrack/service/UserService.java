package com.distributrack.service;

import com.distributrack.dto.request.CreateUserRequest;
import com.distributrack.dto.request.UpdateUserRequest;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.enums.RoleName;
import com.distributrack.enums.WorkerAvailability;

import java.util.List;
import java.util.Map;

public interface UserService {

    /**
     * Lists users, optionally filtered by role and/or a name/email search
     * keyword. Access is scoped to the calling user's role (e.g. a
     * SALESMAN only ever sees SHOPKEEPER accounts).
     */
    List<UserResponse> getAllUsers(RoleName role, String search);

    UserResponse getUserById(Long id);

    /**
     * Creates a staff/shop account. The requested role must be creatable
     * by the calling user's role (see role matrix in UserServiceImpl).
     */
    UserResponse createUser(CreateUserRequest request);

    UserResponse updateUser(Long id, UpdateUserRequest request);

    /**
     * Soft-deletes a user by disabling the account. Existing foreign-key
     * references (orders, deliveries) are preserved.
     */
    void deleteUser(Long id);

    /**
     * Permanently deletes a user from the database. Only allowed when
     * the user has no business records (orders, deliveries, earnings).
     * Cleans up session/token records before deletion. The user's email
     * can be reused after successful deletion.
     *
     * @return a message describing the outcome
     */
    String permanentDeleteUser(Long id);

    // --- Delivery Partner Applications ---

    /** List pending (disabled) delivery partner applications. */
    List<UserResponse> getPendingDeliveryApplications();

    /** Approve a pending delivery partner: enable the account. */
    UserResponse approveDeliveryApplication(Long userId);

    /** Reject a pending delivery partner: keep disabled, mark rejected. */
    UserResponse rejectDeliveryApplication(Long userId);

    // --- Worker Availability ---

    /** Toggle the worker's availability between AVAILABLE and OFFLINE. */
    UserResponse toggleAvailability(WorkerAvailability targetAvailability);

    /** Admin dashboard: delivery boy statistics. */
    Map<String, Object> getDeliveryBoyStatistics();
}
