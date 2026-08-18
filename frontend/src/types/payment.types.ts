/**
 * Payment types — mirror the Spring Boot backend DTOs exactly.
 *
 * Backend reference:
 *   - PaymentController: /api/payments
 *       POST   /initiate  — create a gateway order (Razorpay or mock)
 *       POST   /verify    — server-side verification after checkout
 *       POST   /webhook   — gateway webhook (public, signature-gated)
 *       GET    /summary/{orderId} — TOTAL / PAID / OUTSTANDING
 *       plus the classic list/get/status/method endpoints
 *   - PaymentResponse: { id, orderId, orderNumber, shopkeeperId,
 *                       shopkeeperName, orderTotalAmount, amount,
 *                       paymentMethod, paymentStatus, paymentChannel,
 *                       transactionId, paymentDate }
 *   - PaymentStatus enum: PENDING, SUCCESS, FAILED, REFUNDED
 *   - PaymentChannel enum: MANUAL, GATEWAY, MOCK
 *
 * Backend rules (PaymentServiceImpl, authoritative):
 *   - an order can have SEVERAL payments (partial payments) — an order is
 *     fully settled when SUCCESS payments cover the total
 *   - payment only for a DELIVERED order; full settlement -> COMPLETED
 *   - amount may not exceed the outstanding amount (no overpayment)
 *   - gateway payments are recorded only after signature verification
 *     (+ capture confirmation in GATEWAY mode) — the frontend is never
 *     trusted; the webhook is idempotent per gateway payment id
 *   - SHOPKEEPER sees/pays only their own orders
 */

export const PAYMENT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_CHANNELS = ["MANUAL", "GATEWAY", "MOCK"] as const;

export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  MANUAL: "Manual",
  GATEWAY: "Online (Razorpay)",
  MOCK: "Online (Test Gateway)",
};

/** UPI payment details returned by GET /api/payments/upi-details. */
export interface UpiDetails {
  distributorName: string;
  upiId: string;
  amount: number;
  orderNumber: string;
  orderId: number;
  upiUri: string;
}

/**
 * Standard payment methods offered in the UI. The backend column is an
 * unconstrained String, so these values are stored verbatim and are
 * backward-compatible with existing rows.
 */
export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "CHEQUE",
  "ONLINE",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  ONLINE: "Online Payment",
};

/** Matches PaymentResponse.java. */
export interface Payment {
  id: number;
  orderId: number;
  orderNumber: string;
  shopkeeperId: number;
  shopkeeperName: string;
  orderTotalAmount: number;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentChannel: PaymentChannel | null;
  transactionId: string;
  paymentDate: string;
}

/** Matches PaymentRequest.java. */
export interface PaymentPayload {
  orderId: number;
  amount: number;
  paymentMethod: string;
}

/** Matches PaymentInitiationRequest.java. */
export interface PaymentInitiationPayload {
  orderId: number;
  amount: number;
}

/** Matches PaymentInitiationResponse.java. */
export interface PaymentInitiationResponse {
  orderId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  gatewayOrderId: string;
  mode: "GATEWAY" | "MOCK";
  keyId: string | null;
  mockPaymentId: string | null;
  mockSignature: string | null;
}

/** Matches VerifyPaymentRequest.java. */
export interface VerifyPaymentPayload {
  orderId: number;
  amount: number;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  signature: string;
}

/** Matches InvoiceStatus.java. */
export const INVOICE_STATUSES = [
  "UNPAID",
  "PARTIALLY_PAID",
  "PAID",
] as const;

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
};

/** Matches PaymentSummaryResponse.java (TOTAL / PAID / OUTSTANDING). */
export interface PaymentSummary {
  orderId: number;
  orderNumber: string;
  shopkeeperId: number;
  shopkeeperName: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  invoiceStatus: InvoiceStatus;
  payments: Payment[];
}
