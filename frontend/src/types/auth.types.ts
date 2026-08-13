/**
 * Authentication types — mirror the Spring Boot backend's actual DTOs.
 *
 * Backend reference:
 *   - AuthController:  POST /api/auth/register, POST /api/auth/login
 *   - LoginRequest:    { email, password }
 *   - RegisterRequest: { fullName, email, password, phone, role }
 *   - RoleName (enum): ADMIN | DISTRIBUTOR | SHOPKEEPER | WORKER
 *   - Register response: { message }               (no token — no auto-login)
 *   - Login response:    { token, message }
 *
 * Do not add fields the backend doesn't send/accept without confirming
 * against the actual Java DTOs first.
 */

/** Mirrors com.distributrack.enums.RoleName exactly. */
export const ROLE_NAMES = ["ADMIN", "DISTRIBUTOR", "SHOPKEEPER", "WORKER"] as const;
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
  role: RoleName;
}

// ---------------------------------------------------------------------------
// Response payloads (received from the backend)
// ---------------------------------------------------------------------------

/** Matches the backend's login response: { token, message }. */
export interface LoginApiResponse {
  token: string;
  message: string;
}

/**
 * Matches the backend's register response: { message } only.
 * Registration does NOT return a token — the user must log in
 * separately afterwards. Do not attempt to auto-authenticate on
 * register success.
 */
export interface RegisterApiResponse {
  message: string;
}

// ---------------------------------------------------------------------------
// Client-side session state
// ---------------------------------------------------------------------------

/**
 * The signed-in user, as far as the client can genuinely know it.
 *
 * The backend does not return a user object on login and has no /me
 * endpoint. The JWT itself only carries `sub` (email), `iat`, and `exp`
 * — no id, role, or name claims. So this type intentionally contains
 * only what can be decoded from the token today.
 *
 * TODO(backend): once a GET /api/auth/me endpoint exists, or the JWT is
 * extended with additional claims (id, role, fullName), extend this
 * type and update `buildUserFromToken` in `store/authStore.ts` to match.
 */
export interface AuthenticatedUser {
  email: string;
  /** JWT `exp` claim, epoch seconds — lets the client pre-empt an expired token. */
  tokenExpiresAt: number;
}
