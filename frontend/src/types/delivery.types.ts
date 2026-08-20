/**
 * Delivery types — mirror the Spring Boot backend DTOs exactly.
 *
 * Backend reference:
 *   - DeliveryController: /api/delivery (create, list, /{id}, PUT
 *     /{id}/status?status=..., PUT /{id}/location, /delivery-boy/{id},
 *     /status/{status}); returns DTOs directly (no envelope)
 *   - DeliveryRequest:     { orderId, deliveryBoyId, deliveryAddress,
 *                           vehicleNumber }
 *   - LocationUpdateRequest: { latitude, longitude }
 *   - DeliveryResponse:    { id, orderId, orderNumber, deliveryBoyId,
 *                           deliveryBoyName, shopkeeperId, shopkeeperName,
 *                           shopkeeperPhone, orderTotalAmount,
 *                           deliveryStatus, orderStatus, deliveryAddress,
 *                           vehicleNumber, latitude, longitude,
 *                           lastLocationAt, assignedAt, deliveredAt }
 *   - DeliveryStatus enum: ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, FAILED,
 *                          CANCELLED
 *
 * Backend ownership rules (enforced in DeliveryServiceImpl, authoritative):
 *   - DELIVERY_BOY  -> own deliveries only (view/status/location)
 *   - SHOPKEEPER    -> deliveries for their own orders only, read-only
 *   - SA/OWNER/MANAGER -> full operational access incl. assignment
 *   - SALESMAN      -> no delivery access (SecurityConfig denies)
 */

export const DELIVERY_STATUSES = [
  "AVAILABLE",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Matches DeliveryResponse.java. */
export interface Delivery {
  id: number;
  orderId: number;
  orderNumber: string;
  /** Null when delivery is AVAILABLE (not yet accepted). */
  deliveryBoyId: number | null;
  /** Null when delivery is AVAILABLE (not yet accepted). */
  deliveryBoyName: string | null;
  shopkeeperId: number;
  shopkeeperName: string;
  shopkeeperPhone: string;
  orderTotalAmount: number;
  deliveryStatus: DeliveryStatus;
  /** Reason provided when the delivery was marked as FAILED. Null otherwise. */
  failureReason: string | null;
  /** Order status is synced by the backend (ASSIGNED/DELIVERED/CANCELLED). */
  orderStatus: string;
  deliveryAddress: string;
  vehicleNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: string | null;
  /** When the delivery was made available for workers. */
  availableAt: string;
  assignedAt: string | null;
  deliveredAt: string | null;
}

/** Matches DeliveryRequest.java. */
export interface DeliveryPayload {
  orderId: number;
  deliveryBoyId: number;
  deliveryAddress: string;
  vehicleNumber?: string;
}

/** Matches LocationUpdateRequest.java. */
export interface LocationPayload {
  latitude: number;
  longitude: number;
}
