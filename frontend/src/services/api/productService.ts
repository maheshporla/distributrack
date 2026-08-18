import { axiosInstance } from "@/services/api/axiosInstance";
import type { Product, ProductPayload } from "@/types/product.types";

export const productService = {
  async getAllProducts(): Promise<Product[]> {
    const response = await axiosInstance.get<Product[]>("/products");
    return response.data;
  },

  async getProductById(id: number): Promise<Product> {
    const response = await axiosInstance.get<Product>(`/products/${id}`);
    return response.data;
  },

  async createProduct(payload: ProductPayload): Promise<Product> {
    const response = await axiosInstance.post<Product>(
      "/products",
      payload,
    );

    return response.data;
  },

  async updateProduct(
    id: number,
    payload: ProductPayload,
  ): Promise<Product> {
    const response = await axiosInstance.put<Product>(
      `/products/${id}`,
      payload,
    );

    return response.data;
  },

  async deleteProduct(id: number): Promise<string> {
    const response = await axiosInstance.delete<string>(
      `/products/${id}`,
    );

    return response.data;
  },

  async searchProducts(keyword: string): Promise<Product[]> {
    const response = await axiosInstance.get<Product[]>(
      "/products/search",
      {
        params: { keyword },
      },
    );

    return response.data;
  },

  async getProductsByCategory(category: string): Promise<Product[]> {
    const response = await axiosInstance.get<Product[]>(
      `/products/category/${encodeURIComponent(category)}`,
    );

    return response.data;
  },
};