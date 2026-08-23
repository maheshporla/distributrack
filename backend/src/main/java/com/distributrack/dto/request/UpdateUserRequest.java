package com.distributrack.dto.request;

import com.distributrack.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateUserRequest {

    @NotBlank(message = "Full Name is required")
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid Email")
    @Size(max = 255, message = "Email cannot exceed 255 characters")
    private String email;

    @NotBlank(message = "Phone Number is required")
    @Size(max = 15, message = "Phone cannot exceed 15 characters")
    private String phone;

    /** B2B: shop/business name. Optional. */
    @Size(max = 120, message = "Shop name cannot exceed 120 characters")
    private String shopName;

    /** B2B: shop address. Optional. */
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    @NotNull(message = "Role is required")
    private RoleName role;

    @NotNull(message = "Enabled status is required")
    private Boolean enabled;

    /**
     * Optional — when present and non-blank, the user's password is
     * reset to this value (BCrypt-encoded before storage). Leave null
     * or blank to keep the current password.
     */
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;

    private Boolean emailNotificationsEnabled;

    private Boolean smsNotificationsEnabled;
}
