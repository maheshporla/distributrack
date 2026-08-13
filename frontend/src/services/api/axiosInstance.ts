import axios, { type AxiosError, type AxiosInstance } from "axios";
import { env } from "@/config/env";
import { STORAGE_KEYS } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";
import { useAuthStore } from "@/store/authStore";
import type { ApiError } from "@/types/common.types";

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach the bearer token to every outgoing request.
// ---------------------------------------------------------------------------
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — normalize errors; force logout on 401.
//
// TODO(backend): once POST /api/auth/refresh exists, this is the place to
// add a silent refresh-and-retry flow (attempt one token refresh before
// giving up and redirecting to /login, queuing any requests that arrive
// while the refresh is in flight). Until then, a 401 always means the
// current token is invalid or expired — there is nothing to retry.
// ---------------------------------------------------------------------------
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();

      // Avoid a redirect loop if the 401 happened on the login page itself
      // (e.g. a protected request fired just before navigation settles).
      if (window.location.pathname !== ROUTES.LOGIN) {
        window.location.assign(ROUTES.LOGIN);
      }
    }

    const normalized: ApiError = {
      status: error.response?.status ?? 0,
      message:
        error.response?.data?.message ??
        error.message ??
        "Something went wrong. Please try again.",
      errors: error.response?.data?.errors,
      path: originalRequest?.url,
    };

    return Promise.reject(normalized);
  },
);
