import type { ReactNode } from "react";
import type { RoleName } from "@/types/auth.types";

/**
 * Column definition consumed by <DataTable />.
 * `accessor` may be a key of T (rendered as-is) or a render function
 * for computed / formatted cells.
 */
export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  align?: "left" | "center" | "right";
  width?: string;
  hideOnMobile?: boolean;
}

export interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  children?: NavItem[];
  /**
   * Roles allowed to see this nav item. Omit for items visible to every
   * authenticated user. SidebarNav filters on the JWT role claim.
   */
  roles?: RoleName[];
}

export type StatTrend = "up" | "down" | "neutral";
