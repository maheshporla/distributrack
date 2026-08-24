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
          "flex h-16 items-center gap-3 px-4 border-b border-sidebar-border",
          collapsed && "justify-center px-2",
        )}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 shadow-lg shadow-sidebar-primary/20">
          <Package2 className="size-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="block truncate text-[15px] font-bold tracking-tight text-sidebar-foreground">{APP_NAME}</span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">Delivery Portal</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mx-3 mt-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
          Delivery Portal
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {DELIVERY_NAV_ITEMS.map((item) => (
          <li key={item.path} className="list-none">
            <NavLink
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "justify-center px-2",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-sidebar-accent/50",
                )
              }
            >
              <item.icon className={cn("size-[18px] shrink-0 transition-colors group-hover:text-sidebar-accent-foreground")} aria-hidden="true" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          </li>
        ))}
      </nav>

      {!collapsed && user && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <p className="truncate text-xs font-semibold text-sidebar-foreground">{user.fullName}</p>
          <p className="truncate text-[10px] text-sidebar-foreground/45 mt-0.5">Delivery Worker</p>
        </div>
      )}
    </div>
  );
}
