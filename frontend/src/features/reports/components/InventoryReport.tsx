import { useCallback, useEffect, useState } from "react";
import { Boxes, Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { reportService } from "@/services/api/reportService";
import { exportToCsv } from "@/lib/csv";
import type { InventoryReportResponse } from "@/types/report.types";

const STOCK_BADGE: Record<InventoryReportResponse["rows"][number]["status"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  OK: { label: "In Stock", variant: "success" },
  LOW_STOCK: { label: "Low Stock", variant: "warning" },
  OUT_OF_STOCK: { label: "Out of Stock", variant: "destructive" },
};

export function InventoryReport() {
  const [data, setData] = useState<InventoryReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const result = await reportService.getInventoryReport();
      setData(result);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load the inventory report");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;

    exportToCsv(
      "inventory-report.csv",
      ["Product", "SKU", "Warehouse", "Quantity", "Min Stock", "Status"],
      data.rows.map((row) => [
        row.productName,
        row.sku,
        row.warehouseLocation,
        row.quantity,
        row.minimumStock,
        STOCK_BADGE[row.status].label,
      ]),
    );
    toast.success("Inventory report exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || data.rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Product Records" value={data?.totalProducts?.toLocaleString() ?? "0"} icon={Boxes} isLoading={isLoading} />
        <StatCard label="Total Units" value={data?.totalInventoryQuantity?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Low Stock" value={data?.lowStockProducts?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Out of Stock" value={data?.outOfStockProducts?.toLocaleString() ?? "0"} isLoading={isLoading} />
      </div>

      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState title="Couldn't load the inventory report" description={loadError} onRetry={load} />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading inventory report...</p>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inventory records"
            description="Add inventory against products to see them here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Min Stock</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const badge = STOCK_BADGE[row.status];
                  return (
                    <tr key={row.inventoryId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.productName}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.sku}</td>
                      <td className="px-4 py-3">{row.warehouseLocation}</td>
                      <td className="px-4 py-3 font-medium">{row.quantity}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.minimumStock}</td>
                      <td className="px-4 py-3">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
