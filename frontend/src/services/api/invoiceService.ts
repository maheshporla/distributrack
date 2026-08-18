import { axiosInstance } from "@/services/api/axiosInstance";
import type { Invoice } from "@/types/invoice.types";

/**
 * Invoice API client. Invoices are derived, read-only views of orders +
 * their payments (no invoice table on the backend), so this client has
 * no write operations.
 *
 * Backend reference: InvoiceController at /api/invoices.
 * Access: SA/OWNER/MANAGER/SALESMAN see operational invoices; SHOPKEEPER
 * sees only their own orders' invoices (server-scoped).
 */
export const invoiceService = {
  async getAllInvoices(): Promise<Invoice[]> {
    const response = await axiosInstance.get<Invoice[]>("/invoices");
    return response.data;
  },

  async getInvoiceByOrderId(orderId: number): Promise<Invoice> {
    const response = await axiosInstance.get<Invoice>(`/invoices/${orderId}`);
    return response.data;
  },
};
