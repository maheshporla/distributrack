import { create } from "zustand";

import { notificationService } from "@/services/api/notificationService";
import type { AppNotification } from "@/types/notification.types";

/**
 * Shared notification state for the navbar bell and the Notifications
 * page. A single lightweight poller (30s + on window focus) keeps the
 * unread badge fresh without WebSockets/SSE — the simplest maintainable
 * V1 for in-app notifications. Started/stopped by the Navbar, which is
 * always mounted inside the authenticated layout.
 */

const POLL_INTERVAL_MS = 30_000;

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: true,

  refresh: async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.getMyNotifications(),
        notificationService.getUnreadCount(),
      ]);
      set({ notifications: list, unreadCount: count, isLoading: false });
    } catch (error) {
      // 401 already handled by the axios interceptor; otherwise keep the
      // last good state and let the next poll retry.
      console.error("Failed to refresh notifications", error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id) => {
    await notificationService.markAsRead(id);
    await get().refresh();
  },

  markAllAsRead: async () => {
    await notificationService.markAllAsRead();
    await get().refresh();
  },
}));

// ---------------------------------------------------------------------------
// Polling lifecycle (started/stopped by the Navbar)
// ---------------------------------------------------------------------------

let pollTimer: number | null = null;

const onFocus = () => {
  useNotificationStore.getState().refresh();
};

export function startNotificationPolling(): void {
  useNotificationStore.getState().refresh();

  if (pollTimer !== null) return;

  pollTimer = window.setInterval(onFocus, POLL_INTERVAL_MS);
  window.addEventListener("focus", onFocus);
}

export function stopNotificationPolling(): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  window.removeEventListener("focus", onFocus);
}
