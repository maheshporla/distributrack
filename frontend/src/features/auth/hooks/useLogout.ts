import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/constants/routes.constants";

/**
 * Signs the user out.
 *
 * Currently a client-side operation: it clears the locally stored JWT
 * and session state, then redirects to /login. The backend exposes
 * POST /api/auth/logout (which revokes the stored refresh token) but it
 * requires the refresh token that the client does not persist yet.
 *
 * TODO(auth): persist the refresh token and call POST /api/auth/logout
 * before `clearSession()`, treating a failure as non-blocking — the
 * local session should still be cleared even if the server call fails.
 */
export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();

  return useCallback(() => {
    clearSession();
    toast.success("You've been signed out");
    navigate(ROUTES.LOGIN, { replace: true });
  }, [clearSession, navigate]);
}
