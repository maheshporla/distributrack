import {
  LayoutDashboard,
  Package,
  Boxes,
  Warehouse,
  Users,
  ShoppingCart,
  Truck,
  Route,
  MapPin,
  FileText,
  CreditCard,
  BarChart3,
  ClipboardList,
  Bell,
  Settings,
  UserCheck,
  IndianRupee,
} from "lucide-react";
import { ROUTES } from "@/constants/routes.constants";
import type { NavItem } from "@/types/ui.types";

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      {
        label: "Dashboard",
        path: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
        // Business-wide KPIs — SA / OWNER / MANAGER only (matches
        // SecurityConfig for /api/dashboard/**).
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
    ],
  },
  {
    title: "Catalog",
    items: [
      {
        label: "Products",
        path: ROUTES.PRODUCTS,
        icon: Package,
        // Product catalog is readable by every business role incl.
        // SALESMAN + SHOPKEEPER — matches the backend GET rule.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"],
      },
      {
        label: "Inventory",
        path: ROUTES.INVENTORY,
        icon: Boxes,
        // Inventory is business-only (no SHOPKEEPER/DELIVERY_BOY) —
        // matches the backend GET rule.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN"],
      },
      {
        label: "Warehouses",
        path: ROUTES.WAREHOUSES,
        icon: Warehouse,
        // Warehouse management is SUPER_ADMIN / OWNER / MANAGER only —
        // matches the backend SecurityConfig for /api/warehouses/**.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
    ],
  },
  {
    title: "Sales",
    items: [
      {
        label: "Customers",
        path: ROUTES.CUSTOMERS,
        icon: Users,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN"],
      },
      {
        label: "Orders",
        path: ROUTES.ORDERS,
        icon: ShoppingCart,
        // SHOPKEEPER sees own orders; DELIVERY_BOY has no order access —
        // matches the backend SecurityConfig for /api/orders/**.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"],
      },
    ],
  },
  {
    title: "Delivery",
    items: [
      {
        label: "Delivery Workers",
        path: ROUTES.DELIVERY_WORKERS,
        icon: Truck,
        // Staff management is SA / OWNER / MANAGER only — matches the
        // /api/users write rules in SecurityConfig.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
      {
        label: "Delivery Areas",
        path: ROUTES.DELIVERY_AREAS,
        icon: MapPin,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
      {
        label: "Deliveries",
        path: ROUTES.DELIVERIES,
        icon: Route,
        // DELIVERY_BOY has their own portal (/delivery/*); SHOPKEEPER sees
        // own orders' deliveries (enforced server-side); SALESMAN has no
        // delivery access — matches SecurityConfig for /api/delivery/**.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SHOPKEEPER"],
      },
      {
        label: "Delivery Earnings",
        path: ROUTES.DELIVERY_EARNINGS,
        icon: IndianRupee,
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        label: "Invoices",
        path: ROUTES.INVOICES,
        icon: FileText,
        // SHOPKEEPER sees own invoices; DELIVERY_BOY has no financial
        // access — matches SecurityConfig for /api/invoices/**.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"],
      },
      {
        label: "Payments",
        path: ROUTES.PAYMENTS,
        icon: CreditCard,
        // SHOPKEEPER sees own payments; DELIVERY_BOY has no financial
        // access — matches SecurityConfig for /api/payments/**.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER", "SALESMAN", "SHOPKEEPER"],
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        label: "Analytics",
        path: ROUTES.ANALYTICS,
        icon: BarChart3,
        // Business-wide analytics — SA / OWNER / MANAGER only (matches
        // SecurityConfig for /api/analytics/**).
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
      {
        label: "Reports",
        path: ROUTES.REPORTS,
        icon: ClipboardList,
        // Business-wide reports — SA / OWNER / MANAGER only (matches
        // SecurityConfig for /api/reports/**).
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Notifications", path: ROUTES.NOTIFICATIONS, icon: Bell },
      { label: "Settings", path: ROUTES.SETTINGS, icon: Settings },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "User Management",
        path: ROUTES.USERS,
        icon: Users,
        // Staff/account administration is SUPER_ADMIN / OWNER / MANAGER
        // only — matches the /api/users rules in SecurityConfig; the
        // role matrix (who may create which role) is enforced server-side.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
      {
        label: "Delivery Applications",
        path: ROUTES.DELIVERY_APPLICATIONS,
        icon: UserCheck,
        // Admin-only review of pending delivery partner registrations.
        roles: ["SUPER_ADMIN", "OWNER", "MANAGER"],
      },
    ],
  },
];
