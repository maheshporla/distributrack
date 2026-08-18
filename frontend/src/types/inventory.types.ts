export interface Inventory {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  minimumStock: number;
  maximumStock: number;
  warehouseLocation: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryPayload {
  productId: number;
  quantity: number;
  minimumStock: number;
  maximumStock: number;
  warehouseLocation: string;
  active: boolean;
}