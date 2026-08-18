/**
 * Invoice types — mirror the Spring Boot backend InvoiceResponse.
 *
 * Backend reference:
 *   - InvoiceController: /api/invoices (GET list, GET /{orderId});
 *     read-only, no envelope
 *   - Invoices are DERIVED views of an Order joined with its payments —
 *     there is no invoice table, so they never drift out of sync
 *   - InvoiceResponse: { invoiceNumber ("INV-" + orderNumber), orderId,
 *                       orderNumber, shopkeeperId, shopkeeperName,
 *                       shopkeeperPhone, items (OrderItemResponse[]),
 *                       subtotal, totalAmount, orderStatus, orderDate,
 *                       paidAmount, outstandingAmount, invoiceStatus,
 *                       paymentCount, paymentId, paymentStatus,
 *                       paymentAmount, paymentMethod, transactionId,
 *                       paymentDate }
 *
 * The business model has no taxes: subtotal === totalAmount (sum of
 * line items). Reconciliation is always computed: paidAmount +
 * outstandingAmount === totalAmount; invoiceStatus is UNPAID /
 * PARTIALLY_PAID / PAID. Payment summary fields are null until a
 * payment is recorded (they describe the LATEST payment).
 */

import type { OrderItem, OrderStatus } from "@/types/order.types";
import type { InvoiceStatus, PaymentStatus } from "@/types/payment.types";

/** Matches InvoiceResponse.java. */
export interface Invoice {
  invoiceNumber: string;
  orderId: number;
  orderNumber: string;
  shopkeeperId: number;
  shopkeeperName: string;
  shopkeeperPhone: string;
  items: OrderItem[];
  subtotal: number;
  totalAmount: number;
  orderStatus: OrderStatus;
  orderDate: string;

  // Reconciliation (always present)
  paidAmount: number;
  outstandingAmount: number;
  invoiceStatus: InvoiceStatus;
  paymentCount: number;

  // Latest payment summary (null until a payment is recorded)
  paymentId: number | null;
  paymentStatus: PaymentStatus | null;
  paymentAmount: number | null;
  paymentMethod: string | null;
  transactionId: string | null;
  paymentDate: string | null;
}

/** Fully settled when the derived invoice status is PAID. */
export function isInvoicePaid(invoice: Invoice): boolean {
  return invoice.invoiceStatus === "PAID";
}
