import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { defaultRouteForRole } from "@/lib/roleRoutes";

/**
 * Guards routes meant only for signed-out users (Login, Register).
 * An already-authenticated user hitting these routes is bounced to the
 * dashboard instead of being shown a sign-in form they don't need.
 *
 * Auth state is read synchronously from `useAuthStore` (itself
 * initialized synchronously from localStorage — see authStore.ts), so
 * there is no async work and nothing to show a loading state for.
 */
export function GuestRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);

  if (isAuthenticated) {
    // Role-aware landing — the dashboard is business-role only.
    return <Navigate to={defaultRouteForRole(role)} replace />;
  }

  return <Outlet />;
}
