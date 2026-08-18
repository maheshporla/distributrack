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
public class CreateUserRequest {

    @NotBlank(message = "Full Name is required")
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid Email")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;

    @NotBlank(message = "Phone Number is required")
    @Size(max = 15, message = "Phone cannot exceed 15 characters")
    private String phone;

    /** B2B: shop/business name for SHOPKEEPER accounts. Optional. */
    @Size(max = 120, message = "Shop name cannot exceed 120 characters")
    private String shopName;

    /** B2B: shop address. Optional. */
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    /**
     * Allowed roles are validated in the service against the calling
     * user's own role (e.g. a MANAGER cannot create an OWNER).
     */
    @NotNull(message = "Role is required")
    private RoleName role;
}
