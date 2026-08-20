/**
 * Authentication types — mirror the Spring Boot backend's actual DTOs.
 *
 * Backend reference:
 *   - AuthController: POST /api/auth/register, /login, /refresh, /logout,
 *     /change-password, /forgot-password, /reset-password, GET /me
 *   - LoginRequest:    { email, password }
 *   - RegisterRequest: { fullName, email, password, phone, role }
 *   - RoleName (enum): SUPER_ADMIN | OWNER | MANAGER | SALESMAN |
 *                      DELIVERY_BOY | SHOPKEEPER
 *   - Register/Login response: { accessToken, refreshToken, message }
 *   - /me response: UserResponse { id, fullName, email, phone, role,
 *                                 enabled, createdAt }
 *
 * Do not add fields the backend doesn't send/accept without confirming
 * against the actual Java DTOs first.
 */

/** Mirrors com.distributrack.enums.RoleName exactly. */
export const ROLE_NAMES = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "SALESMAN",
  "DELIVERY_BOY",
  "SHOPKEEPER",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];

// ---------------------------------------------------------------------------
// Request payloads (sent to the backend)
// ---------------------------------------------------------------------------

/** Matches LoginRequest.java exactly. */
export interface LoginPayload {
  email: string;
  password: string;
}

/** Matches RegisterRequest.java exactly. */
export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  /** B2B: shop/business name (optional, SHOPKEEPER). */
  shopName?: string;
  /** B2B: shop/delivery address. */
  address?: string;
  /** Delivery partner: city of operation (DELIVERY_BOY). */
  city?: string;
  /** Delivery partner: vehicle type (optional). */
  vehicleType?: string;
  /** Delivery partner: vehicle registration number (optional). */
  vehicleNumber?: string;
  role: RoleName;
}

// ---------------------------------------------------------------------------
// Response payloads (received from the backend)
// ---------------------------------------------------------------------------

/** Matches AuthResponse.java: { accessToken, refreshToken, message }. */
export interface LoginApiResponse {
  accessToken: string;
  refreshToken: string;
  message: string;
}

/**
 * Matches AuthResponse.java — registration returns tokens for shopkeepers,
 * but delivery partner registration returns no tokens (account pending approval).
 */
export interface RegisterApiResponse {
  accessToken?: string;
  refreshToken?: string;
  message: string;
}

/** Matches com.distributrack.dto.response.UserResponse (GET /api/auth/me). */
export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  /** B2B: shop/business name (SHOPKEEPER accounts). Nullable. */
  shopName?: string | null;
  /** B2B: shop address. Nullable. */
  address?: string | null;
  role: RoleName;
  enabled: boolean;
  emailNotificationsEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Client-side session state
// ---------------------------------------------------------------------------

/**
 * The signed-in user, derived from the JWT claims issued by
 * JwtService.java (sub=email, userId, fullName, role, exp). Passwords
 * are never stored or decoded client-side.
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: RoleName;
  /** JWT `exp` claim, epoch seconds — lets the client pre-empt an expired token. */
  tokenExpiresAt: number;
}

/** Matches ChangePasswordRequest.java. */
export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
