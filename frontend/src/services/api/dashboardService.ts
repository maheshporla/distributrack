import { axiosInstance } from "@/services/api/axiosInstance";
import type { DashboardResponse } from "@/types/dashboard.types";

export const dashboardService = {
  async getSummary(): Promise<DashboardResponse> {
    const response = await axiosInstance.get<DashboardResponse>(
      "/dashboard/summary",
    );

    return response.data;
  },
};