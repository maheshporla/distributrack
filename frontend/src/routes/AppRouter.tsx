import { Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GuestRoute } from "@/routes/GuestRoute";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PlaceholderPage } from "@/routes/PlaceholderPage";
import { ScaffoldPreviewPage } from "@/routes/ScaffoldPreviewPage";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { UnauthorizedPage } from "@/routes/UnauthorizedPage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";
import { ROUTES } from "@/constants/routes.constants";

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
 * - Feature pages other than the auth flow are still PlaceholderPage
 *   stand-ins until their own phase of the build implements them.
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
        <Route path={ROUTES.DASHBOARD} element={<ScaffoldPreviewPage />} />

        <Route
          path={ROUTES.PRODUCTS}
          element={
            <PlaceholderPage
              title="Products"
              description="Manage your product catalog."
            />
          }
        />
        <Route
          path={ROUTES.INVENTORY}
          element={
            <PlaceholderPage
              title="Inventory"
              description="Track stock levels across warehouses."
            />
          }
        />
        <Route
          path={ROUTES.WAREHOUSES}
          element={
            <PlaceholderPage
              title="Warehouses"
              description="Manage warehouse locations and capacity."
            />
          }
        />
        <Route
          path={ROUTES.CUSTOMERS}
          element={
            <PlaceholderPage
              title="Customers"
              description="View and manage your customer accounts."
            />
          }
        />
        <Route
          path={ROUTES.ORDERS}
          element={
            <PlaceholderPage
              title="Orders"
              description="Track and fulfill customer orders."
            />
          }
        />
        <Route
          path={ROUTES.DELIVERY_WORKERS}
          element={
            <PlaceholderPage
              title="Delivery Workers"
              description="Manage your delivery staff."
            />
          }
        />
        <Route
          path={ROUTES.DELIVERIES}
          element={
            <PlaceholderPage
              title="Deliveries"
              description="Track delivery routes and status."
            />
          }
        />
        <Route
          path={ROUTES.INVOICES}
          element={
            <PlaceholderPage title="Invoices" description="Manage customer invoices." />
          }
        />
        <Route
          path={ROUTES.PAYMENTS}
          element={
            <PlaceholderPage
              title="Payments"
              description="Track payments and outstanding balances."
            />
          }
        />
        <Route
          path={ROUTES.ANALYTICS}
          element={
            <PlaceholderPage
              title="Analytics"
              description="Business performance at a glance."
            />
          }
        />
        <Route
          path={ROUTES.REPORTS}
          element={
            <PlaceholderPage
              title="Reports"
              description="Generate and export operational reports."
            />
          }
        />
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={
            <PlaceholderPage
              title="Notifications"
              description="Stay on top of important updates."
            />
          }
        />
        <Route
          path={ROUTES.SETTINGS}
          element={
            <PlaceholderPage
              title="Settings"
              description="Manage your account and preferences."
            />
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
