import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  Truck,
  MapPin,
  Package,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { deliveryEarningService } from "@/services/api/deliveryEarningService";
import type {
  DeliveryEarningsDashboard,
  DeliveryBoyEarningsSummary,
  DailyEarningGroup,
} from "@/types/deliveryEarning.types";
import { formatINR } from "@/lib/formatters";
import { toast } from "sonner";

/**
 * Admin page: Delivery Earnings overview across all delivery boys.
 */
export function DeliveryEarningsPage() {
  const [dashboard, setDashboard] =
    useState<DeliveryEarningsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drill-down state: selected delivery boy
  const [selectedBoyId, setSelectedBoyId] = useState<number | null>(null);
  const [boyDashboard, setBoyDashboard] =
    useState<DeliveryEarningsDashboard | null>(null);
  const [loadingBoy, setLoadingBoy] = useState(false);

  // Expanded history date groups
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryEarningService.getAdminDashboard();
      setDashboard(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load earnings dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSelectBoy = async (boyId: number) => {
    if (selectedBoyId === boyId) {
      setSelectedBoyId(null);
      setBoyDashboard(null);
      return;
    }
    try {
      setLoadingBoy(true);
      setSelectedBoyId(boyId);
      const data = await deliveryEarningService.getDeliveryBoyDashboard(boyId);
      setBoyDashboard(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load delivery boy earnings");
    } finally {
      setLoadingBoy(false);
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Delivery Earnings"
          description="View delivery boy earnings across the system."
        />
        <LoadingSpinner fullHeight label="Loading earnings..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Delivery Earnings"
          description="View delivery boy earnings across the system."
        />
        <ErrorState
          title="Failed to load earnings"
          description={loadError}
          onRetry={loadDashboard}
        />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Delivery Earnings"
          description="View delivery boy earnings across the system."
        />
        <EmptyState
          icon={IndianRupee}
          title="No earnings data"
          description="Earnings will appear here once deliveries are completed."
        />
      </div>
    );
  }

  // If a specific delivery boy is selected, show their detailed view
  if (selectedBoyId && boyDashboard) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBoyId(null);
              setBoyDashboard(null);
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to All
          </Button>
        </div>
        <PageHeader
          title={`${boyDashboard.deliveryBoyName ?? "Delivery Boy"} — Earnings`}
          description="Detailed earnings breakdown for this delivery boy."
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Today's Earnings"
            value={formatINR(boyDashboard.todayEarnings)}
            icon={IndianRupee}
          />
          <StatCard
            label="Month Earnings"
            value={formatINR(boyDashboard.monthEarnings)}
            icon={Calendar}
          />
          <StatCard
            label="Total Deliveries"
            value={boyDashboard.allTimeDeliveries.toLocaleString()}
            icon={Package}
          />
          <StatCard
            label="Total Distance"
            value={`${Number(boyDashboard.allTimeDistanceKm ?? 0).toFixed(1)} km`}
            icon={MapPin}
          />
        </div>

        {/* Today's earnings */}
        {boyDashboard.todaysEarnings &&
          boyDashboard.todaysEarnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Today's Earnings ({boyDashboard.todaysEarnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Order</th>
                        <th className="pb-2 font-medium">Shop</th>
                        <th className="pb-2 font-medium text-right">
                          Distance
                        </th>
                        <th className="pb-2 font-medium text-right">Bill</th>
                        <th className="pb-2 font-medium text-right">
                          Earning
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {boyDashboard.todaysEarnings.map((e) => (
                        <tr
                          key={e.earningId}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 font-medium">{e.orderNumber}</td>
                          <td className="py-2 text-muted-foreground">
                            {e.shopName || e.shopkeeperName}
                          </td>
                          <td className="py-2 text-right">
                            {Number(e.distanceKm).toFixed(1)} km
                          </td>
                          <td className="py-2 text-right">
                            {formatINR(e.orderAmount)}
                          </td>
                          <td className="py-2 text-right font-semibold text-green-600">
                            {formatINR(e.earningAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        {/* History grouped by date */}
        {boyDashboard.history && boyDashboard.history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Earnings History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {boyDashboard.history.map((group: DailyEarningGroup) => {
                  const dateStr = group.date;
                  const isExpanded = expandedDates.has(dateStr);
                  return (
                    <div key={dateStr} className="rounded-lg border">
                      <button
                        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
                        onClick={() => toggleDate(dateStr)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-medium">{dateStr}</span>
                          <Badge variant="secondary">
                            {group.deliveries} deliveries
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {Number(group.distanceKm).toFixed(1)} km
                          </span>
                          <span className="text-sm font-semibold text-green-600">
                            {formatINR(group.earnings)}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {isExpanded && group.earningsList && (
                        <div className="border-t px-3 pb-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b text-left text-muted-foreground">
                                <th className="pb-2 font-medium">Order</th>
                                <th className="pb-2 font-medium">Shop</th>
                                <th className="pb-2 font-medium text-right">
                                  Distance
                                </th>
                                <th className="pb-2 font-medium text-right">
                                  Bill
                                </th>
                                <th className="pb-2 font-medium text-right">
                                  Earning
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.earningsList.map((e) => (
                                <tr
                                  key={e.earningId}
                                  className="border-b last:border-0"
                                >
                                  <td className="py-2 font-medium">
                                    {e.orderNumber}
                                  </td>
                                  <td className="py-2 text-muted-foreground">
                                    {e.shopName || e.shopkeeperName}
                                  </td>
                                  <td className="py-2 text-right">
                                    {Number(e.distanceKm).toFixed(1)} km
                                  </td>
                                  <td className="py-2 text-right">
                                    {formatINR(e.orderAmount)}
                                  </td>
                                  <td className="py-2 text-right font-semibold text-green-600">
                                    {formatINR(e.earningAmount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Main admin overview: all delivery boys summary
  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Earnings"
        description="View delivery boy earnings across the system."
      />

      {/* Overall stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Earnings"
          value={formatINR(dashboard.todayEarnings)}
          icon={IndianRupee}
        />
        <StatCard
          label="Month Earnings"
          value={formatINR(dashboard.monthEarnings)}
          icon={Calendar}
        />
        <StatCard
          label="Total Deliveries (All Time)"
          value={dashboard.allTimeDeliveries.toLocaleString()}
          icon={Package}
        />
        <StatCard
          label="Total Distance (All Time)"
          value={`${Number(dashboard.allTimeDistanceKm ?? 0).toFixed(1)} km`}
          icon={MapPin}
        />
      </div>

      {/* Delivery boys table */}
      {dashboard.allDeliveryBoys &&
      dashboard.allDeliveryBoys.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Delivery Boy Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Delivery Boy</th>
                    <th className="pb-2 font-medium">Phone</th>
                    <th className="pb-2 font-medium text-right">
                      Today
                    </th>
                    <th className="pb-2 font-medium text-right">
                      This Month
                    </th>
                    <th className="pb-2 font-medium text-right">
                      Total Deliveries
                    </th>
                    <th className="pb-2 font-medium text-right">
                      Total Distance
                    </th>
                    <th className="pb-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.allDeliveryBoys.map(
                    (boy: DeliveryBoyEarningsSummary) => (
                      <tr
                        key={boy.deliveryBoyId}
                        className="border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="py-3 font-medium">
                          {boy.deliveryBoyName}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {boy.deliveryBoyPhone ?? "—"}
                        </td>
                        <td className="py-3 text-right font-semibold text-green-600">
                          {formatINR(boy.todayEarnings)}
                        </td>
                        <td className="py-3 text-right font-semibold text-green-600">
                          {formatINR(boy.monthEarnings)}
                        </td>
                        <td className="py-3 text-right">
                          {boy.totalDeliveries}
                        </td>
                        <td className="py-3 text-right">
                          {Number(boy.totalDistanceKm).toFixed(1)} km
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingBoy}
                            onClick={() =>
                              handleSelectBoy(boy.deliveryBoyId)
                            }
                          >
                            {loadingBoy && selectedBoyId === boy.deliveryBoyId ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={IndianRupee}
          title="No earnings data"
          description="Earnings will appear here once deliveries are completed."
        />
      )}
    </div>
  );
}
