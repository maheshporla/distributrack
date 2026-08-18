import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  DeliveryReportResponse,
  InventoryReportResponse,
  OrdersReportResponse,
  PaymentReportResponse,
  SalesReportResponse,
} from "@/types/report.types";

/**
 * Report API client. All endpoints are SA/OWNER/MANAGER only
 * (SecurityConfig); values come from the real backend.
 *
 * Backend reference: ReportController at /api/reports.
 * `from`/`to` are ISO dates (YYYY-MM-DD); omit for all time.
 */
interface ReportRange {
  from?: string;
  to?: string;
}

export const reportService = {
  async getSalesReport(range?: ReportRange): Promise<SalesReportResponse> {
    const response = await axiosInstance.get<SalesReportResponse>(
      "/reports/sales",
      { params: range },
    );
    return response.data;
  },

  async getOrdersReport(range?: ReportRange): Promise<OrdersReportResponse> {
    const response = await axiosInstance.get<OrdersReportResponse>(
      "/reports/orders",
      { params: range },
    );
    return response.data;
  },

  async getInventoryReport(): Promise<InventoryReportResponse> {
    const response = await axiosInstance.get<InventoryReportResponse>(
      "/reports/inventory",
    );
    return response.data;
  },

  async getDeliveryReport(range?: ReportRange): Promise<DeliveryReportResponse> {
    const response = await axiosInstance.get<DeliveryReportResponse>(
      "/reports/deliveries",
      { params: range },
    );
    return response.data;
  },

  async getPaymentReport(range?: ReportRange): Promise<PaymentReportResponse> {
    const response = await axiosInstance.get<PaymentReportResponse>(
      "/reports/payments",
      { params: range },
    );
    return response.data;
  },
};
