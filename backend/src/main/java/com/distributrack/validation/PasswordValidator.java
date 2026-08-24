package com.distributrack.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Validates password complexity:
 * - At least 6 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character from {@code @#$%^&*!}
 */
public class PasswordValidator implements ConstraintValidator<ValidPassword, String> {

    /**
     * Password must contain:
     *   (?=.*[A-Z])       at least one uppercase
     *   (?=.*[a-z])       at least one lowercase
     *   (?=.*\d)          at least one digit
     *   (?=.*[@#$%^&*!])  at least one special character
     *   .{6,}             at least 6 characters
     */
    private static final String PASSWORD_REGEX =
            "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[@#$%^&*!]).{6,}$";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            // @NotBlank handles null/blank — this validator only checks complexity
            return true;
        }
        return value.matches(PASSWORD_REGEX);
    }
}
