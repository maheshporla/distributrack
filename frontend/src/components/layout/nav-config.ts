import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  Users,
  ShoppingCart,
  Truck,
  Route,
  FileText,
  CreditCard,
  BarChart3,
  ClipboardList,
  Bell,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/constants/routes.constants";
import type { NavItem } from "@/types/ui.types";

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", path: ROUTES.DASHBOARD, icon: LayoutDashboard }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", path: ROUTES.PRODUCTS, icon: Package },
      { label: "Inventory", path: ROUTES.INVENTORY, icon: Boxes },
      { label: "Warehouses", path: ROUTES.WAREHOUSES, icon: Warehouse },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Customers", path: ROUTES.CUSTOMERS, icon: Users },
      { label: "Orders", path: ROUTES.ORDERS, icon: ShoppingCart },
    ],
  },
  {
    title: "Delivery",
    items: [
      { label: "Delivery Workers", path: ROUTES.DELIVERY_WORKERS, icon: Truck },
      { label: "Deliveries", path: ROUTES.DELIVERIES, icon: Route },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Invoices", path: ROUTES.INVOICES, icon: FileText },
      { label: "Payments", path: ROUTES.PAYMENTS, icon: CreditCard },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", path: ROUTES.ANALYTICS, icon: BarChart3 },
      { label: "Reports", path: ROUTES.REPORTS, icon: ClipboardList },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Notifications", path: ROUTES.NOTIFICATIONS, icon: Bell },
      { label: "Settings", path: ROUTES.SETTINGS, icon: Settings },
    ],
  },
];
