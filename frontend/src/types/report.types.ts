/**
 * Report types — mirror the Spring Boot backend report DTOs.
 *
 * Backend reference (ReportController at /api/reports):
 *   - GET /sales?from=&to=      -> SalesReportResponse
 *   - GET /orders?from=&to=     -> OrdersReportResponse
 *   - GET /inventory            -> InventoryReportResponse
 *   - GET /deliveries?from=&to= -> DeliveryReportResponse
 *   - GET /payments?from=&to=   -> PaymentReportResponse
 *
 * Access is SA/OWNER/MANAGER only (SecurityConfig). `from`/`to` are
 * ISO dates (YYYY-MM-DD); null = all time.
 */

export interface SalesReportRow {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  shopkeeperName: string;
  totalAmount: number;
  status: string;
}

export interface SalesReportResponse {
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  pendingOrders: number;
  rows: SalesReportRow[];
}

export interface OrdersReportResponse {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  assignedOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  rows: SalesReportRow[];
}

export interface InventoryReportRow {
  inventoryId: number;
  productName: string;
  sku: string;
  warehouseLocation: string;
  quantity: number;
  minimumStock: number;
  status: "OK" | "LOW_STOCK" | "OUT_OF_STOCK";
}

export interface InventoryReportResponse {
  totalProducts: number;
  totalInventoryQuantity: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  rows: InventoryReportRow[];
}

export interface DeliveryReportRow {
  deliveryId: number;
  orderNumber: string;
  deliveryBoyName: string;
  deliveryStatus: string;
  deliveryAddress: string;
  assignedAt: string;
  deliveredAt: string | null;
}

export interface DeliveryReportResponse {
  totalDeliveries: number;
  assignedCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  failedCount: number;
  cancelledCount: number;
  rows: DeliveryReportRow[];
}

export interface PaymentReportRow {
  paymentId: number;
  orderNumber: string;
  shopkeeperName: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: string;
  paymentDate: string;
}

export interface PaymentReportResponse {
  totalPaid: number;
  outstandingAmount: number;
  failedAmount: number;
  refundedAmount: number;
  rows: PaymentReportRow[];
}
