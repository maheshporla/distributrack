import { useCallback, useEffect, useState } from "react";
import { CreditCard, Download } from "lucide-react";
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
import { PAYMENT_STATUS_META } from "@/features/payments/paymentStatus";
import type { PaymentReportResponse } from "@/types/report.types";

export function PaymentReport() {
  const [data, setData] = useState<PaymentReportResponse | null>(null);
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
      const result = await reportService.getPaymentReport(
        range.from && range.to ? { from: range.from, to: range.to } : undefined,
      );
      setData(result);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load the payment report");
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
      "payment-report.csv",
      ["Order", "Shopkeeper", "Amount", "Method", "Status", "Date"],
      data.rows.map((row) => [
        row.orderNumber,
        row.shopkeeperName,
        row.amount,
        row.paymentMethod,
        row.paymentStatus,
        row.paymentDate,
      ]),
    );
    toast.success("Payment report exported");
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Paid" value={data ? formatINR(data.totalPaid) : "₹0.00"} icon={CreditCard} isLoading={isLoading} />
        <StatCard label="Outstanding" value={data ? formatINR(data.outstandingAmount) : "₹0.00"} isLoading={isLoading} />
        <StatCard label="Failed" value={data ? formatINR(data.failedAmount) : "₹0.00"} isLoading={isLoading} />
        <StatCard label="Refunded" value={data ? formatINR(data.refundedAmount) : "₹0.00"} isLoading={isLoading} />
      </div>

      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState title="Couldn't load the payment report" description={loadError} onRetry={load} />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading payment report...</p>
          </div>
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payments in this range"
            description="Try widening the date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Shopkeeper</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const meta = PAYMENT_STATUS_META[row.paymentStatus as keyof typeof PAYMENT_STATUS_META];
                  return (
                    <tr key={row.paymentId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{row.orderNumber}</td>
                      <td className="px-4 py-3">{row.shopkeeperName}</td>
                      <td className="px-4 py-3 font-medium">{formatINR(row.amount)}</td>
                      <td className="px-4 py-3">{row.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <Badge variant={meta?.badgeVariant ?? "default"}>{meta?.label ?? row.paymentStatus}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(row.paymentDate)}</td>
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
