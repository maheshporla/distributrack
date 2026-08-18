/**
 * Dashboard summary — mirrors DashboardResponse.java. Revenue counts
 * only DELIVERED/COMPLETED orders (each once); PENDING/REJECTED/
 * CANCELLED are never revenue. Paid/outstanding come from payments.
 */
export interface DashboardResponse {
  totalProducts: number;
  totalInventoryItems: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  completedOrders: number;
  totalWarehouses: number;
  activeDeliveries: number;
  totalUsers: number;
  totalRevenue: number;
  paidAmount: number;
  outstandingAmount: number;
}