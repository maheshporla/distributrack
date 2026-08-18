import { create } from "zustand";
import { STORAGE_KEYS } from "@/constants/app.constants";
import { decodeJwt, isTokenExpired } from "@/lib/jwt";
import { ROLE_NAMES, type AuthenticatedUser, type RoleName } from "@/types/auth.types";

interface AuthState {
  /** Raw JWT access token, also mirrored in localStorage for axiosInstance to read. */
  token: string | null;
  user: AuthenticatedUser | null;

  
  isAuthenticated: boolean;

  /** Persists the token and derives `user` from it after a successful login. */
  setSession: (token: string) => void;
  /** Clears the session locally. Purely client-side — see useLogout for details. */
  clearSession: () => void;
  /** Updates the local user cache (e.g. name) during profile editing. */
  updateUser: (updatedUser: Partial<AuthenticatedUser>) => void;
}

/**
 * Derives the client-side user from a JWT's decoded claims.
 *
 * The backend now signs access tokens with userId, fullName and role
 * claims (see JwtService.java), so the session can be built synchronously
 * from the token without a /me round-trip. The role claim is validated
 * against the known role list before being trusted.
 */
function buildUserFromToken(token: string): AuthenticatedUser | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;

  const role: RoleName = ROLE_NAMES.includes(decoded.role as RoleName)
    ? (decoded.role as RoleName)
    : "SHOPKEEPER";

  return {
    id: decoded.userId,
    email: decoded.sub,
    fullName: decoded.fullName,
    role,
    tokenExpiresAt: decoded.exp,
  };
}

/**
 * Reads and validates any token already in localStorage, synchronously,
 * so the store's initial state is correct on the very first render —
 * no loading flash, no separate hydration effect needed.
 */
function readInitialSession(): { token: string | null; user: AuthenticatedUser | null } {
  const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (!storedToken || isTokenExpired(storedToken)) {
    if (storedToken) localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    return { token: null, user: null };
  }
  return { token: storedToken, user: buildUserFromToken(storedToken) };
}

export const useAuthStore = create<AuthState>()((set) => {
  const { token, user } = readInitialSession();

  return {
    token,
    user,
    isAuthenticated: Boolean(user),

    setSession: (nextToken) => {
      const nextUser = buildUserFromToken(nextToken);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, nextToken);
      set({ token: nextToken, user: nextUser, isAuthenticated: Boolean(nextUser) });
    },

    clearSession: () => {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      set({ token: null, user: null, isAuthenticated: false });
    },

    updateUser: (updatedUser) => {
      set((state) => {
        if (!state.user) return state;
        return {
          user: {
            ...state.user,
            ...updatedUser,
          },
        };
      });
    },
  };
});
