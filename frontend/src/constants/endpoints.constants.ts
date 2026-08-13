/**
 * REST endpoint paths, relative to `env.apiBaseUrl`.
 *
 * These are grouped to mirror the anticipated Spring Boot @RequestMapping
 * structure (e.g. AuthController -> /auth, ProductController -> /products)
 * so the frontend/backend contract stays predictable as features are added.
 */
export const ENDPOINTS = {
  /**
   * Only /login and /register exist on the backend today (see
   * AuthController.java). Do not add ME, REFRESH, LOGOUT,
   * FORGOT_PASSWORD, RESET_PASSWORD, or VERIFY_EMAIL here until the
   * corresponding Spring Boot endpoint actually exists — an endpoint
   * constant pointing nowhere is worse than no constant at all.
   *
   * TODO(backend): add entries here as each endpoint ships:
   *   - GET  /auth/me
   *   - POST /auth/refresh
   *   - POST /auth/logout
   *   - POST /auth/forgot-password
   *   - POST /auth/reset-password
   *   - POST /auth/verify-email
   */
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },
  PRODUCTS: {
    BASE: "/products",
    BY_ID: (id: string | number) => `/products/${id}`,
  },
  INVENTORY: {
    BASE: "/inventory",
    BY_WAREHOUSE: (warehouseId: string | number) => `/inventory/warehouse/${warehouseId}`,
  },
  WAREHOUSES: {
    BASE: "/warehouses",
    BY_ID: (id: string | number) => `/warehouses/${id}`,
  },
  CUSTOMERS: {
    BASE: "/customers",
    BY_ID: (id: string | number) => `/customers/${id}`,
  },
  ORDERS: {
    BASE: "/orders",
    BY_ID: (id: string | number) => `/orders/${id}`,
  },
  DELIVERY_WORKERS: {
    BASE: "/delivery-workers",
    BY_ID: (id: string | number) => `/delivery-workers/${id}`,
  },
  DELIVERIES: {
    BASE: "/deliveries",
    BY_ID: (id: string | number) => `/deliveries/${id}`,
  },
  INVOICES: {
    BASE: "/invoices",
    BY_ID: (id: string | number) => `/invoices/${id}`,
  },
  PAYMENTS: {
    BASE: "/payments",
    BY_ID: (id: string | number) => `/payments/${id}`,
  },
  ANALYTICS: {
    OVERVIEW: "/analytics/overview",
    SALES: "/analytics/sales",
  },
  REPORTS: {
    BASE: "/reports",
  },
  NOTIFICATIONS: {
    BASE: "/notifications",
    MARK_READ: (id: string | number) => `/notifications/${id}/read`,
  },
} as const;
