import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  Payment,
  PaymentInitiationPayload,
  PaymentInitiationResponse,
  PaymentPayload,
  PaymentStatus,
  PaymentSummary,
  UpiDetails,
  UpiPaymentSubmitPayload,
  CashPaymentSubmitPayload,
  CodPaymentSubmitPayload,
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
   * Shopkeeper submits UPI payment. UTR is optional. Creates a
   * PENDING_VERIFICATION payment — admin must verify.
   */
  async submitUpiPayment(
    payload: UpiPaymentSubmitPayload,
  ): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      "/payments/upi-initiate",
      payload,
    );
    return response.data;
  },

  /**
   * Shopkeeper submits cash payment claim. Creates a
   * PENDING_VERIFICATION payment — admin must verify.
   */
  async submitCashPayment(
    payload: CashPaymentSubmitPayload,
  ): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      "/payments/cash-submit",
      payload,
    );
    return response.data;
  },

  /**
   * Shopkeeper selects Cash on Delivery as payment method.
   * Creates a PENDING_VERIFICATION payment — delivery boy collects cash.
   */
  async submitCodPayment(
    payload: CodPaymentSubmitPayload,
  ): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      "/payments/cod-submit",
      payload,
    );
    return response.data;
  },

  // =========================================================
  // Admin verification
  // =========================================================

  /** Admin approves a PENDING_VERIFICATION UPI payment. */
  async approvePayment(paymentId: number): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      `/payments/${paymentId}/approve`,
    );
    return response.data;
  },

  /** Admin rejects a PENDING_VERIFICATION UPI payment with a reason. */
  async rejectPayment(paymentId: number, reason: string): Promise<Payment> {
    const response = await axiosInstance.post<Payment>(
      `/payments/${paymentId}/reject`,
      { reason },
    );
    return response.data;
  },

  /** Returns all PENDING_VERIFICATION payments (admin dashboard). */
  async getPendingVerificationPayments(): Promise<Payment[]> {
    const response = await axiosInstance.get<Payment[]>(
      "/payments/pending-verification",
    );
    return response.data;
  },
};
