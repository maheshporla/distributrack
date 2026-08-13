import type { ReactNode } from "react";

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
}

export type StatTrend = "up" | "down" | "neutral";
