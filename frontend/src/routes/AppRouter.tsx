import { lazy, Suspense } from "react";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ShopkeeperDashboardPage } from "@/features/dashboard/pages/ShopkeeperDashboardPage";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ShopkeeperLayout } from "@/components/layout/ShopkeeperLayout";
import { DeliveryWorkerLayout } from "@/components/layout/DeliveryWorkerLayout";
import { GuestRoute } from "@/routes/GuestRoute";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { UnauthorizedPage } from "@/routes/UnauthorizedPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ForgotPasswordPage } from "@/features/auth/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { ROUTES } from "@/constants/routes.constants";
import { ProductsPage } from "@/features/products/pages/ProductsPage";
import { InventoryPage } from "@/features/inventory/pages/InventoryPage";
import { WarehousesPage } from "@/features/warehouses/pages/WarehousesPage";
import { OrdersPage } from "@/features/orders/pages/OrdersPage";
import { CustomersPage } from "@/features/customers/pages/CustomersPage";
import { DeliveryWorkersPage } from "@/features/delivery-workers/pages/DeliveryWorkersPage";
import { DeliveriesPage } from "@/features/deliveries/pages/DeliveriesPage";
import { DeliveryAreasPage } from "@/features/delivery-areas/pages/DeliveryAreasPage";
import { PaymentsPage } from "@/features/payments/pages/PaymentsPage";
import { InvoicesPage } from "@/features/invoices/pages/InvoicesPage";
import { NotificationsPage } from "@/features/notifications/pages/NotificationsPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { RequireRole } from "@/routes/RequireRole";
import { UsersManagementPage } from "@/features/users/pages/UsersManagementPage";
import { FirstAdminSetupPage } from "@/features/setup/pages/FirstAdminSetupPage";
import { WorkerProfilePage } from "@/features/delivery-workers/pages/WorkerProfilePage";
import { DeliveryBoyDashboardPage } from "@/features/delivery-workers/pages/DeliveryBoyDashboardPage";
import { DeliveryBatchDetailPage } from "@/features/delivery-areas/pages/DeliveryBatchDetailPage";
import { AvailableDeliveriesPage } from "@/features/delivery-workers/pages/AvailableDeliveriesPage";
import { DeliveryPartnerApplicationsPage } from "@/features/delivery-workers/pages/DeliveryPartnerApplicationsPage";

/**
 * Analytics and Reports are the only Recharts-heavy pages; lazy-loading
 * keeps the shared chunk small (Recharts ships in a separate chunk that
 * is only fetched when one of these routes is visited).
 */
const AnalyticsPage = lazy(() =>
  import("@/features/analytics/pages/AnalyticsPage").then((m) => ({
    default: m.AnalyticsPage,
  })),
);
const ReportsPage = lazy(() =>
  import("@/features/reports/pages/ReportsPage").then((m) => ({
    default: m.ReportsPage,
  })),
);

/** Simple centered spinner used while lazy chunks load. */
function RouteLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/**
 * Central route tree.
 *
 * - `/` unconditionally redirects to `/login`. If the visitor is already
 *   authenticated, `GuestRoute` immediately redirects them onward from
 *   `/login` to `/dashboard` — a two-hop redirect for the signed-in
 *   case, but it keeps `/` -> `/login` literal and unconditional rather
 *   than duplicating GuestRoute's auth check here too.
 * - `/login`, `/register` render inside AuthLayout, guarded by
 *   GuestRoute (redirects signed-in users to /dashboard).
 * - `/unauthorized` is a standalone route, reachable by anyone. Nothing
 *   redirects here yet — see UnauthorizedPage.tsx for why.
 * - Every other known route renders inside DashboardLayout, guarded by
 *   ProtectedRoute (redirects to /login when unauthenticated).
 * - Customers and Settings are still PlaceholderPage stand-ins (not yet
 *   built); every other feature renders a real page.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

      {/* ---------------------------------------------------------------- */}
      {/* Guest-only routes (redirect to /dashboard if already signed in)  */}
      {/* ---------------------------------------------------------------- */}
      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
          {/* One-time bootstrap — the page itself redirects to /login when
              the system is already initialized; the backend rejects calls
              once any user exists. */}
          <Route
            path={ROUTES.SETUP_FIRST_ADMIN}
            element={<FirstAdminSetupPage />}
          />
        </Route>
      </Route>

      {/* ---------------------------------------------------------------- */}
      {/* Standalone                                                       */}
      {/* ---------------------------------------------------------------- */}
      <Route path={ROUTES.UNAUTHORIZED} element={<UnauthorizedPage />} />

      {/* ---------------------------------------------------------------- */}
      {/* Protected dashboard routes                                       */}
      {/* ---------------------------------------------------------------- */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={ROUTES.DASHBOARD}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <DashboardPage />
            </RequireRole>
          }
        />
<Route
  path={ROUTES.PRODUCTS}
  element={
    <RequireRole
      roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"]}
    >
      <ProductsPage />
    </RequireRole>
  }
/>
<Route
  path={ROUTES.INVENTORY}
  element={
    <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN"]}>
      <InventoryPage />
    </RequireRole>
  }
/>
        <Route
          path={ROUTES.WAREHOUSES}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <WarehousesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.CUSTOMERS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN"]}>
              <CustomersPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.ORDERS}
          element={
            <RequireRole
              roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"]}
            >
              <OrdersPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKERS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <DeliveryWorkersPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_AREAS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <DeliveryAreasPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERIES}
          element={
            <RequireRole
              roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SHOPKEEPER"]}
            >
              <DeliveriesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.INVOICES}
          element={
            <RequireRole
              roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"]}
            >
              <InvoicesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.PAYMENTS}
          element={
            <RequireRole
              roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"]}
            >
              <PaymentsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <Suspense fallback={<RouteLoading />}>
                <AnalyticsPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.REPORTS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <Suspense fallback={<RouteLoading />}>
                <ReportsPage />
              </Suspense>
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={<NotificationsPage />}
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <RequireRole
              roles={["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"]}
            >
              <SettingsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.USERS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <UsersManagementPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_APPLICATIONS}
          element={
            <RequireRole roles={["SUPER_ADMIN", "OWNER", "MANAGER"]}>
              <DeliveryPartnerApplicationsPage />
            </RequireRole>
          }
        />
      </Route>

      {/* ---------------------------------------------------------------- */}
      {/* Shopkeeper portal — separate layout, SHOPKEEPER only             */}
      {/* ---------------------------------------------------------------- */}
      <Route
        element={
          <ProtectedRoute>
            <ShopkeeperLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={ROUTES.SHOPKEEPER_DASHBOARD}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <ShopkeeperDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_PRODUCTS}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <ProductsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_ORDERS}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <OrdersPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_DELIVERIES}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <DeliveriesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_INVOICES}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <InvoicesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_PAYMENTS}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <PaymentsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_NOTIFICATIONS}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <NotificationsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.SHOPKEEPER_SETTINGS}
          element={
            <RequireRole roles={["SHOPKEEPER"]}>
              <SettingsPage />
            </RequireRole>
          }
        />
      </Route>

      {/* ---------------------------------------------------------------- */}
      {/* Delivery Worker portal — separate layout, DELIVERY_BOY only       */}
      {/* ---------------------------------------------------------------- */}
      <Route
        element={
          <ProtectedRoute>
            <DeliveryWorkerLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path={ROUTES.DELIVERY_WORKER_DASHBOARD}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <DeliveryBoyDashboardPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKER_BATCH}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <DeliveryBatchDetailPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKER_AVAILABLE}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <AvailableDeliveriesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_PROFILE}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <WorkerProfilePage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKER_DELIVERIES}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <DeliveriesPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKER_NOTIFICATIONS}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <NotificationsPage />
            </RequireRole>
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKER_SETTINGS}
          element={
            <RequireRole roles={["DELIVERY_BOY"]}>
              <SettingsPage />
            </RequireRole>
          }
        />
      </Route>

      {/* ---------------------------------------------------------------- */}
      {/* Fallback                                                         */}
      {/* ---------------------------------------------------------------- */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
    </Routes>
  );
}
