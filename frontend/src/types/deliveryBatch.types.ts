/**
 * Delivery Batch types — area/route assignment feature.
 *
 * Backend reference:
 *   - DeliveryBatchController: /api/delivery-batches
 *   - DeliveryBatchResponse, DeliveryBatchShopSummary, DeliveryBatchDeliverySummary,
 *     DeliveryBatchItemSummary, EligibleOrdersResponse, EligibleShopPreview,
 *     EligibleOrderPreview
 */

export type DeliveryBatchStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface DeliveryBatchItemSummary {
  productId: number;
  productName: string;
  category: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  failedQuantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface DeliveryBatchDeliverySummary {
  deliveryId: number;
  orderId: number;
  orderNumber: string;
  deliveryStatus: string;
  orderStatus: string;
  totalProducts: number;
  deliveredProducts: number;
  failedProducts: number;
  remainingProducts: number;
  billAmount: number;
  deliveredAmount: number;
  failedAmount: number;
  deliveryAddress: string;
  assignedAt: string | null;
  deliveredAt: string | null;
  items: DeliveryBatchItemSummary[];
}

export interface DeliveryBatchShopSummary {
  shopkeeperId: number;
  shopName: string | null;
  shopkeeperName: string;
  deliveryAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  orderCount: number;
  totalProducts: number;
  deliveredProducts: number;
  failedProducts: number;
  remainingProducts: number;
  totalBill: number;
  deliveredAmount: number;
  failedAmount: number;
  status: string; // PENDING, PARTIAL, DELIVERED, FAILED
  deliveries: DeliveryBatchDeliverySummary[];
}

export interface DeliveryBatchResponse {
  id: number;
  batchNumber: string;
  areaName: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  deliveryBoyId: number;
  deliveryBoyName: string;
  deliveryBoyPhone: string | null;
  deliveryBoyVehicleType: string | null;
  deliveryBoyVehicleNumber: string | null;
  warehouseId: number | null;
  warehouseName: string | null;
  status: DeliveryBatchStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalOrders: number;
  totalShops: number;
  totalProducts: number;
  deliveredProducts: number;
  failedProducts: number;
  remainingProducts: number;
  totalBill: number;
  deliveredAmount: number;
  failedAmount: number;
  shopSummaries: DeliveryBatchShopSummary[];
}

export interface EligibleOrderPreview {
  orderId: number;
  orderNumber: string;
  totalAmount: number;
  productCount: number;
  status: string;
}

export interface EligibleShopPreview {
  shopkeeperId: number;
  shopName: string | null;
  shopkeeperName: string;
  deliveryAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceFromCenterKm: number;
  orders: EligibleOrderPreview[];
  totalProducts: number;
  totalBill: number;
}

export interface EligibleOrdersResponse {
  areaName: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  totalEligibleOrders: number;
  totalShops: number;
  totalProducts: number;
  totalBill: number;
  shops: EligibleShopPreview[];
}

export interface CreateDeliveryBatchPayload {
  areaName: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  deliveryBoyId: number;
  warehouseId?: number;
}

export const DELIVERY_BATCH_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
