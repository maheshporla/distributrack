package com.distributrack.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    private String phone;

    /** B2B: shop/business name. Optional. */
    @Size(max = 120, message = "Shop name cannot exceed 120 characters")
    private String shopName;

    /** B2B: shop address. Optional. */
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;
}
