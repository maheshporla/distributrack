/**
 * Single source of truth for every route path in the app.
 * Import ROUTES instead of hardcoding path strings in components/links.
 */
export const ROUTES = {
  // Public / auth
  LOGIN: "/login",
  REGISTER: "/register",
  UNAUTHORIZED: "/unauthorized",

  // Dashboard (protected)
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  INVENTORY: "/inventory",
  WAREHOUSES: "/warehouses",
  CUSTOMERS: "/customers",
  ORDERS: "/orders",
  DELIVERY_WORKERS: "/delivery-workers",
  DELIVERIES: "/deliveries",
  INVOICES: "/invoices",
  PAYMENTS: "/payments",
  ANALYTICS: "/analytics",
  REPORTS: "/reports",
  NOTIFICATIONS: "/notifications",
  SETTINGS: "/settings",

  // Fallback
  NOT_FOUND: "*",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
