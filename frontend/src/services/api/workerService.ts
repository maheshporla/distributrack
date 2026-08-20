import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";

export type WorkerAvailability = "AVAILABLE" | "BUSY" | "OFFLINE";

export interface DeliveryBoyStats {
  total: number;
  available: number;
  busy: number;
  offline: number;
  pendingApplications: number;
}

export interface AvailabilityResponse {
  id: number;
  fullName: string;
  availability: WorkerAvailability;
  [key: string]: unknown;
}

/**
 * Worker availability and admin delivery-boy statistics.
 */
export const workerService = {
  /** Toggle worker availability between AVAILABLE and OFFLINE. */
  async setAvailability(
    availability: WorkerAvailability,
  ): Promise<AvailabilityResponse> {
    const response = await axiosInstance.put<AvailabilityResponse>(
      ENDPOINTS.USERS.AVAILABILITY,
      null,
      { params: { availability } },
    );
    return response.data;
  },

  /** Admin: get delivery boy statistics. */
  async getDeliveryBoyStats(): Promise<DeliveryBoyStats> {
    const response = await axiosInstance.get<DeliveryBoyStats>(
      ENDPOINTS.USERS.DELIVERY_BOY_STATS,
    );
    return response.data;
  },
};
