import { z } from "zod";

/**
 * Staff / customer account validation, mirroring the backend rules:
 *   - CreateUserRequest: fullName required (<=100), email valid,
 *     password 6-100 chars, phone required (<=15), role required
 *   - UpdateUserRequest: fullName required (<=100), phone required (<=15),
 *     role + enabled required (no password change via this endpoint)
 *
 * The role matrix (who may create/manage which role) is enforced by the
 * backend service — the UI only constrains the form fields.
 */
export const createUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),

  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password cannot exceed 100 characters"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(15, "Phone cannot exceed 15 characters"),

  /** B2B: shop/business name for SHOPKEEPER accounts (optional). */
  shopName: z
    .string()
    .trim()
    .max(120, "Shop name cannot exceed 120 characters")
    .optional(),

  /** B2B: shop address (optional). */
  address: z
    .string()
    .trim()
    .max(255, "Address cannot exceed 255 characters")
    .optional(),

  role: z.enum([
    "SUPER_ADMIN",
    "OWNER",
    "MANAGER",
    "SALESMAN",
    "DELIVERY_BOY",
    "SHOPKEEPER",
  ]),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Full name cannot exceed 100 characters"),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(15, "Phone cannot exceed 15 characters"),

  /** B2B: shop/business name (optional). */
  shopName: z
    .string()
    .trim()
    .max(120, "Shop name cannot exceed 120 characters")
    .optional(),

  /** B2B: shop address (optional). */
  address: z
    .string()
    .trim()
    .max(255, "Address cannot exceed 255 characters")
    .optional(),

  role: z.enum([
    "SUPER_ADMIN",
    "OWNER",
    "MANAGER",
    "SALESMAN",
    "DELIVERY_BOY",
    "SHOPKEEPER",
  ]),

  enabled: z.boolean(),

  // Optional admin password reset — empty string means "keep current".
  // Mirrors the optional `password` field on the backend's
  // UpdateUserRequest (BCrypt-encoded server-side).
  password: z
    .union([z.literal(""), z.string().min(6, "Password must be at least 6 characters").max(100, "Password cannot exceed 100 characters")])
    .optional(),
});

export type UpdateUserValues = z.infer<typeof updateUserSchema>;
