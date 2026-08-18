package com.distributrack.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseResponse {

    private Long id;

    private String warehouseName;

    private String address;

    private String city;

    private String state;

    private String pincode;

    private String contactPerson;

    private String phone;

    private Double latitude;

    private Double longitude;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}