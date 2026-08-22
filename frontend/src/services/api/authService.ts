import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";
import type {
  LoginApiResponse,
  LoginPayload,
  RegisterApiResponse,
  RegisterPayload,
  UserProfile,
  ChangePasswordPayload,
  VerifyResetOtpPayload,
  VerifyResetOtpResponse,
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

  async updateProfile(payload: {
    fullName: string;
    phone: string;
    emailNotificationsEnabled?: boolean;
    smsNotificationsEnabled?: boolean;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<UserProfile> {
    const response = await axiosInstance.put<UserProfile>(
      ENDPOINTS.AUTH.PROFILE,
      payload,
    );
    return response.data;
  },

  /**
   * Request a password reset OTP. The backend sends an SMS OTP to the
   * registered phone number. Returns a generic success message regardless
   * of whether the email exists — prevents user enumeration.
   */
  async forgotPassword(email: string): Promise<string> {
    const response = await axiosInstance.post<string>(
      ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
    );
    return response.data;
  },

  /**
   * Verify the OTP received via SMS. Returns a resetToken on success
   * that must be used with resetPassword.
   */
  async verifyResetOtp(
    payload: VerifyResetOtpPayload,
  ): Promise<VerifyResetOtpResponse> {
    const response = await axiosInstance.post<VerifyResetOtpResponse>(
      ENDPOINTS.AUTH.VERIFY_RESET_OTP,
      payload,
    );
    return response.data;
  },

  /**
   * Reset the password using a valid reset token from OTP verification.
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<string> {
    const response = await axiosInstance.post<string>(
      ENDPOINTS.AUTH.RESET_PASSWORD,
      { resetToken, newPassword },
    );
    return response.data;
  },
};
