import type { DeliveryStatus } from "@/types/delivery.types";
import type { RoleName } from "@/types/auth.types";

/**
 * Delivery status display metadata + the status actions the UI may offer.
 * Mirrors DeliveryStatus.canTransitionTo() on the backend exactly:
 *
 *   AVAILABLE        -> ASSIGNED (worker accepts) | CANCELLED
 *   ASSIGNED         -> OUT_FOR_DELIVERY | CANCELLED
 *   OUT_FOR_DELIVERY -> DELIVERED | FAILED | CANCELLED
 *   DELIVERED / FAILED / CANCELLED -> terminal
 *
 * Role gating matches SecurityConfig + DeliveryServiceImpl:
 *   - DELIVERY_BOY  may accept AVAILABLE and update own deliveries
 *   - SA/OWNER/MANAGER may emergency reassign and update any delivery
 *   - SHOPKEEPER    may never modify a delivery
 *
 * The backend remains authoritative — it re-validates every transition
 * and rejects anything the UI doesn't offer.
 */

export const DELIVERY_STATUS_META: Record<
  DeliveryStatus,
  { label: string; badgeVariant: "success" | "warning" | "destructive" | "info" | "default" | "secondary" }
> = {
  AVAILABLE: { label: "Available", badgeVariant: "info" },
  ASSIGNED: { label: "Assigned", badgeVariant: "default" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", badgeVariant: "warning" },
  DELIVERED: { label: "Delivered", badgeVariant: "success" },
  FAILED: { label: "Failed", badgeVariant: "destructive" },
  CANCELLED: { label: "Cancelled", badgeVariant: "secondary" },
};

export interface DeliveryStatusAction {
  to: DeliveryStatus;
  label: string;
  buttonVariant: "default" | "destructive" | "outline";
}

/** Legal next statuses for a given current status. */
export const DELIVERY_STATUS_ACTIONS: Record<
  DeliveryStatus,
  DeliveryStatusAction[]
> = {
  AVAILABLE: [
    { to: "CANCELLED", label: "Cancel", buttonVariant: "outline" },
  ],
  ASSIGNED: [
    { to: "OUT_FOR_DELIVERY", label: "Start Delivery", buttonVariant: "default" },
    { to: "CANCELLED", label: "Cancel", buttonVariant: "outline" },
  ],
  OUT_FOR_DELIVERY: [
    { to: "DELIVERED", label: "Mark Delivered", buttonVariant: "default" },
    { to: "FAILED", label: "Mark Failed", buttonVariant: "destructive" },
    { to: "CANCELLED", label: "Cancel", buttonVariant: "outline" },
  ],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

/** Roles that may perform delivery status updates. */
export const DELIVERY_STATUS_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "DELIVERY_BOY",
];

/** Roles that may assign (create) deliveries via emergency reassignment. */
export const DELIVERY_ASSIGN_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
];

/** Whether a delivery is still actively trackable (live GPS makes sense). */
export function isDeliveryActive(status: DeliveryStatus): boolean {
  return status === "ASSIGNED" || status === "OUT_FOR_DELIVERY";
}
