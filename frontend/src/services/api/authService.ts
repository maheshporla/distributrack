import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";
import type {
  LoginApiResponse,
  LoginPayload,
  RegisterApiResponse,
  RegisterPayload,
  UserProfile,
  ChangePasswordPayload,
} from "@/types/auth.types";

/**
 * Authentication API calls.
 *
 * Calls `axiosInstance` directly, consistent with every other service:
 * the backend returns DTOs directly (no envelope), so each service
 * returns `response.data` as-is.
 */
export const authService = {
  /**
   * Signs a user in.
   * @returns The issued JWT pair and a confirmation message.
   */
  async login(payload: LoginPayload): Promise<LoginApiResponse> {
    const response = await axiosInstance.post<LoginApiResponse>(
      ENDPOINTS.AUTH.LOGIN,
      payload,
    );
    return response.data;
  },

  /**
   * Registers a new SHOPKEEPER account.
   *
   * Public registration is restricted to the SHOPKEEPER role server-side
   * (see AuthServiceImpl.java); staff accounts are created via the
   * authenticated /api/users endpoints.
   */
  async register(payload: RegisterPayload): Promise<RegisterApiResponse> {
    const response = await axiosInstance.post<RegisterApiResponse>(
      ENDPOINTS.AUTH.REGISTER,
      payload,
    );
    return response.data;
  },

  /**
   * Returns the currently authenticated user, resolved from the JWT
   * principal server-side (GET /api/auth/me — no userId parameter).
   */
  async getMe(): Promise<UserProfile> {
    const response = await axiosInstance.get<UserProfile>(ENDPOINTS.AUTH.ME);
    return response.data;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<string> {
    const response = await axiosInstance.put<string>(
      ENDPOINTS.AUTH.CHANGE_PASSWORD,
      payload,
    );
    return response.data;
  },

  async updateProfile(payload: { fullName: string; phone: string }): Promise<UserProfile> {
    const response = await axiosInstance.put<UserProfile>(
      ENDPOINTS.AUTH.PROFILE,
      payload,
    );
    return response.data;
  },

  /**
   * Request a password reset link. The backend sends an email with a
   * secure token link. Returns a generic success message regardless of
   * whether the email exists — prevents user enumeration.
   */
  async forgotPassword(email: string): Promise<string> {
    const response = await axiosInstance.post<string>(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
    );
    return response.data;
  },

  /**
   * Reset the password using a valid token from the email link.
   */
  async resetPassword(token: string, newPassword: string): Promise<string> {
    const response = await axiosInstance.post<string>(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, newPassword },
    );
    return response.data;
  },
};
