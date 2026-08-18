import { axiosInstance } from "@/services/api/axiosInstance";
import type { UserProfile } from "@/types/auth.types";
import type { CreateUserPayload, UpdateUserPayload } from "@/types/user.types";

/**
 * User / staff API client. Used by the order form (SHOPKEEPER picker),
 * the Customers module and the Delivery Workers module.
 *
 * Backend reference: UserController at /api/users.
 *   - GET    supports optional `role` and `search` query params; read
 *     access is SUPER_ADMIN / OWNER / MANAGER / SALESMAN (SALESMAN is
 *     always scoped to SHOPKEEPER accounts server-side)
 *   - POST/PUT/DELETE are SUPER_ADMIN / OWNER / MANAGER only; the role
 *     matrix (who may create/manage which role) is enforced server-side
 */
export const userService = {
  async getUsers(params?: { role?: string; search?: string }): Promise<UserProfile[]> {
    const response = await axiosInstance.get<UserProfile[]>("/users", { params });
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<UserProfile> {
    const response = await axiosInstance.post<UserProfile>("/users", payload);
    return response.data;
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<UserProfile> {
    const response = await axiosInstance.put<UserProfile>(`/users/${id}`, payload);
    return response.data;
  },

  /** Soft-disable: the backend keeps referential integrity for orders/deliveries. */
  async deleteUser(id: number): Promise<void> {
    await axiosInstance.delete(`/users/${id}`);
  },
};
