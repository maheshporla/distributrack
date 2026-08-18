/**
 * First-admin setup types — mirror the Spring Boot backend DTOs.
 *
 * Backend reference:
 *   - SetupController: GET /api/setup/status, POST /api/setup/first-admin
 *   - FirstAdminRequest:  { fullName, email, phone, password } — no role
 *     field; the backend always creates SUPER_ADMIN.
 *   - SetupStatusResponse: { setupRequired }
 *
 * The setup flow only works while the users table is completely empty
 * (SetupServiceImpl). Once the first SUPER_ADMIN exists, the endpoint
 * rejects all calls.
 */

/** Matches FirstAdminRequest.java exactly (no role field). */
export interface FirstAdminPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

/** Matches SetupStatusResponse.java. */
export interface SetupStatus {
  setupRequired: boolean;
}
