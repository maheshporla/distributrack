import { axiosInstance } from "@/services/api/axiosInstance";
import type { AppNotification } from "@/types/notification.types";

/**
 * Notification API client. Every endpoint is scoped to the authenticated
 * user server-side — no userId is ever sent.
 *
 * Backend reference: NotificationController at /api/notifications.
 */
export const notificationService = {
  async getMyNotifications(): Promise<AppNotification[]> {
    const response = await axiosInstance.get<AppNotification[]>("/notifications");
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get<number>("/notifications/unread-count");
    return response.data;
  },

  async markAsRead(id: number): Promise<AppNotification> {
    const response = await axiosInstance.put<AppNotification>(
      `/notifications/${id}/read`,
    );
    return response.data;
  },

  async markAllAsRead(): Promise<number> {
    const response = await axiosInstance.put<number>("/notifications/read-all");
    return response.data;
  },
};
