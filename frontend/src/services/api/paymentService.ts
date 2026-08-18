import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  Payment,
  PaymentInitiationPayload,
  PaymentInitiationResponse,
  PaymentPayload,
  PaymentStatus,
  PaymentSummary,
  UpiDetails,
  VerifyPaymentPayload,
} from "@/types/payment.types";

/**
 * Payment API client — mirrors the existing service pattern (raw paths,
 * backend returns DTOs directly).
 *
 * Backend reference: PaymentController at /api/payments.
 *
 *  - POST /initiate  — SHOPKEEPER pays own DELIVERED orders (ownership
 *    enforced server-side); returns Razorpay checkout data (GATEWAY
 *    mode) or mock payment id/signature (MOCK mode)
 *  - POST /verify    — called after the checkout completes; the backend
 *    verifies the signature + capture + amount and records the payment.
 *    NEVER trust the frontend — this endpoint is the gate.
 *  - GET /summary/{orderId} — TOTAL / PAID / OUTSTANDING reconciliation
 */
export const paymentService = {
  async getAllPayments(): Promise<Payment[]> {
    const response = await axiosInstance.get<Payment[]>("/payments");
    return response.data;
  },

  async getPaymentById(id: number): Promise<Payment> {
    const response = await axiosInstance.get<Payment>(`/payments/${id}`);
    return response.data;
  },

  /** Records a payment against a DELIVERED order (SA/OWNER/MANAGER only). */
  async createPayment(payload: PaymentPayload): Promise<Payment> {
    const response = await axiosInstance.post<Payment>("/payments", payload);
    return response.data;
  },

  /** Starts an online payment — returns everything the checkout needs. */
  async initiateGatewayPayment(
    payload: PaymentInitiationPayload,
  ): Promise<PaymentInitiationResponse> {
    const response = await axiosInstance.post<PaymentInitiationResponse>(
      "/payments/initiate",
      payload,
    );
    return response.data;
  },

  /**
   * Verifies the completed checkout server-side and records the payment.
   * Idempotent per gateway payment id — safe to retry.
   */
  async verifyGatewayPayment(payload: VerifyPaymentPayload): Promise<Payment> {
    const response = await axiosInstance.post<Payment>("/payments/verify", payload);
    return response.data;
  },

  /** TOTAL / PAID / OUTSTANDING + invoice status for one order. */
  async getPaymentSummary(orderId: number): Promise<PaymentSummary> {
    const response = await axiosInstance.get<PaymentSummary>(
      `/payments/summary/${orderId}`,
    );
    return response.data;
  },

  /** Status values are validated server-side (PaymentStatus enum). */
  async updatePaymentStatus(
    id: number,
    status: PaymentStatus,
  ): Promise<Payment> {
    const response = await axiosInstance.put<Payment>(
      `/payments/${id}/status`,
      null,
      { params: { status } },
    );
    return response.data;
  },

  async getPaymentsByStatus(status: PaymentStatus): Promise<Payment[]> {
    const response = await axiosInstance.get<Payment[]>(
      `/payments/status/${status}`,
    );
    return response.data;
  },

  async getPaymentsByMethod(method: string): Promise<Payment[]> {
    const response = await axiosInstance.get<Payment[]>(
      `/payments/method/${method}`,
    );
    return response.data;
  },

  // =========================================================
  // UPI direct payment
  // =========================================================

  /** Returns the distributor's UPI details (VPA, name, amount, URI) for an order. */
  async getUpiDetails(orderId: number): Promise<UpiDetails> {
    const response = await axiosInstance.get<UpiDetails>("/payments/upi-details", {
      params: { orderId },
    });
    return response.data;
  },

  /**
   * Shopkeeper confirms they paid via UPI. Creates a PENDING payment
   * record — NOT auto-verified. Admin must approve.
   */
  async initiateUpiPayment(
    payload: PaymentInitiationPayload,
  ): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      "/payments/upi-initiate",
      payload,
    );
    return response.data;
  },
};
