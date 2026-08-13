import { useState } from "react";
import { Boxes, ClipboardList, ShoppingCart, Truck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/types/ui.types";

/**
 * TEMPORARY — scaffolding-only preview.
 *
 * This is not the real Dashboard feature. It exists purely so the shared
 * component library (PageHeader, StatCard, DataTable) and the overall
 * layout shell can be verified visually at the end of Phase 1.
 * Replace this file entirely when the real Dashboard feature is built.
 */

interface DemoRow {
  id: number;
  reference: string;
  customer: string;
  status: "Pending" | "Delivered" | "Cancelled";
  amount: number;
}

const demoRows: DemoRow[] = [
  {
    id: 1,
    reference: "ORD-1042",
    customer: "Nova Retail Co.",
    status: "Delivered",
    amount: 1284.5,
  },
  {
    id: 2,
    reference: "ORD-1043",
    customer: "Bluepeak Traders",
    status: "Pending",
    amount: 642.0,
  },
  {
    id: 3,
    reference: "ORD-1044",
    customer: "Harbor & Co.",
    status: "Delivered",
    amount: 3120.75,
  },
  {
    id: 4,
    reference: "ORD-1045",
    customer: "Fennwick Distribution",
    status: "Cancelled",
    amount: 210.0,
  },
];

const statusVariant: Record<DemoRow["status"], "success" | "warning" | "destructive"> = {
  Delivered: "success",
  Pending: "warning",
  Cancelled: "destructive",
};

const columns: DataTableColumn<DemoRow>[] = [
  { id: "reference", header: "Order", accessor: "reference" },
  { id: "customer", header: "Customer", accessor: "customer", hideOnMobile: true },
  {
    id: "status",
    header: "Status",
    accessor: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
  },
  {
    id: "amount",
    header: "Amount",
    align: "right",
    accessor: (row) => `$${row.amount.toFixed(2)}`,
  },
];

export function ScaffoldPreviewPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <PageHeader
        title="Scaffolding Preview"
        description="Verifying layout, colors, and shared components — the real Dashboard ships in a later phase."
        actions={
          <Button variant="outline" size="sm" onClick={() => setIsLoading((v) => !v)}>
            Toggle loading state
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Orders"
          value="128"
          icon={ShoppingCart}
          change="+8.2%"
          trend="up"
          isLoading={isLoading}
        />
        <StatCard
          label="Stock on Hand"
          value="24,510"
          icon={Boxes}
          change="-2.1%"
          trend="down"
          isLoading={isLoading}
        />
        <StatCard
          label="Deliveries in Transit"
          value="37"
          icon={Truck}
          change="+3"
          trend="neutral"
          isLoading={isLoading}
        />
        <StatCard
          label="Open Reports"
          value="6"
          icon={ClipboardList}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Orders</h2>
        <DataTable
          columns={columns}
          data={demoRows}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No orders yet"
          emptyDescription="Orders will appear here once customers start placing them."
        />
      </div>
    </div>
  );
}
