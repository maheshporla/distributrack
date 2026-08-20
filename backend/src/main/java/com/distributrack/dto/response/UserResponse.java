package com.distributrack.dto.response;

import com.distributrack.enums.RoleName;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserResponse {

    private Long id;

    private String fullName;

    private String email;

    private String phone;

    /** B2B: shop/business name (SHOPKEEPER accounts). Nullable. */
    private String shopName;

    /** B2B: shop address. Nullable. */
    private String address;

    private RoleName role;

    private Boolean enabled;

    /** Delivery partner: city of operation. Nullable. */
    private String city;

    /** Delivery partner: vehicle type. Nullable. */
    private String vehicleType;

    /** Delivery partner: vehicle number. Nullable. */
    private String vehicleNumber;

    private Boolean emailNotificationsEnabled;

    private Boolean smsNotificationsEnabled;

    private LocalDateTime createdAt;
}
