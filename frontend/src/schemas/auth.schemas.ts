import { z } from "zod";

/**
 * Backend validation reference (LoginRequest.java / RegisterRequest.java):
 *   - email:    @Email @NotBlank
 *   - password: @NotBlank (no complexity rule enforced server-side)
 *   - fullName: @NotBlank
 *   - phone:    @NotBlank
 *   - role:     @NotNull, one of RoleName
 *
 * The backend enforces no password complexity beyond "not blank". The
 * minimum length below is a client-only UX guard, not a backend
 * requirement — do not read it as mirroring server validation.
 */

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Full Name is required").trim(),
    email: emailSchema,
    phone: z
      .string()
      .min(1, "Phone Number is required")
      .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
    // Public registration is SHOPKEEPER-only (enforced server-side in
    // AuthServiceImpl; this literal mirrors that contract). Staff roles
    // are created by admins via /api/users — see UserManagementPage.
    role: z.literal("SHOPKEEPER", { message: "Role is required" }),
    shopName: z.string().trim().max(120, "Shop name cannot exceed 120 characters").optional(),
    address: z.string().trim().max(255, "Address cannot exceed 255 characters").optional(),
    password: passwordSchema,
    /** Client-only field — never sent to the backend, stripped before the API call. */
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
