import { useCallback, useEffect, useState } from "react";
import {
  IndianRupee,
  Package,
  MapPin,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { deliveryEarningService } from "@/services/api/deliveryEarningService";
import type {
  DeliveryEarningsDashboard,
  DailyEarningGroup,
} from "@/types/deliveryEarning.types";
import { formatINR } from "@/lib/formatters";

/**
 * Delivery Boy portal page — shows own earnings dashboard.
 * Uses getMyDashboard() which is scoped to the current user server-side.
 */
export function DeliveryBoyEarningsPage() {
  const [dashboard, setDashboard] =
    useState<DeliveryEarningsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryEarningService.getMyDashboard();
      setDashboard(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load earnings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
          title="My Earnings"
          description="View your delivery earnings and history."
        />
        <LoadingSpinner fullHeight label="Loading earnings..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Earnings"
          description="View your delivery earnings and history."
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
          title="My Earnings"
          description="View your delivery earnings and history."
        />
        <EmptyState
          icon={IndianRupee}
          title="No earnings data"
          description="Earnings will appear here once you complete deliveries."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Earnings"
        description="Your delivery earnings and history."
      />

      {/* Summary cards */}
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
          label="Total Deliveries"
          value={dashboard.allTimeDeliveries.toLocaleString()}
          icon={Package}
        />
        <StatCard
          label="Total Distance"
          value={`${Number(dashboard.allTimeDistanceKm ?? 0).toFixed(1)} km`}
          icon={MapPin}
        />
      </div>

      {/* Today's earnings */}
      {dashboard.todaysEarnings && dashboard.todaysEarnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Today's Earnings ({dashboard.todaysEarnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Order</th>
                    <th className="pb-2 font-medium">Shop</th>
                    <th className="pb-2 font-medium text-right">Distance</th>
                    <th className="pb-2 font-medium text-right">Bill</th>
                    <th className="pb-2 font-medium text-right">Earning</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.todaysEarnings.map((e) => (
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
      {dashboard.history && dashboard.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Earnings History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.history.map((group: DailyEarningGroup) => {
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

      {/* No data state for history */}
      {(!dashboard.history || dashboard.history.length === 0) &&
        (!dashboard.todaysEarnings || dashboard.todaysEarnings.length === 0) && (
          <EmptyState
            icon={Package}
            title="No earnings yet"
            description="Complete deliveries to start earning."
          />
        )}
    </div>
  );
}
