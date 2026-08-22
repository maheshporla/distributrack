import { axiosInstance } from "@/services/api/axiosInstance";
import type {
  DeliveryBatchResponse,
  EligibleOrdersResponse,
  CreateDeliveryBatchPayload,
} from "@/types/deliveryBatch.types";

/**
 * Delivery Batch API client — area/route assignment feature.
 *
 * Backend reference: DeliveryBatchController at /api/delivery-batches.
 */
export const deliveryBatchService = {
  /** Preview eligible orders/shops within the specified area radius. */
  async previewEligibleOrders(
    areaName: string,
    centerLatitude: number,
    centerLongitude: number,
    radiusKm: number,
  ): Promise<EligibleOrdersResponse> {
    const params = new URLSearchParams({
      areaName,
      centerLatitude: centerLatitude.toString(),
      centerLongitude: centerLongitude.toString(),
      radiusKm: radiusKm.toString(),
    });
    const response = await axiosInstance.get<EligibleOrdersResponse>(
      `/delivery-batches/preview?${params.toString()}`,
    );
    return response.data;
  },

  /** Create a delivery batch assigning all eligible orders to a delivery boy. */
  async createDeliveryBatch(
    payload: CreateDeliveryBatchPayload,
  ): Promise<DeliveryBatchResponse> {
    const response = await axiosInstance.post<DeliveryBatchResponse>(
      "/delivery-batches",
      payload,
    );
    return response.data;
  },

  /** List all delivery batches (admin view). */
  async getAllBatches(): Promise<DeliveryBatchResponse[]> {
    const response = await axiosInstance.get<DeliveryBatchResponse[]>(
      "/delivery-batches",
    );
    return response.data;
  },

  /** Get batch details with shop-wise and delivery-wise breakdowns. */
  async getBatchById(id: number): Promise<DeliveryBatchResponse> {
    const response = await axiosInstance.get<DeliveryBatchResponse>(
      `/delivery-batches/${id}`,
    );
    return response.data;
  },

  /** Delivery boy: get my current active batch. */
  async getMyActiveBatch(): Promise<DeliveryBatchResponse | null> {
    const response = await axiosInstance.get<DeliveryBatchResponse | null>(
      "/delivery-batches/my/active",
    );
    return response.data;
  },

  /** Delivery boy: get all my batches. */
  async getMyBatches(): Promise<DeliveryBatchResponse[]> {
    const response = await axiosInstance.get<DeliveryBatchResponse[]>(
      "/delivery-batches/my",
    );
    return response.data;
  },

  /** Delivery boy: start delivery on a batch (marks as IN_PROGRESS). */
  async startBatch(id: number): Promise<DeliveryBatchResponse> {
    const response = await axiosInstance.post<DeliveryBatchResponse>(
      `/delivery-batches/${id}/start`,
    );
    return response.data;
  },

  /** Complete a batch (called when all deliveries in the batch are done). */
  async completeBatch(id: number): Promise<DeliveryBatchResponse> {
    const response = await axiosInstance.post<DeliveryBatchResponse>(
      `/delivery-batches/${id}/complete`,
    );
    return response.data;
  },
};
