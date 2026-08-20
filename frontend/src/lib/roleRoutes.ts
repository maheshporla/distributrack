import { ROUTES } from "@/constants/routes.constants";
import type { RoleName } from "@/types/auth.types";

/**
 * The page a user lands on after login (and where GuestRoute bounces
 * already-authenticated visitors). The Dashboard and its analytics are
 * business-role only (SecurityConfig restricts /api/dashboard/**), so
 * other roles land on the page that matches their work instead of a
 * 403'ing dashboard.
 */
export function defaultRouteForRole(role: RoleName | undefined): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "OWNER":
    case "MANAGER":
      return ROUTES.DASHBOARD;
    case "DELIVERY_BOY":
      return ROUTES.DELIVERY_PROFILE;
    case "SHOPKEEPER":
      return ROUTES.SHOPKEEPER_DASHBOARD;
    case "SALESMAN":
      return ROUTES.ORDERS;
    default:
      return ROUTES.DASHBOARD;
  }
}
