import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/constants/routes.constants";
import { defaultRouteForRole } from "@/lib/roleRoutes";

/**
 * /unauthorized
 *
 * Shown when a signed-in user lacks permission for something.
 *
 * The "back" link is role-aware: the dashboard is business-role only
 * (SA/OWNER/MANAGER), so a DELIVERY_BOY or SHOPKEEPER landing here is
 * sent to the page matching their role instead of looping back.
 */
export function UnauthorizedPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);
  const backTo = isAuthenticated ? defaultRouteForRole(role) : ROUTES.LOGIN;
  const backLabel = isAuthenticated ? "Back to your home" : "Back to login";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">Access denied</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. If you think this is a mistake,
          contact your administrator.
        </p>
      </div>
      <Button asChild>
        <Link to={backTo}>{backLabel}</Link>
      </Button>
    </div>
  );
}
