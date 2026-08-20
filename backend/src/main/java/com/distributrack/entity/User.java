package com.distributrack.entity;

import com.distributrack.enums.WorkerAvailability;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_role_id", columnList = "role_id"),
        @Index(name = "idx_users_email", columnList = "email"),
        @Index(name = "idx_users_phone", columnList = "phone")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    /**
     * B2B: the shop/business name (SHOPKEEPER accounts). Optional — staff
     * accounts have no shop name.
     */
    @Column(name = "shop_name", length = 120)
    private String shopName;

    /** B2B: delivery/billing address (SHOPKEEPER accounts). Also used by DELIVERY_BOY. */
    @Column(length = 255)
    private String address;

    /** Shopkeeper: shop delivery latitude (set via search/GPS/map). */
    @Column
    private Double latitude;

    /** Shopkeeper: shop delivery longitude (set via search/GPS/map). */
    @Column
    private Double longitude;

    /** Delivery partner: city of operation. */
    @Column(length = 100)
    private String city;

    /** Delivery partner: vehicle type (Bike, Scooter, Van, Truck, etc.). */
    @Column(name = "vehicle_type", length = 50)
    private String vehicleType;

    /** Delivery partner: vehicle registration number. */
    @Column(name = "vehicle_number", length = 20)
    private String vehicleNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private WorkerAvailability availability = WorkerAvailability.OFFLINE;

    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "email_notifications_enabled", nullable = false)
    @Builder.Default
    private Boolean emailNotificationsEnabled = true;

    @Column(name = "sms_notifications_enabled", nullable = false)
    @Builder.Default
    private Boolean smsNotificationsEnabled = true;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    // passwordResetToken is NOT mapped here — managed via
    // PasswordResetTokenRepository to avoid cascade/flush conflicts.

    @OneToMany(mappedBy = "recipient", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Notification> notifications;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // =========================
    // Spring Security Methods
    // =========================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
                new SimpleGrantedAuthority("ROLE_" + role.getName().name())
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return Boolean.TRUE.equals(enabled);
    }
}
