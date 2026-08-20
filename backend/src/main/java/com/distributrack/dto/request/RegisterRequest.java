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

    /** B2B: delivery/billing address. Also used by DELIVERY_BOY for city/address. */
    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    /** Delivery partner: city of operation. Optional. */
    @Size(max = 100, message = "City cannot exceed 100 characters")
    private String city;

    /** Delivery partner: vehicle type (Bike, Scooter, Van, Truck, etc.). Optional. */
    @Size(max = 50, message = "Vehicle type cannot exceed 50 characters")
    private String vehicleType;

    /** Delivery partner: vehicle registration number. Optional. */
    @Size(max = 20, message = "Vehicle number cannot exceed 20 characters")
    private String vehicleNumber;

    /** Backend-enforced: public registration allows SHOPKEEPER and DELIVERY_BOY only. */
    @NotNull(message = "Role is required")
    private RoleName role;
}
