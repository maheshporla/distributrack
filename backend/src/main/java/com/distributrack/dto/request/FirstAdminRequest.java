package com.distributrack.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Payload for the first-admin setup endpoint. There is deliberately NO
 * role field — the account is always created as SUPER_ADMIN; the caller
 * cannot influence the role.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FirstAdminRequest {

    @NotBlank(message = "Full Name is required")
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid Email")
    private String email;

    @NotBlank(message = "Phone Number is required")
    @Size(max = 15, message = "Phone cannot exceed 15 characters")
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;
}
