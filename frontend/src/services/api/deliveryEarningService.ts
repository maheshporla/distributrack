import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  DeliveryEarningsDashboard,
  DeliveryEarning,
} from "@/types/deliveryEarning.types";

/**
 * Delivery Earning API client.
 * Backend reference: DeliveryEarningController at /api/delivery-earnings.
 * Ownership enforced server-side — delivery boys see only their own.
 */
export const deliveryEarningService = {
  /** Delivery boy: get full earnings dashboard. */
  async getMyDashboard(): Promise<DeliveryEarningsDashboard> {
    const response = await axiosInstance.get<DeliveryEarningsDashboard>(
      "/delivery-earnings/my/dashboard",
    );
    return response.data;
  },

  /** Delivery boy: get order-wise earnings history. */
  async getMyHistory(): Promise<DeliveryEarning[]> {
    const response = await axiosInstance.get<DeliveryEarning[]>(
      "/delivery-earnings/my/history",
    );
    return response.data;
  },

  /** Admin: get aggregated earnings across all delivery boys. */
  async getAdminDashboard(): Promise<DeliveryEarningsDashboard> {
    const response = await axiosInstance.get<DeliveryEarningsDashboard>(
      "/delivery-earnings/admin/dashboard",
    );
    return response.data;
  },

  /** Admin: get detailed earnings for a specific delivery boy. */
  async getDeliveryBoyDashboard(
    deliveryBoyId: number,
  ): Promise<DeliveryEarningsDashboard> {
    const response = await axiosInstance.get<DeliveryEarningsDashboard>(
      `/delivery-earnings/admin/${deliveryBoyId}/dashboard`,
    );
    return response.data;
  },

  /** Admin: get order-wise earnings for a specific delivery boy. */
  async getDeliveryBoyHistory(
    deliveryBoyId: number,
  ): Promise<DeliveryEarning[]> {
    const response = await axiosInstance.get<DeliveryEarning[]>(
      `/delivery-earnings/admin/${deliveryBoyId}/history`,
    );
    return response.data;
  },
};
