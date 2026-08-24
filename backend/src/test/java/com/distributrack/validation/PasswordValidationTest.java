package com.distributrack.validation;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class PasswordValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setupValidator() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    // --- Helper class to test field-level validation ---

    static class PasswordHolder {
        @ValidPassword
        String password;

        PasswordHolder(String password) {
            this.password = password;
        }
    }

    private Set<ConstraintViolation<PasswordHolder>> validate(String password) {
        return validator.validate(new PasswordHolder(password));
    }

    private boolean isValid(String password) {
        return validate(password).isEmpty();
    }

    // --- Valid passwords ---

    @Test
    void valid_MaheshAt1() {
        assertTrue(isValid("Mahesh@1"));
    }

    @Test
    void valid_AdminHash9() {
        assertTrue(isValid("Admin#9"));
    }

    @Test
    void valid_TestAt123() {
        assertTrue(isValid("Test@123"));
    }

    @Test
    void valid_ComplexPassword() {
        assertTrue(isValid("P@ssw0rd!"));
    }

    @Test
    void valid_LongPassword() {
        assertTrue(isValid("VeryLongP@ss1"));
    }

    // --- Invalid: too short ---

    @Test
    void invalid_tooShort() {
        assertFalse(isValid("Ma@1"));
    }

    @Test
    void invalid_exactly5Chars() {
        assertFalse(isValid("Ma@1x"));
    }

    // --- Invalid: missing uppercase ---

    @Test
    void invalid_noUppercase() {
        assertFalse(isValid("mahesh@1"));
    }

    // --- Invalid: missing lowercase ---

    @Test
    void invalid_noLowercase() {
        assertFalse(isValid("MAHESH@1"));
    }

    // --- Invalid: missing digit ---

    @Test
    void invalid_noDigit() {
        assertFalse(isValid("Mahesh@"));
    }

    // --- Invalid: missing special character ---

    @Test
    void invalid_noSpecialChar() {
        assertFalse(isValid("Mahesh123"));
    }

    @Test
    void invalid_noSpecialChar_underscoreOnly() {
        // underscore is NOT in the allowed special chars
        assertFalse(isValid("Mahesh_1"));
    }

    // --- Invalid: multiple missing requirements ---

    @Test
    void invalid_noUppercaseAndNoSpecial() {
        assertFalse(isValid("mahesh1"));
    }

    @Test
    void invalid_tooShortAndMissingEverything() {
        assertFalse(isValid("ma@1"));
    }

    // --- Null/blank handling (other annotations handle this) ---

    @Test
    void nullPassword_passesComplexityCheck() {
        // @ValidPassword only checks complexity, not presence
        assertTrue(isValid(null));
    }

    @Test
    void blankPassword_passesComplexityCheck() {
        assertTrue(isValid(""));
    }

    // --- Verify specific constraint message ---

    @Test
    void invalidPassword_hasViolationMessage() {
        Set<ConstraintViolation<PasswordHolder>> violations = validate("mahesh1");
        assertFalse(violations.isEmpty());
        String message = violations.iterator().next().getMessage();
        assertTrue(message.contains("uppercase"), "Should mention uppercase");
        assertTrue(message.contains("lowercase"), "Should mention lowercase");
        assertTrue(message.contains("digit"), "Should mention digit");
        assertTrue(message.contains("special"), "Should mention special character");
    }
}
