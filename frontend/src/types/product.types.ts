import type { ApiError } from "@/types/common.types";

export interface Product {
  id: number;
  productName: string;
  description: string | null;
  category: string;
  brand: string | null;
  sku: string;
  price: number;
  stockQuantity: number;
  unit: string;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPayload {
  productName: string;
  description?: string;
  category: string;
  brand?: string;
  sku: string;
  price: number;
  stockQuantity: number;
  unit: string;
  imageUrl?: string;
}

export type ProductApiError = ApiError;