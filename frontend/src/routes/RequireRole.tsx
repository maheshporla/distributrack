import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/constants/routes.constants";
import type { RoleName } from "@/types/auth.types";

interface RequireRoleProps {
  /** Roles permitted to view the wrapped content. */
  roles: RoleName[];
  children: ReactNode;
}

/**
 * Route-level role guard, paired with the sidebar filtering in
 * SidebarNav. A signed-in user whose role isn't in `roles` is sent to
 * /unauthorized — this protects deep links even though the nav item is
 * hidden. Must be used inside an authenticated tree (ProtectedRoute).
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
  const role = useAuthStore((state) => state.user?.role);

  if (!role || !roles.includes(role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return <>{children}</>;
}
