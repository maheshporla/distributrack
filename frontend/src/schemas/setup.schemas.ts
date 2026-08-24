import { z } from "zod";

/**
 * First-admin setup validation, mirroring FirstAdminRequest.java:
 *   - fullName: @NotBlank, max 100
 *   - email:    @NotBlank @Email
 *   - phone:    @NotBlank, max 15
 *   - password: @NotBlank, 6-100 chars (BCrypt-encoded server-side)
 *
 * confirmPassword is client-only, stripped before the API call.
 */
export const firstAdminSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(100, "Full name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email address"),

    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .max(15, "Phone cannot exceed 15 characters"),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/\d/, "Password must contain at least one digit")
      .regex(/[@#$%^&*!]/, "Password must contain at least one special character (@#$%^&*!)"),

    /** Client-only field — never sent to the backend. */
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type FirstAdminFormValues = z.infer<typeof firstAdminSchema>;
