/**
 * Order types — mirror the Spring Boot backend DTOs exactly.
 *
 * Backend reference:
 *   - OrderController: /api/orders (create, list, /my, /{id}, status
 *     update via PUT /{id}/status?status=..., /shopkeeper/{id},
 *     /status/{status}); returns DTOs directly (no envelope)
 *   - OrderRequest:      { shopkeeperId, items: [{ productId, quantity }] }
 *   - OrderResponse:     { id, orderNumber, shopkeeperId, shopkeeperName,
 *                         items, totalAmount, status, orderDate }
 *   - OrderStatus enum:  PENDING, APPROVED, REJECTED, ASSIGNED,
 *                        OUT_FOR_DELIVERY, DELIVERED, COMPLETED, CANCELLED
 *
 * Backend ownership rules (enforced in OrderServiceImpl, authoritative):
 *   - SHOPKEEPER  -> create/read own orders only (shopkeeperId ignored)
 *   - SALESMAN    -> create orders for any SHOPKEEPER, view all
 *   - SA/OWNER/MANAGER -> full operational access incl. status updates
 *   - DELIVERY_BOY -> no order access (SecurityConfig denies)
 */

export const ORDER_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ASSIGNED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Matches OrderItemResponse.java. */
export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

/** Matches OrderResponse.java. */
export interface Order {
  id: number;
  orderNumber: string;
  shopkeeperId: number;
  shopkeeperName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  orderDate: string;
}

/** Matches OrderItemRequest.java. */
export interface OrderItemPayload {
  productId: number;
  quantity: number;
}

/** Matches OrderRequest.java. */
export interface OrderPayload {
  shopkeeperId: number;
  items: OrderItemPayload[];
}
