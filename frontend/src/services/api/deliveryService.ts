import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  Delivery,
  DeliveryPayload,
  DeliveryStatus,
  LocationPayload,
} from "@/types/delivery.types";

/**
 * Delivery API client — mirrors the existing service pattern (raw paths,
 * backend returns DTOs directly).
 *
 * Backend reference: DeliveryController at /api/delivery (singular).
 * Ownership is enforced server-side (DELIVERY_BOY own only, SHOPKEEPER
 * own orders only).
 */
export const deliveryService = {
  async getAllDeliveries(): Promise<Delivery[]> {
    const response = await axiosInstance.get<Delivery[]>("/delivery");
    return response.data;
  },

  async getDeliveryById(id: number): Promise<Delivery> {
    const response = await axiosInstance.get<Delivery>(`/delivery/${id}`);
    return response.data;
  },

  /** Assigns a delivery to a DELIVERY_BOY (SA/OWNER/MANAGER only). */
  async createDelivery(payload: DeliveryPayload): Promise<Delivery> {
    const response = await axiosInstance.post<Delivery>("/delivery", payload);
    return response.data;
  },

  /** Transitions are validated server-side (DeliveryStatus.canTransitionTo). */
  async updateDeliveryStatus(
    id: number,
    status: DeliveryStatus,
    failureReason?: string,
  ): Promise<Delivery> {
    const params: Record<string, string> = { status };
    if (failureReason) {
      params.failureReason = failureReason;
    }
    const response = await axiosInstance.put<Delivery>(
      `/delivery/${id}/status`,
      null,
      { params },
    );
    return response.data;
  },

  /** Live GPS push from the delivery boy (own deliveries only). */
  async updateDeliveryLocation(
    id: number,
    payload: LocationPayload,
  ): Promise<Delivery> {
    const response = await axiosInstance.put<Delivery>(
      `/delivery/${id}/location`,
      payload,
    );
    return response.data;
  },

  /** Deliveries for one DELIVERY_BOY (business roles; boys get their own). */
  async getDeliveriesByDeliveryBoy(deliveryBoyId: number): Promise<Delivery[]> {
    const response = await axiosInstance.get<Delivery[]>(
      `/delivery/delivery-boy/${deliveryBoyId}`,
    );
    return response.data;
  },

  async getDeliveriesByStatus(status: DeliveryStatus): Promise<Delivery[]> {
    const response = await axiosInstance.get<Delivery[]>(
      `/delivery/status/${status}`,
    );
    return response.data;
  },
};
