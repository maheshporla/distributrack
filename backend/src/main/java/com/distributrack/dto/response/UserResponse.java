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

    private LocalDateTime createdAt;
}
