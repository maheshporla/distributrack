import { useCallback, useEffect, useState } from "react";
import { Download, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DateRangeFilter } from "@/features/reports/components/DateRangeFilter";
import { reportService } from "@/services/api/reportService";
import { exportToCsv } from "@/lib/csv";
import { dateRangeForPreset, type DateRangePreset } from "@/lib/dateRange";
import { formatDateTime, formatINR } from "@/lib/formatters";
import { ORDER_STATUS_META } from "@/features/orders/orderStatus";
import type { OrdersReportResponse } from "@/types/report.types";

export function OrdersReport() {
  const [data, setData] = useState<OrdersReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [preset, setPreset] = useState<DateRangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const range = dateRangeForPreset(preset, customFrom, customTo);
      const result = await reportService.getOrdersReport(
        range.from && range.to ? { from: range.from, to: range.to } : undefined,
      );
      setData(result);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load the orders report");
    } finally {
      setIsLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    if (!data) return;

    exportToCsv(
      "orders-report.csv",
      ["Order", "Date", "Shopkeeper", "Total", "Status"],
      data.rows.map((row) => [
        row.orderNumber,
        row.orderDate,
        row.shopkeeperName,
        row.totalAmount,
        row.status,
      ]),
    );
    toast.success("Orders report exported");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <DateRangeFilter
          preset={preset}
          onPresetChange={setPreset}
          customFrom={customFrom}
          customTo={customTo}
          onCustomFromChange={setCustomFrom}
          onCustomToChange={setCustomTo}
        />

        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data || data.rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Orders" value={data?.totalOrders?.toLocaleString() ?? "0"} icon={ShoppingCart} isLoading={isLoading} />
        <StatCard label="Pending" value={data?.pendingOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Approved" value={data?.approvedOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Delivered" value={data?.deliveredOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Out for Delivery" value={data?.outForDeliveryOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Completed" value={data?.completedOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Rejected" value={data?.rejectedOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Cancelled" value={data?.cancelledOrders?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Revenue" value={data ? formatINR(data.totalRevenue) : "₹0.00"} isLoading={isLoading} />
      </div>

      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState title="Couldn't load the orders report" description={loadError} onRetry={load} />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading orders report...</p>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No orders in this range"
            description="Try widening the date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Shopkeeper</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const meta = ORDER_STATUS_META[row.status as keyof typeof ORDER_STATUS_META];
                  return (
                    <tr key={row.orderId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.orderNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.orderDate)}</td>
                      <td className="px-4 py-3">{row.shopkeeperName}</td>
                      <td className="px-4 py-3 font-medium">{formatINR(row.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={meta?.badgeVariant ?? "default"}>{meta?.label ?? row.status}</Badge>
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
