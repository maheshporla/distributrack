import { NavLink } from "react-router-dom";
import { Package2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";
import { LayoutDashboard, Package, Route, MapPin, Bell, Settings, User, IndianRupee } from "lucide-react";

const DELIVERY_NAV_ITEMS = [
  { label: "Dashboard", path: ROUTES.DELIVERY_WORKER_DASHBOARD, icon: LayoutDashboard },
  { label: "My Route", path: ROUTES.DELIVERY_WORKER_BATCH, icon: MapPin },
  { label: "Available Deliveries", path: ROUTES.DELIVERY_WORKER_AVAILABLE, icon: Package },
  { label: "My Deliveries", path: ROUTES.DELIVERY_WORKER_DELIVERIES, icon: Route },
  { label: "My Earnings", path: ROUTES.DELIVERY_WORKER_EARNINGS, icon: IndianRupee },
  { label: "Notifications", path: ROUTES.DELIVERY_WORKER_NOTIFICATIONS, icon: Bell },
  { label: "Profile", path: ROUTES.DELIVERY_PROFILE, icon: User },
  { label: "Settings", path: ROUTES.DELIVERY_WORKER_SETTINGS, icon: Settings },
];

interface DeliveryWorkerSidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Delivery-worker-specific sidebar. Shows only delivery-relevant navigation.
 * No admin/staff items — this is a dedicated delivery portal.
 */
export function DeliveryWorkerSidebar({
  collapsed = false,
  onNavigate,
}: DeliveryWorkerSidebarProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div
        className={cn(
          "flex h-16 items-center gap-2 px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Package2 className="size-4.5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="truncate text-sm font-semibold text-sidebar-foreground">
            {APP_NAME}
          </span>
        )}
      </div>

      {/* Delivery worker badge */}
      {!collapsed && (
        <div className="mx-2.5 mb-3 rounded-md bg-blue-500/10 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
          Delivery Portal
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {DELIVERY_NAV_ITEMS.map((item) => (
          <li key={item.path} className="list-none">
            <NavLink
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </nav>

      {/* Worker info */}
      {!collapsed && user && (
        <div className="border-t border-sidebar-border px-2.5 py-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            Delivery Worker
          </p>
        </div>
      )}
    </div>
  );
}
