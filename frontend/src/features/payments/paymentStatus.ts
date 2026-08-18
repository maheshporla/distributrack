import type { PaymentStatus } from "@/types/payment.types";
import type { RoleName } from "@/types/auth.types";

/**
 * Payment status display metadata + the status actions the Payments UI
 * may offer. Values mirror the backend PaymentStatus enum exactly
 * (PENDING, SUCCESS, FAILED, REFUNDED); arbitrary strings are impossible
 * — the backend parses the enum and rejects anything else.
 *
 * Role gating matches SecurityConfig + PaymentServiceImpl:
 *   - SA/OWNER/MANAGER may update payment status (PUT /api/payments/**)
 *   - SHOPKEEPER/SALESMAN read-only; DELIVERY_BOY no access
 *
 * The backend remains authoritative — it re-validates every value.
 */

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; badgeVariant: "success" | "warning" | "destructive" | "info" | "default" | "secondary" }
> = {
  PENDING: { label: "Pending", badgeVariant: "warning" },
  SUCCESS: { label: "Paid", badgeVariant: "success" },
  FAILED: { label: "Failed", badgeVariant: "destructive" },
  REFUNDED: { label: "Refunded", badgeVariant: "secondary" },
};

export interface PaymentStatusAction {
  to: PaymentStatus;
  label: string;
  buttonVariant: "default" | "destructive" | "outline";
}

/** Sensible next statuses offered per current status. */
export const PAYMENT_STATUS_ACTIONS: Record<
  PaymentStatus,
  PaymentStatusAction[]
> = {
  PENDING: [
    { to: "SUCCESS", label: "Mark Paid", buttonVariant: "default" },
    { to: "FAILED", label: "Mark Failed", buttonVariant: "destructive" },
  ],
  SUCCESS: [{ to: "REFUNDED", label: "Refund", buttonVariant: "outline" }],
  FAILED: [
    { to: "SUCCESS", label: "Mark Paid", buttonVariant: "default" },
    { to: "REFUNDED", label: "Refund", buttonVariant: "outline" },
  ],
  REFUNDED: [],
};

/** Roles that may update payment status (SecurityConfig PUT rule). */
export const PAYMENT_STATUS_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
];
