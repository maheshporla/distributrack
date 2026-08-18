import { axiosInstance } from "@/services/api/axiosInstance";
import type { Warehouse, WarehousePayload } from "@/types/warehouse.types";

/**
 * Warehouse API client — mirrors the existing productService /
 * inventoryService pattern (raw paths, backend returns DTOs directly).
 *
 * Backend reference: WarehouseController at /api/warehouses.
 */
export const warehouseService = {
  async getAllWarehouses(): Promise<Warehouse[]> {
    const response = await axiosInstance.get<Warehouse[]>("/warehouses");
    return response.data;
  },

  async getWarehouseById(id: number): Promise<Warehouse> {
    const response = await axiosInstance.get<Warehouse>(`/warehouses/${id}`);
    return response.data;
  },

  async createWarehouse(payload: WarehousePayload): Promise<Warehouse> {
    const response = await axiosInstance.post<Warehouse>("/warehouses", payload);
    return response.data;
  },

  async updateWarehouse(
    id: number,
    payload: WarehousePayload,
  ): Promise<Warehouse> {
    const response = await axiosInstance.put<Warehouse>(
      `/warehouses/${id}`,
      payload,
    );
    return response.data;
  },

  async deleteWarehouse(id: number): Promise<string> {
    const response = await axiosInstance.delete<string>(`/warehouses/${id}`);
    return response.data;
  },

  async getActiveWarehouses(): Promise<Warehouse[]> {
    const response = await axiosInstance.get<Warehouse[]>("/warehouses/active");
    return response.data;
  },

  async searchWarehouses(keyword: string): Promise<Warehouse[]> {
    const response = await axiosInstance.get<Warehouse[]>("/warehouses/search", {
      params: { keyword },
    });
    return response.data;
  },
};
