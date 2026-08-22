/**
 * Delivery earning types — mirror the Spring Boot backend DTOs exactly.
 *
 * Backend reference:
 *   - DeliveryEarningController: /api/delivery-earnings (my/dashboard, my/history,
 *     admin/dashboard, admin/{id}/dashboard, admin/{id}/history)
 *   - DeliveryEarningResponse: { earningId, deliveryId, orderId, orderNumber,
 *     shopName, shopkeeperName, distanceKm, orderAmount, earningAmount,
 *     deliveryStatus, earnedAt }
 *   - DeliveryEarningsDashboard: { today/month/allTime metrics, history groups,
 *     allDeliveryBoys (admin) }
 */

/** Matches DeliveryEarningResponse.java */
export interface DeliveryEarning {
  earningId: number;
  deliveryId: number;
  orderId: number;
  orderNumber: string;
  shopName: string | null;
  shopkeeperName: string;
  distanceKm: number;
  orderAmount: number;
  earningAmount: number;
  deliveryStatus: string;
  earnedAt: string;
}

/** Matches DailyEarningGroup */
export interface DailyEarningGroup {
  date: string; // ISO date string YYYY-MM-DD
  deliveries: number;
  distanceKm: number;
  orderValue: number;
  earnings: number;
  earningsList: DeliveryEarning[];
}

/** Matches DeliveryBoyEarningsSummary */
export interface DeliveryBoyEarningsSummary {
  deliveryBoyId: number;
  deliveryBoyName: string;
  deliveryBoyPhone: string | null;
  todayEarnings: number;
  monthEarnings: number;
  totalDeliveries: number;
  totalDistanceKm: number;
}

/** Matches DeliveryEarningsDashboard */
export interface DeliveryEarningsDashboard {
  deliveryBoyId: number | null;
  deliveryBoyName: string | null;

  todayDeliveries: number;
  todayDistanceKm: number;
  todayOrderValue: number;
  todayEarnings: number;

  monthDeliveries: number;
  monthDistanceKm: number;
  monthOrderValue: number;
  monthEarnings: number;

  allTimeDeliveries: number;
  allTimeDistanceKm: number;
  allTimeOrderValue: number;
  allTimeEarnings: number;

  todaysEarnings: DeliveryEarning[];
  history: DailyEarningGroup[];

  allDeliveryBoys: DeliveryBoyEarningsSummary[] | null;
}
