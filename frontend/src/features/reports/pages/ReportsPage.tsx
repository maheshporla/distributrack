import { useState } from "react";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/shared/PageHeader";

import { SalesReport } from "@/features/reports/components/SalesReport";
import { OrdersReport } from "@/features/reports/components/OrdersReport";
import { InventoryReport } from "@/features/reports/components/InventoryReport";
import { DeliveryReport } from "@/features/reports/components/DeliveryReport";
import { PaymentReport } from "@/features/reports/components/PaymentReport";

type ReportTab =
  | "sales"
  | "orders"
  | "inventory"
  | "deliveries"
  | "payments";

const TABS: { id: ReportTab; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "orders", label: "Orders" },
  { id: "inventory", label: "Inventory" },
  { id: "deliveries", label: "Deliveries" },
  { id: "payments", label: "Payments" },
];

/**
 * Operational reports hub. Each tab renders one report backed by the
 * real /api/reports endpoints (SA/OWNER/MANAGER only). Only the active
 * tab is mounted, so switching tabs refetches with a fresh default range.
 */
export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational reports with export, built from live data."
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && <SalesReport />}
      {activeTab === "orders" && <OrdersReport />}
      {activeTab === "inventory" && <InventoryReport />}
      {activeTab === "deliveries" && <DeliveryReport />}
      {activeTab === "payments" && <PaymentReport />}
    </div>
  );
}
