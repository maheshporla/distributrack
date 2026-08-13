import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/constants/routes.constants";

/**
 * /unauthorized
 *
 * Shown when a signed-in user lacks permission for something.
 *
 * Not currently linked from any active guard: the backend's JWT carries
 * no role claim and there is no /me endpoint (see AuthenticatedUser in
 * auth.types.ts), so the frontend cannot yet determine a user's role
 * after login to enforce role-based access.
 *
 * TODO(backend): once the JWT includes a role claim, or GET /api/auth/me
 * returns one, add a role-based route guard (e.g. a RequireRole
 * component wrapping specific protected routes in AppRouter.tsx) that
 * redirects here when a signed-in user's role doesn't permit access.
 */
export function UnauthorizedPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const backTo = isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN;
  const backLabel = isAuthenticated ? "Back to dashboard" : "Back to login";

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
