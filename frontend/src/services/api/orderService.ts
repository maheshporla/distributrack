import { axiosInstance } from "@/services/api/axiosInstance";
import type { Order, OrderPayload, OrderStatus } from "@/types/order.types";

/**
 * Order API client — mirrors the existing service pattern (raw paths,
 * backend returns DTOs directly).
 *
 * Backend reference: OrderController at /api/orders.
 */
export const orderService = {
  /** All operational orders (business roles). SHOPKEEPER gets own via /my. */
  async getAllOrders(): Promise<Order[]> {
    const response = await axiosInstance.get<Order[]>("/orders");
    return response.data;
  },

  /** Orders scoped to the authenticated user (SHOPKEEPER flow). */
  async getMyOrders(): Promise<Order[]> {
    const response = await axiosInstance.get<Order[]>("/orders/my");
    return response.data;
  },

  async getOrderById(id: number): Promise<Order> {
    const response = await axiosInstance.get<Order>(`/orders/${id}`);
    return response.data;
  },

  async createOrder(payload: OrderPayload): Promise<Order> {
    const response = await axiosInstance.post<Order>("/orders", payload);
    return response.data;
  },

  /** Status transitions are validated server-side (OrderStatus.canTransitionTo). */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    const response = await axiosInstance.put<Order>(`/orders/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  async getOrdersByShopkeeper(shopkeeperId: number): Promise<Order[]> {
    const response = await axiosInstance.get<Order[]>(`/orders/shopkeeper/${shopkeeperId}`);
    return response.data;
  },
};
