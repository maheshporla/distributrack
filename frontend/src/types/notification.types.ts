/**
 * Notification types — mirror the Spring Boot backend.
 *
 * Backend reference:
 *   - NotificationController at /api/notifications: GET list,
 *     GET /unread-count, PUT /{id}/read, PUT /read-all
 *   - NotificationType enum: ORDER_CREATED, ORDER_APPROVED,
 *     ORDER_REJECTED, ORDER_CANCELLED, DELIVERY_ASSIGNED,
 *     DELIVERY_OUT_FOR_DELIVERY, DELIVERY_DELIVERED, DELIVERY_FAILED,
 *     DELIVERY_CANCELLED, PAYMENT_SUCCESS, PAYMENT_FAILED,
 *     PAYMENT_REFUNDED, INVOICE_AVAILABLE, LOW_STOCK
 *   - NotificationResponse: { id, type, title, message, relatedOrderId,
 *                             read, createdAt }
 *
 * Ownership is enforced server-side via the JWT principal — a user can
 * only ever see/read their own notifications.
 */

export const NOTIFICATION_TYPES = [
  "ORDER_CREATED",
  "ORDER_APPROVED",
  "ORDER_REJECTED",
  "ORDER_CANCELLED",
  "DELIVERY_ASSIGNED",
  "DELIVERY_OUT_FOR_DELIVERY",
  "DELIVERY_DELIVERED",
  "DELIVERY_FAILED",
  "DELIVERY_CANCELLED",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "PAYMENT_REFUNDED",
  "INVOICE_AVAILABLE",
  "LOW_STOCK",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Matches NotificationResponse.java. */
export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedOrderId: number | null;
  read: boolean;
  createdAt: string;
}

/** Route a notification should deep-link to, by type family. */
export function notificationRoute(type: NotificationType): string {
  if (type === "LOW_STOCK") return "/inventory";
  if (type.startsWith("DELIVERY_")) return "/deliveries";
  if (type.startsWith("PAYMENT_") || type === "INVOICE_AVAILABLE") {
    return type === "INVOICE_AVAILABLE" ? "/invoices" : "/payments";
  }
  // ORDER_* family
  return "/orders";
}

/**
 * Role-aware notification route. Delivery workers use their own portal
 * paths, while all other roles use the admin paths.
 */
export function notificationRouteForRole(
  type: NotificationType,
  role?: string,
): string {
  if (role === "DELIVERY_BOY") {
    if (type.startsWith("DELIVERY_")) return "/delivery/deliveries";
    if (type === "LOW_STOCK") return "/delivery/profile";
    if (type.startsWith("PAYMENT_") || type === "INVOICE_AVAILABLE") {
      return "/delivery/profile";
    }
    return "/delivery/notifications";
  }
  return notificationRoute(type);
}
