import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDateTime, formatRelativeTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { useNotificationStore } from "@/store/notificationStore";
import {
  notificationRoute,
  type NotificationType,
} from "@/types/notification.types";

const TYPE_LABELS: Record<NotificationType, string> = {
  ORDER_CREATED: "Order",
  ORDER_APPROVED: "Order",
  ORDER_REJECTED: "Order",
  ORDER_CANCELLED: "Order",
  DELIVERY_ASSIGNED: "Delivery",
  DELIVERY_OUT_FOR_DELIVERY: "Delivery",
  DELIVERY_DELIVERED: "Delivery",
  DELIVERY_FAILED: "Delivery",
  DELIVERY_CANCELLED: "Delivery",
  PAYMENT_SUCCESS: "Payment",
  PAYMENT_FAILED: "Payment",
  PAYMENT_REFUNDED: "Payment",
  INVOICE_AVAILABLE: "Invoice",
  LOW_STOCK: "Inventory",
};

export function NotificationsPage() {
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const isLoading = useNotificationStore((state) => state.isLoading);
  const refresh = useNotificationStore((state) => state.refresh);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error(error);
      toast.error("Failed to mark notifications as read");
    }
  };

  const handleOpen = async (id: number, read: boolean) => {
    if (!read) {
      try {
        await markAsRead(id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your orders, deliveries and payments."
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={() => void handleMarkAllRead()}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All as Read
            </Button>
          ) : undefined
        }
      />

      <div className="rounded-lg border bg-card">
        {isLoading && notifications.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>

        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="Notifications about your orders, deliveries and payments will appear here."
            action={
              <Button variant="outline" onClick={() => void refresh()}>
                Refresh
              </Button>
            }
          />

        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <Link
                  to={notificationRoute(notification.type)}
                  onClick={() => void handleOpen(notification.id, notification.read)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      notification.read ? "bg-muted-foreground/30" : "bg-primary",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {notification.title}
                      </span>
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {TYPE_LABELS[notification.type]}
                      </span>
                      {!notification.read && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          New
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground/70">
                      {formatDateTime(notification.createdAt)} ·{" "}
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
