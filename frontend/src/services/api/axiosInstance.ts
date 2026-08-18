import axios from "axios";
import { STORAGE_KEYS } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";
import { useAuthStore } from "@/store/authStore";
import type { ApiError } from "@/types/common.types";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 15000,
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

      // Avoid redirect loop on login page.
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