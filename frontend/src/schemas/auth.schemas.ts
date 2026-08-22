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
// Register — Shopkeeper
// ---------------------------------------------------------------------------
export const shopkeeperRegisterSchema = z
  .object({
    registrationType: z.literal("shopkeeper"),
    fullName: z.string().min(1, "Full Name is required").trim(),
    email: emailSchema,
    phone: z
      .string()
      .min(1, "Phone Number is required")
      .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
    role: z.literal("SHOPKEEPER", { message: "Role is required" }),
    shopName: z.string().trim().max(120, "Shop name cannot exceed 120 characters").optional(),
    address: z.string().trim().max(255, "Address cannot exceed 255 characters").optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ShopkeeperRegisterFormValues = z.infer<typeof shopkeeperRegisterSchema>;

// ---------------------------------------------------------------------------
// Register — Delivery Partner
// ---------------------------------------------------------------------------
export const deliveryPartnerRegisterSchema = z
  .object({
    registrationType: z.literal("delivery_partner"),
    fullName: z.string().min(1, "Full Name is required").trim(),
    email: emailSchema,
    phone: z
      .string()
      .min(1, "Phone Number is required")
      .regex(/^[0-9+\-\s]{7,15}$/, "Enter a valid phone number"),
    role: z.literal("DELIVERY_BOY", { message: "Role is required" }),
    city: z.string().trim().min(1, "City is required").max(100, "City cannot exceed 100 characters"),
    address: z.string().trim().min(1, "Address is required").max(255, "Address cannot exceed 255 characters"),
    vehicleType: z.string().trim().max(50, "Vehicle type cannot exceed 50 characters").optional(),
    vehicleNumber: z.string().trim().max(20, "Vehicle number cannot exceed 20 characters").optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type DeliveryPartnerRegisterFormValues = z.infer<typeof deliveryPartnerRegisterSchema>;

// Combined union — discriminated by registrationType
export const registerSchema = z.discriminatedUnion("registrationType", [
  shopkeeperRegisterSchema,
  deliveryPartnerRegisterSchema,
]);
export type RegisterFormValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// ---------------------------------------------------------------------------
// OTP Verification
// ---------------------------------------------------------------------------
export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only digits"),
});
export type OtpFormValues = z.infer<typeof otpSchema>;

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
