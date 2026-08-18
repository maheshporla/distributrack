import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";
import type { FirstAdminPayload, SetupStatus } from "@/types/setup.types";
import type { UserProfile } from "@/types/auth.types";

/**
 * One-time first-administrator setup API client.
 *
 * Backend reference: SetupController at /api/setup. Both calls are public
 * but the backend hard-gates them to an empty users table, so after the
 * first SUPER_ADMIN exists they are inert (createFirstAdmin rejects).
 */
export const setupService = {
  /**
   * @returns whether the first-admin setup flow is still open (fresh system).
   */
  async getStatus(): Promise<SetupStatus> {
    const response = await axiosInstance.get<SetupStatus>(ENDPOINTS.SETUP.STATUS);
    return response.data;
  },

  /**
   * Creates the very first SUPER_ADMIN. Only succeeds while the users
   * table is empty; throws an ApiError otherwise.
   */
  async createFirstAdmin(payload: FirstAdminPayload): Promise<UserProfile> {
    const response = await axiosInstance.post<UserProfile>(
      ENDPOINTS.SETUP.FIRST_ADMIN,
      payload,
    );
    return response.data;
  },
};
