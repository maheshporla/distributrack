package com.distributrack.exception;

import com.distributrack.dto.response.ErrorResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Translates exceptions into consistent JSON error responses. Messages
 * are deliberately user-safe: no SQL fragments, stack traces, passwords,
 * JWT secrets or internal class names are ever exposed.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Validation Errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex) {

        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        return error(HttpStatus.BAD_REQUEST, "Validation Error", message);
    }

    // Malformed JSON body (invalid syntax or wrong types in the payload)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(
            HttpMessageNotReadableException ex) {

        return error(HttpStatus.BAD_REQUEST,
                "Bad Request",
                "Malformed request body — check the JSON payload and field types");
    }

    // Missing required query/request parameter
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParameter(
            MissingServletRequestParameterException ex) {

        return error(HttpStatus.BAD_REQUEST,
                "Bad Request",
                "Missing required parameter: " + ex.getParameterName());
    }

    // Wrong type for a path/query parameter (e.g. "abc" for a numeric id)
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex) {

        return error(HttpStatus.BAD_REQUEST,
                "Bad Request",
                "Invalid value for parameter: " + ex.getName());
    }

    // Invalid login credentials or expired/malformed authentication
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthentication(
            AuthenticationException ex) {

        return error(HttpStatus.UNAUTHORIZED, "Unauthorized", ex.getMessage());
    }

    // Authenticated user lacks the required role
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex) {

        return error(HttpStatus.FORBIDDEN,
                "Forbidden",
                "You do not have permission to perform this action");
    }

    // FK / unique-constraint violations (delete something still referenced,
    // or a race on a unique column). Clean 409 instead of a raw SQL 500.
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrity(
            DataIntegrityViolationException ex) {

        return error(HttpStatus.CONFLICT,
                "Conflict",
                "This record is referenced by other data and cannot be modified or deleted");
    }

    // Unknown route (Spring 6.1+ throws NoResourceFoundException)
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(
            NoResourceFoundException ex) {

        return error(HttpStatus.NOT_FOUND,
                "Not Found",
                "The requested resource does not exist");
    }

    // Runtime Exceptions (business-rule rejections with explicit messages)
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex) {

        return error(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage());
    }

    // All Other Exceptions — never expose internals
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(
            Exception ex) {

        return error(HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected error occurred. Please try again.");
    }

    private ResponseEntity<ErrorResponse> error(
            HttpStatus status, String error, String message) {

        ErrorResponse response = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(error)
                .message(message)
                .build();

        return new ResponseEntity<>(response, status);
    }
}
