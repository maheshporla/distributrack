package com.distributrack.service;

import com.distributrack.dto.request.FirstAdminRequest;
import com.distributrack.dto.response.SetupStatusResponse;
import com.distributrack.dto.response.UserResponse;

/**
 * One-time system initialization. The first SUPER_ADMIN is created here —
 * and only here — and the mechanism closes forever once any user exists.
 */
public interface SetupService {

    /**
     * @return true while the users table is empty (fresh system), i.e.
     *         the first-admin setup endpoint is still usable.
     */
    SetupStatusResponse getStatus();

    /**
     * Creates the very first SUPER_ADMIN account.
     *
     * @throws RuntimeException if the system is already initialized
     *         (any user exists), or if the email/phone is taken.
     */
    UserResponse createFirstAdmin(FirstAdminRequest request);
}
