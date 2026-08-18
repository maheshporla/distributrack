/**
 * Analytics types — mirror the Spring Boot backend analytics DTOs.
 *
 * Backend reference (AnalyticsController at /api/analytics):
 *   - GET /overview            -> AnalyticsResponse
 *   - GET /sales?from=&to=     -> SalesAnalyticsResponse
 *   - GET /payments            -> PaymentAnalyticsResponse
 *   - GET /deliveries          -> DeliveryAnalyticsResponse
 *   - GET /inventory           -> InventoryAnalyticsResponse
 *
 * Access is SA/OWNER/MANAGER only (SecurityConfig) — business-wide
 * financial data is never exposed to SHOPKEEPER / DELIVERY_BOY / SALESMAN.
 * Revenue everywhere follows the DELIVERED/COMPLETED-only rule.
 */

export interface AnalyticsResponse {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  completedOrders: number;
  totalProducts: number;
  totalInventory: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalWarehouses: number;
  activeDeliveries: number;
  paidAmount: number;
  outstandingAmount: number;
  failedPaymentAmount: number;
  refundedPaymentAmount: number;
  totalUsers: number;
}

export interface SalesTrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: number;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface TopShop {
  shopkeeperId: number;
  shopkeeperName: string;
  orders: number;
  revenue: number;
}

export interface NameCount {
  name: string;
  count: number;
}

export interface SalesAnalyticsResponse {
  salesTrend: SalesTrendPoint[];
  topProducts: TopProduct[];
  topShops: TopShop[];
  orderStatusDistribution: NameCount[];
  paymentStatusDistribution: NameCount[];
}

export interface MethodTotal {
  method: string;
  count: number;
  amount: number;
}

export interface PaymentAnalyticsResponse {
  totalPaid: number;
  outstandingAmount: number;
  failedAmount: number;
  refundedAmount: number;
  byMethod: MethodTotal[];
  paymentStatusDistribution: NameCount[];
}

export interface DeliveryAnalyticsResponse {
  totalDeliveries: number;
  assignedCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  failedCount: number;
  cancelledCount: number;
  activeDeliveries: number;
  deliveryStatusDistribution: NameCount[];
}

export interface WarehouseStock {
  warehouseLocation: string;
  quantity: number;
}

export interface InventoryAnalyticsResponse {
  totalProducts: number;
  totalQuantity: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  byWarehouse: WarehouseStock[];
}
