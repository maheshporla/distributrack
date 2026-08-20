import { axiosInstance } from "@/services/api/axiosInstance";
import { ENDPOINTS } from "@/constants/endpoints.constants";
import type { DeliveryApplication } from "@/types/deliveryApplication.types";

/**
 * Delivery Partner Application API calls (admin only).
 */
export const deliveryApplicationService = {
  /** Get all pending delivery partner applications. */
  async getPending(): Promise<DeliveryApplication[]> {
    const response = await axiosInstance.get<DeliveryApplication[]>(
      ENDPOINTS.USERS.DELIVERY_APPLICATIONS
    );
    return response.data;
  },

  /** Approve a delivery partner application (enable the account). */
  async approve(id: number): Promise<DeliveryApplication> {
    const response = await axiosInstance.put<DeliveryApplication>(
      ENDPOINTS.USERS.APPROVE_DELIVERY(id)
    );
    return response.data;
  },

  /** Reject a delivery partner application (delete the account). */
  async reject(id: number): Promise<DeliveryApplication> {
    const response = await axiosInstance.put<DeliveryApplication>(
      ENDPOINTS.USERS.REJECT_DELIVERY(id)
    );
    return response.data;
  },
};
