import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  Inventory,
  InventoryPayload,
} from "@/types/inventory.types";

export const inventoryService = {
  async getAllInventory(): Promise<Inventory[]> {
    const response =
      await axiosInstance.get<Inventory[]>("/inventory");

    return response.data;
  },

  async getInventoryById(
    id: number,
  ): Promise<Inventory> {
    const response =
      await axiosInstance.get<Inventory>(
        `/inventory/${id}`,
      );

    return response.data;
  },

  async createInventory(
    payload: InventoryPayload,
  ): Promise<Inventory> {
    const response =
      await axiosInstance.post<Inventory>(
        "/inventory",
        payload,
      );

    return response.data;
  },

  async updateInventory(
    id: number,
    payload: InventoryPayload,
  ): Promise<Inventory> {
    const response =
      await axiosInstance.put<Inventory>(
        `/inventory/${id}`,
        payload,
      );

    return response.data;
  },

  async deleteInventory(
    id: number,
  ): Promise<string> {
    const response =
      await axiosInstance.delete<string>(
        `/inventory/${id}`,
      );

    return response.data;
  },

  async getInventoryByProduct(
    productId: number,
  ): Promise<Inventory> {
    const response =
      await axiosInstance.get<Inventory>(
        `/inventory/product/${productId}`,
      );

    return response.data;
  },

  async getLowStockProducts(): Promise<Inventory[]> {
    const response =
      await axiosInstance.get<Inventory[]>(
        "/inventory/low-stock",
      );

    return response.data;
  },

  async getInventoryByWarehouse(
    warehouseLocation: string,
  ): Promise<Inventory[]> {
    const response =
      await axiosInstance.get<Inventory[]>(
        `/inventory/warehouse/${encodeURIComponent(
          warehouseLocation,
        )}`,
      );

    return response.data;
  },
};