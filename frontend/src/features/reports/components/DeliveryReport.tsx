import { useCallback, useEffect, useState } from "react";
import { Download, Route } from "lucide-react";
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
import { formatDateTime } from "@/lib/formatters";
import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import type { DeliveryReportResponse } from "@/types/report.types";

export function DeliveryReport() {
  const [data, setData] = useState<DeliveryReportResponse | null>(null);
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
      const result = await reportService.getDeliveryReport(
        range.from && range.to ? { from: range.from, to: range.to } : undefined,
      );
      setData(result);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load the delivery report");
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
      "delivery-report.csv",
      ["Order", "Delivery Boy", "Status", "Address", "Assigned", "Delivered"],
      data.rows.map((row) => [
        row.orderNumber,
        row.deliveryBoyName,
        row.deliveryStatus,
        row.deliveryAddress,
        row.assignedAt,
        row.deliveredAt ?? "",
      ]),
    );
    toast.success("Delivery report exported");
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
        <StatCard label="Total Deliveries" value={data?.totalDeliveries?.toLocaleString() ?? "0"} icon={Route} isLoading={isLoading} />
        <StatCard label="Assigned" value={data?.assignedCount?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Out for Delivery" value={data?.outForDeliveryCount?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Delivered" value={data?.deliveredCount?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Failed" value={data?.failedCount?.toLocaleString() ?? "0"} isLoading={isLoading} />
        <StatCard label="Cancelled" value={data?.cancelledCount?.toLocaleString() ?? "0"} isLoading={isLoading} />
      </div>

      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState title="Couldn't load the delivery report" description={loadError} onRetry={load} />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading delivery report...</p>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={Route}
            title="No deliveries in this range"
            description="Try widening the date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Delivery Boy</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const meta = DELIVERY_STATUS_META[row.deliveryStatus as keyof typeof DELIVERY_STATUS_META];
                  return (
                    <tr key={row.deliveryId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.orderNumber}</td>
                      <td className="px-4 py-3">{row.deliveryBoyName}</td>
                      <td className="px-4 py-3">
                        <Badge variant={meta?.badgeVariant ?? "default"}>{meta?.label ?? row.deliveryStatus}</Badge>
                      </td>
                      <td className="max-w-64 truncate px-4 py-3 text-muted-foreground">{row.deliveryAddress}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.assignedAt)}</td>
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
