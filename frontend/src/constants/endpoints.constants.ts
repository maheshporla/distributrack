/**
 * REST endpoint paths, relative to `env.apiBaseUrl`.
 *
 * These mirror the actual Spring Boot @RequestMapping structure
 * (AuthController -> /api/auth, ProductController -> /api/products, ...)
 * so the frontend/backend contract stays predictable as features are
 * added. Every constant here corresponds to a real backend endpoint.
 *
 * Note: the backend is NOT envelope-wrapped — endpoints return their DTOs
 * directly, and services return `response.data` as-is.
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    ME: "/auth/me",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    CHANGE_PASSWORD: "/auth/change-password",
    PROFILE: "/auth/profile",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  PRODUCTS: {
    BASE: "/products",
    BY_ID: (id: string | number) => `/products/${id}`,
    SEARCH: (keyword: string) => `/products/search?keyword=${encodeURIComponent(keyword)}`,
    BY_CATEGORY: (category: string) => `/products/category/${encodeURIComponent(category)}`,
  },
  INVENTORY: {
    BASE: "/inventory",
    BY_ID: (id: string | number) => `/inventory/${id}`,
    BY_PRODUCT: (productId: string | number) => `/inventory/product/${productId}`,
    LOW_STOCK: "/inventory/low-stock",
    /** Backend matches on the free-text warehouseLocation string, not an id. */
    BY_WAREHOUSE: (warehouseLocation: string) =>
      `/inventory/warehouse/${encodeURIComponent(warehouseLocation)}`,
  },
  WAREHOUSES: {
    BASE: "/warehouses",
    BY_ID: (id: string | number) => `/warehouses/${id}`,
    ACTIVE: "/warehouses/active",
    SEARCH: (keyword: string) => `/warehouses/search?keyword=${encodeURIComponent(keyword)}`,
    BY_CITY: (city: string) => `/warehouses/city/${encodeURIComponent(city)}`,
    BY_STATE: (state: string) => `/warehouses/state/${encodeURIComponent(state)}`,
  },
  USERS: {
    BASE: "/users",
    BY_ID: (id: string | number) => `/users/${id}`,
    BY_ROLE: (role: string) => `/users?role=${role}`,
    SEARCH: (keyword: string) => `/users?search=${encodeURIComponent(keyword)}`,
  },
  /** Customers are SHOPKEEPER accounts managed through /api/users. */
  CUSTOMERS: {
    LIST: (search?: string) =>
      `/users?role=SHOPKEEPER${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    BY_ID: (id: string | number) => `/users/${id}`,
  },
  /** Delivery workers are DELIVERY_BOY accounts managed through /api/users. */
  DELIVERY_WORKERS: {
    LIST: (search?: string) =>
      `/users?role=DELIVERY_BOY${search ? `&search=${encodeURIComponent(search)}` : ""}`,
    BY_ID: (id: string | number) => `/users/${id}`,
  },
  ORDERS: {
    BASE: "/orders",
    BY_ID: (id: string | number) => `/orders/${id}`,
    MY: "/orders/my",
    STATUS: (id: string | number, status: string) => `/orders/${id}/status?status=${status}`,
    BY_SHOPKEEPER: (shopkeeperId: string | number) => `/orders/shopkeeper/${shopkeeperId}`,
    BY_STATUS: (status: string) => `/orders/status/${status}`,
  },
  /** Backend controller is mapped at /api/delivery (singular). */
  DELIVERIES: {
    BASE: "/delivery",
    BY_ID: (id: string | number) => `/delivery/${id}`,
    STATUS: (id: string | number, status: string) => `/delivery/${id}/status?status=${status}`,
    LOCATION: (id: string | number) => `/delivery/${id}/location`,
    BY_DELIVERY_BOY: (deliveryBoyId: string | number) => `/delivery/delivery-boy/${deliveryBoyId}`,
    BY_STATUS: (status: string) => `/delivery/status/${status}`,
  },
  PAYMENTS: {
    BASE: "/payments",
    BY_ID: (id: string | number) => `/payments/${id}`,
    STATUS: (id: string | number, status: string) => `/payments/${id}/status?status=${status}`,
    BY_TRANSACTION: (transactionId: string) => `/payments/transaction/${transactionId}`,
    BY_STATUS: (status: string) => `/payments/status/${status}`,
    BY_METHOD: (paymentMethod: string) => `/payments/method/${paymentMethod}`,
  },
  ANALYTICS: {
    OVERVIEW: "/analytics/overview",
    SALES: "/analytics/sales",
  },
  REPORTS: {
    BASE: "/reports",
    SALES: "/reports/sales",
    INVENTORY: "/reports/inventory",
  },
  NOTIFICATIONS: {
    BASE: "/notifications",
    MARK_READ: (id: string | number) => `/notifications/${id}/read`,
  },
  /** One-time first-admin setup (guarded server-side to an empty users table). */
  SETUP: {
    STATUS: "/setup/status",
    FIRST_ADMIN: "/setup/first-admin",
  },
} as const;
