package com.distributrack.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Used in the post-OTP-verification step. After OTP is verified,
     * a short-lived reset token is stored here for the final password-reset call.
     * During the OTP phase this field is null.
     */
    @Column(unique = true, length = 500)
    private String token;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Expiry date/time. Serves dual purpose:
     * - OTP phase: OTP expires after 5 minutes.
     * - Reset-token phase: reset token expires after 5 minutes.
     */
    @Column(nullable = false)
    private LocalDateTime expiryDate;

    // ---- OTP fields ----

    /**
     * Bcrypt hash of the 6-digit OTP. Never stored in plaintext.
     * Null when this record is in reset-token phase.
     */
    @Column(name = "otp_hash", length = 200)
    private String otpHash;

    /**
     * Number of incorrect OTP verification attempts.
     * Max 5 — after which the OTP is invalidated.
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    /**
     * Whether the OTP has been successfully verified.
     * Once verified, a resetToken is issued and this flag is set to true.
     * A verified OTP cannot be reused.
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean verified = false;

    /**
     * Masked phone number shown to the user (e.g. +91******1234).
     * Returned in the forgot-password response for UX.
     */
    @Column(name = "masked_phone", length = 20)
    private String maskedPhone;

    /**
     * Masked email shown to the user (e.g. m****93@gmail.com).
     * Returned in the forgot-password response for UX when
     * the OTP is sent via email.
     */
    @Column(name = "masked_email", length = 50)
    private String maskedEmail;
}