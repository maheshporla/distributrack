package com.distributrack.controller;

import com.distributrack.dto.request.FirstAdminRequest;
import com.distributrack.dto.response.SetupStatusResponse;
import com.distributrack.dto.response.UserResponse;
import com.distributrack.service.SetupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/**
 * One-time first-administrator setup (see SetupServiceImpl for the
 * security model). Both endpoints are public in SecurityConfig, but the
 * service guards them: they only function while the users table is
 * completely empty, so after the first SUPER_ADMIN is created they are
 * permanently inert.
 */
@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
public class SetupController {

    private final SetupService setupService;

    @GetMapping("/status")
    public SetupStatusResponse status() {
        return setupService.getStatus();
    }

    @PostMapping("/first-admin")
    public UserResponse createFirstAdmin(
            @Valid @RequestBody FirstAdminRequest request) {

        return setupService.createFirstAdmin(request);
    }
}
