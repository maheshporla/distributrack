import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  AnalyticsResponse,
  DeliveryAnalyticsResponse,
  InventoryAnalyticsResponse,
  PaymentAnalyticsResponse,
  SalesAnalyticsResponse,
} from "@/types/analytics.types";

/**
 * Analytics API client. All endpoints are SA/OWNER/MANAGER only
 * (SecurityConfig); values come from the real backend.
 *
 * Backend reference: AnalyticsController at /api/analytics.
 * `from`/`to` are ISO dates (YYYY-MM-DD).
 */
export const analyticsService = {
  async getOverview(): Promise<AnalyticsResponse> {
    const response = await axiosInstance.get<AnalyticsResponse>(
      "/analytics/overview",
    );
    return response.data;
  },

  async getSales(params?: { from?: string; to?: string }): Promise<SalesAnalyticsResponse> {
    const response = await axiosInstance.get<SalesAnalyticsResponse>(
      "/analytics/sales",
      { params },
    );
    return response.data;
  },

  async getPayments(): Promise<PaymentAnalyticsResponse> {
    const response = await axiosInstance.get<PaymentAnalyticsResponse>(
      "/analytics/payments",
    );
    return response.data;
  },

  async getDeliveries(): Promise<DeliveryAnalyticsResponse> {
    const response = await axiosInstance.get<DeliveryAnalyticsResponse>(
      "/analytics/deliveries",
    );
    return response.data;
  },

  async getInventory(): Promise<InventoryAnalyticsResponse> {
    const response = await axiosInstance.get<InventoryAnalyticsResponse>(
      "/analytics/inventory",
    );
    return response.data;
  },
};
