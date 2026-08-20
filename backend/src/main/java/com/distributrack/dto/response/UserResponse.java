package com.distributrack.dto.response;

import com.distributrack.enums.RoleName;
import com.distributrack.enums.WorkerAvailability;
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

    /** Shopkeeper: shop delivery latitude. Null if not set. */
    private Double latitude;

    /** Shopkeeper: shop delivery longitude. Null if not set. */
    private Double longitude;

    private RoleName role;

    private Boolean enabled;

    /** Worker availability state (AVAILABLE/BUSY/OFFLINE). Null for non-worker roles. */
    private WorkerAvailability availability;

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
