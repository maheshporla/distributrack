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
            <span className="block text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">Customer Portal</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mx-3 mt-3 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2 text-xs font-semibold text-green-700 dark:text-green-400">
          Customer Portal
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {SHOPKEEPER_NAV_ITEMS.map((item) => (
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
          <p className="truncate text-[10px] text-sidebar-foreground/45 mt-0.5">Shopkeeper</p>
        </div>
      )}
    </div>
  );
}
