import type { OrderStatus } from "@/types/order.types";

/**
 * Order status display metadata + the status actions the Orders UI may
 * offer. Mirrors OrderStatus.canTransitionTo() on the backend, minus the
 * steps driven by other modules:
 *   - ASSIGNED           -> set by delivery creation (Delivery module)
 *   - OUT_FOR_DELIVERY   -> set by the delivery boy
 *   - DELIVERED          -> set by the delivery boy
 *   - COMPLETED          -> set by payment finalization
 *
 * The backend remains authoritative: every action below is a legal
 * transition, and the server rejects anything the UI doesn't offer.
 */

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; badgeVariant: "success" | "warning" | "destructive" | "info" | "default" | "secondary" }
> = {
  PENDING: { label: "Pending", badgeVariant: "warning" },
  APPROVED: { label: "Approved", badgeVariant: "info" },
  REJECTED: { label: "Rejected", badgeVariant: "destructive" },
  ASSIGNED: { label: "Assigned", badgeVariant: "default" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", badgeVariant: "info" },
  DELIVERED: { label: "Delivered", badgeVariant: "success" },
  COMPLETED: { label: "Completed", badgeVariant: "success" },
  CANCELLED: { label: "Cancelled", badgeVariant: "secondary" },
};

export interface OrderStatusAction {
  to: OrderStatus;
  label: string;
  /** Button tone: approve = primary, reject = destructive, cancel = outline. */
  buttonVariant: "default" | "destructive" | "outline";
}

/**
 * Legal next statuses from the Orders page for a given current status.
 * Only SUPER_ADMIN / OWNER / MANAGER may perform these (the backend PUT
 * rule in SecurityConfig matches; SHOPKEEPER and SALESMAN get no actions).
 */
export const ORDER_STATUS_ACTIONS: Record<OrderStatus, OrderStatusAction[]> = {
  PENDING: [
    { to: "APPROVED", label: "Approve", buttonVariant: "default" },
    { to: "REJECTED", label: "Reject", buttonVariant: "destructive" },
    { to: "CANCELLED", label: "Cancel", buttonVariant: "outline" },
  ],
  APPROVED: [
    { to: "REJECTED", label: "Reject", buttonVariant: "destructive" },
    { to: "CANCELLED", label: "Cancel", buttonVariant: "outline" },
  ],
  ASSIGNED: [{ to: "CANCELLED", label: "Cancel", buttonVariant: "outline" }],
  OUT_FOR_DELIVERY: [{ to: "CANCELLED", label: "Cancel", buttonVariant: "outline" }],
  DELIVERED: [],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};
