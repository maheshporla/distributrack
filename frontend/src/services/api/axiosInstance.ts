import axios from "axios";
import { STORAGE_KEYS } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";
import { useAuthStore } from "@/store/authStore";
import type { ApiError } from "@/types/common.types";
import { env } from "@/config/env";

export const axiosInstance = axios.create({
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
    const token = localStorage.getItem(
      STORAGE_KEYS.ACCESS_TOKEN,
    );

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ---------------------------------------------------------------------------
// Response interceptor — normalize errors; force logout on 401.
// ---------------------------------------------------------------------------
axiosInstance.interceptors.response.use(
  (response) => response,

  (error: any) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      useAuthStore.getState().clearSession();

      // Determine redirect path (Shopkeeper login vs. Admin/Staff login)
      const isShopkeeperPath = window.location.pathname.startsWith("/shopkeeper");
      const loginRoute = isShopkeeperPath ? ROUTES.SHOPKEEPER_LOGIN : ROUTES.LOGIN;

      // Avoid redirect loop if we are already on either login page
      if (
        window.location.pathname !== ROUTES.LOGIN &&
        window.location.pathname !== ROUTES.SHOPKEEPER_LOGIN
      ) {
        window.location.assign(loginRoute);
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