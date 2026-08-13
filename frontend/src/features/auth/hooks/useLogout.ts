import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/constants/routes.constants";

/**
 * Signs the user out.
 *
 * This is a purely client-side operation: it clears the locally stored
 * JWT and session state, then redirects to /login. The backend has no
 * session to invalidate today — AuthController only exposes /login and
 * /register — so there is nothing to call.
 *
 * TODO(backend): once POST /api/auth/logout exists (e.g. to blacklist
 * the token or revoke a future refresh token), call it here, before
 * `clearSession()`, and treat a failure as non-blocking — the local
 * session should still be cleared even if the server call fails.
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
