import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";
import type {
  LoginApiResponse,
  LoginPayload,
  RegisterApiResponse,
  RegisterPayload,
} from "@/types/auth.types";

/**
 * Authentication API calls.
 *
 * Calls `axiosInstance` directly rather than going through
 * `services/api/apiClient.ts`: `apiClient` unwraps responses assuming a
 * `{ success, message, data, timestamp }` envelope, but this backend's
 * auth endpoints return their DTOs directly (`{ token, message }` /
 * `{ message }`), with no envelope. Using `apiClient` here would silently
 * try to read `response.data.data`, which doesn't exist.
 *
 * Only /login and /register exist on the backend (see AuthController.java).
 * TODO(backend): add `getCurrentUser()`, `refreshToken()`, `logout()`,
 * `forgotPassword()`, `resetPassword()`, and `verifyEmail()` here once the
 * corresponding endpoints ship — do not stub them ahead of time.
 */
export const authService = {
  /**
   * Signs a user in.
   * @returns The issued JWT and a confirmation message.
   */
  async login(payload: LoginPayload): Promise<LoginApiResponse> {
    const response = await axiosInstance.post<LoginApiResponse>(
      ENDPOINTS.AUTH.LOGIN,
      payload,
    );
    return response.data;
  },

  /**
   * Registers a new user.
   *
   * Returns only a confirmation message — registration does NOT return a
   * token, so the caller must route the user to sign in afterwards
   * rather than treating this as an auto-login.
   */
  async register(payload: RegisterPayload): Promise<RegisterApiResponse> {
    const response = await axiosInstance.post<RegisterApiResponse>(
      ENDPOINTS.AUTH.REGISTER,
      payload,
    );
    return response.data;
  },
};
