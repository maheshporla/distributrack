import { NavLink } from "react-router-dom";
import { Package2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/constants/app.constants";
import { ROUTES } from "@/constants/routes.constants";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Route,
  FileText,
  CreditCard,
  Bell,
  Settings,
} from "lucide-react";

const SHOPKEEPER_NAV_ITEMS = [
  { label: "Dashboard", path: ROUTES.SHOPKEEPER_DASHBOARD, icon: LayoutDashboard },
  { label: "Products", path: ROUTES.SHOPKEEPER_PRODUCTS, icon: Package },
  { label: "My Orders", path: ROUTES.SHOPKEEPER_ORDERS, icon: ShoppingCart },
  { label: "My Deliveries", path: ROUTES.SHOPKEEPER_DELIVERIES, icon: Route },
  { label: "My Invoices", path: ROUTES.SHOPKEEPER_INVOICES, icon: FileText },
  { label: "My Payments", path: ROUTES.SHOPKEEPER_PAYMENTS, icon: CreditCard },
  { label: "Notifications", path: ROUTES.SHOPKEEPER_NOTIFICATIONS, icon: Bell },
  { label: "Settings", path: ROUTES.SHOPKEEPER_SETTINGS, icon: Settings },
];

interface ShopkeeperSidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

/**
 * Shopkeeper-specific sidebar. Shows only shopkeeper-relevant navigation.
 * No admin/staff items — this is a customer portal, not an admin panel.
 */
export function ShopkeeperSidebar({ collapsed = false, onNavigate }: ShopkeeperSidebarProps) {
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

      {/* Shopkeeper badge */}
      {!collapsed && (
        <div className="mx-2.5 mb-3 rounded-md bg-green-500/10 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-400">
          Customer Portal
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3 scrollbar-thin">
        {SHOPKEEPER_NAV_ITEMS.map((item) => (
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

      {/* Shopkeeper info */}
      {!collapsed && user && (
        <div className="border-t border-sidebar-border px-2.5 py-3">
          <p className="truncate text-xs font-medium text-sidebar-foreground">
            {user.fullName}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            Shopkeeper
          </p>
        </div>
      )}
    </div>
  );
}
