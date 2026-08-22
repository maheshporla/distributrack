/**
 * Single source of truth for every route path in the app.
 * Import ROUTES instead of hardcoding path strings in components/links.
 */
export const ROUTES = {
  // Public / auth
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  /** One-time first-administrator bootstrap (only while the system has no users). */
  SETUP_FIRST_ADMIN: "/setup/first-admin",
  UNAUTHORIZED: "/unauthorized",

  // Shopkeeper portal (separate from admin)
  SHOPKEEPER_LOGIN: "/shopkeeper/login",
  SHOPKEEPER_REGISTER: "/shopkeeper/register",
  SHOPKEEPER_DASHBOARD: "/shopkeeper/dashboard",
  SHOPKEEPER_PRODUCTS: "/shopkeeper/products",
  SHOPKEEPER_ORDERS: "/shopkeeper/orders",
  SHOPKEEPER_DELIVERIES: "/shopkeeper/deliveries",
  SHOPKEEPER_INVOICES: "/shopkeeper/invoices",
  SHOPKEEPER_PAYMENTS: "/shopkeeper/payments",
  SHOPKEEPER_NOTIFICATIONS: "/shopkeeper/notifications",
  SHOPKEEPER_SETTINGS: "/shopkeeper/settings",

  // Delivery Worker portal (separate from admin)
  DELIVERY_WORKER_DASHBOARD: "/delivery/dashboard",
  DELIVERY_WORKER_BATCH: "/delivery/batch",
  DELIVERY_WORKER_AVAILABLE: "/delivery/available",
  DELIVERY_PROFILE: "/delivery/profile",
  DELIVERY_WORKER_DELIVERIES: "/delivery/deliveries",
  DELIVERY_WORKER_NOTIFICATIONS: "/delivery/notifications",
  DELIVERY_WORKER_SETTINGS: "/delivery/settings",

  // Admin / staff portal
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  INVENTORY: "/inventory",
  WAREHOUSES: "/warehouses",
  CUSTOMERS: "/customers",
  ORDERS: "/orders",
  DELIVERY_WORKERS: "/delivery-workers",
  DELIVERY_APPLICATIONS: "/delivery-applications",
  DELIVERY_AREAS: "/delivery-areas",
  DELIVERY_EARNINGS: "/delivery-earnings",
  DELIVERIES: "/deliveries",
  USERS: "/users",
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
