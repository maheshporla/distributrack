import type { AxiosRequestConfig } from "axios";
import { axiosInstance } from "@/services/api/axiosInstance";
import type { ApiResponse, PaginatedResponse } from "@/types/common.types";

/**
 * Generic, typed HTTP verbs that unwrap the backend's `ApiResponse<T>`
 * envelope so feature services can work with plain data types.
 *
 * Every feature service (productService, orderService, ...) should be
 * built on top of this client rather than importing axiosInstance
 * directly, keeping a single seam for request/response shaping.
 */
export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<ApiResponse<T>>(url, config);
    return response.data.data;
  },

  async getPaginated<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<PaginatedResponse<T>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<T>>>(
      url,
      config,
    );
    return response.data.data;
  },

  async post<T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.post<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async put<T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.put<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async patch<T, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await axiosInstance.patch<ApiResponse<T>>(url, body, config);
    return response.data.data;
  },

  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },
};
