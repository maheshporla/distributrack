package com.distributrack.dto.request;

import com.distributrack.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Full Name is required")
    private String fullName;

    @Email(message = "Invalid Email")
    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Phone Number is required")
    private String phone;

    /** B2B: shop/business name (SHOPKEEPER registration). Optional. */
    @Size(max = 120, message = "Shop name cannot exceed 120 characters")
    private String shopName;

    /** B2B: shop address. Optional. */
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    /** Backend-enforced: public registration is SHOPKEEPER only. */
    @NotNull(message = "Role is required")
    private RoleName role;
}
