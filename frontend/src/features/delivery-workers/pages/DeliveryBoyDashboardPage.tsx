import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Package,
  Route,
  Truck,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

import { deliveryService } from "@/services/api/deliveryService";
import { ROUTES as DELIVERY_ROUTES } from "@/constants/routes.constants";
import { useAuthStore } from "@/store/authStore";
import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import { ROUTES } from "@/constants/routes.constants";
import type { Delivery } from "@/types/delivery.types";
import { cn } from "@/lib/utils";
import { formatDateTime, formatINR } from "@/lib/formatters";

/**
 * Dedicated dashboard for DELIVERY_BOY users landing at /delivery/dashboard.
 * Shows today's workload, delivery statistics, and recent deliveries.
 * All data is scoped to the authenticated worker by the backend — no
 * user ID is passed in the request.
 */
export function DeliveryBoyDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const [myDeliveries, available] = await Promise.all([
          deliveryService.getAllDeliveries(),
          deliveryService.getAvailableDeliveries(),
        ]);
        setDeliveries(myDeliveries);
        setAvailableCount(available.length);
      } catch (error) {
        console.error(error);
        setLoadError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Derived stats ---
  const stats = useMemo(() => {
    const total = deliveries.length;
    const pending = deliveries.filter((d) => d.deliveryStatus === "ASSIGNED").length;
    const inProgress = deliveries.filter(
      (d) => d.deliveryStatus === "OUT_FOR_DELIVERY",
    ).length;
    const completed = deliveries.filter(
      (d) => d.deliveryStatus === "DELIVERED",
    ).length;
    const failed = deliveries.filter(
      (d) => d.deliveryStatus === "FAILED",
    ).length;

    return { total, pending, inProgress, completed, failed };
  }, [deliveries]);

  // --- Today's deliveries ---
  const todaysDeliveries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deliveries.filter((d) => {
      if (!d.assignedAt) return false;
      return new Date(d.assignedAt) >= today;
    });
  }, [deliveries]);

  // --- GPS freshness helper ---
  const STALE_MS = 5 * 60 * 1_000;
  function gpsDot(delivery: Delivery) {
    const hasCoords = delivery.latitude !== null && delivery.longitude !== null;
    const isStale = !delivery.lastLocationAt ||
      Date.now() - new Date(delivery.lastLocationAt).getTime() > STALE_MS;
    if (!hasCoords) return null;
    return (
      <span
        className={cn(
          "inline-block size-1.5 rounded-full",
          isStale ? "bg-amber-500" : "bg-green-500",
        )}
        title={isStale ? "GPS: Stale" : "GPS: Live"}
      />
    );
  }

  // --- Recent deliveries (last 5) ---
  const recentDeliveries = useMemo(() => {
    return [...deliveries]
      .filter((d) => d.assignedAt)
      .sort(
        (a, b) =>
          new Date(b.assignedAt!).getTime() - new Date(a.assignedAt!).getTime(),
      )
      .slice(0, 5);
  }, [deliveries]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user?.fullName ?? "Driver"}`}
          description="Your delivery dashboard."
        />
        <LoadingSpinner fullHeight label="Loading dashboard..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome, ${user?.fullName ?? "Driver"}`}
          description="Your delivery dashboard."
        />
        <ErrorState
          title="Failed to load dashboard"
          description={loadError}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.fullName ?? "Driver"}`}
        description="Your delivery dashboard overview."
        actions={
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link to={DELIVERY_ROUTES.DELIVERY_WORKER_AVAILABLE}>
                <Package className="mr-2 h-4 w-4" />
                Available ({availableCount})
              </Link>
            </Button>
            <Button asChild>
              <Link to={DELIVERY_ROUTES.DELIVERY_WORKER_DELIVERIES}>
                <Route className="mr-2 h-4 w-4" />
                My Deliveries
              </Link>
            </Button>
          </div>
        }
      />

      {/* --- Online Status --- */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block size-2.5 rounded-full",
              isOnline ? "bg-green-500" : "bg-muted-foreground/40",
            )}
          />
          <span className="text-sm font-medium">
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
        <Button
          variant={isOnline ? "outline" : "default"}
          size="sm"
          onClick={() => setIsOnline(!isOnline)}
        >
          {isOnline ? "Go Offline" : "Go Online"}
        </Button>
        <p className="text-xs text-muted-foreground">
          {isOnline
            ? "You can see and accept available deliveries."
            : "Go online to see available deliveries."
          }
        </p>
      </div>

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Today's Assigned"
          value={todaysDeliveries.length.toLocaleString()}
          icon={Package}
          isLoading={isLoading}
        />
        <StatCard
          label="Pending"
          value={stats.pending.toLocaleString()}
          icon={Clock}
          isLoading={isLoading}
        />
        <StatCard
          label="In Progress"
          value={stats.inProgress.toLocaleString()}
          icon={Truck}
          isLoading={isLoading}
        />
        <StatCard
          label="Completed"
          value={stats.completed.toLocaleString()}
          icon={CheckCircle2}
          isLoading={isLoading}
        />
        <StatCard
          label="Failed"
          value={stats.failed.toLocaleString()}
          icon={XCircle}
          isLoading={isLoading}
        />
      </div>

      {/* --- Recent Deliveries --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Recent Deliveries
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to={ROUTES.DELIVERY_WORKER_DELIVERIES}>
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentDeliveries.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No deliveries yet"
              description="When deliveries are assigned to you, they will appear here."
            />
          ) : (
            <div className="space-y-3">
              {recentDeliveries.map((delivery) => {
                const statusMeta =
                  DELIVERY_STATUS_META[delivery.deliveryStatus];

                return (
                  <div
                    key={delivery.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {delivery.orderNumber}
                        </span>
                        <Badge variant={statusMeta.badgeVariant}>
                          {statusMeta.label}
                        </Badge>
                        {gpsDot(delivery)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {delivery.shopkeeperName}
                        {delivery.shopkeeperPhone && (
                          <span className="ml-1">
                            · {delivery.shopkeeperPhone}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {delivery.deliveryAddress}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatINR(delivery.orderTotalAmount)}</span>
                      {delivery.assignedAt && <span>{formatDateTime(delivery.assignedAt)}</span>}
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          to={ROUTES.DELIVERY_WORKER_DELIVERIES}
                          state={{ viewDeliveryId: delivery.id }}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Today's Assigned Deliveries --- */}
      {todaysDeliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Today's Assigned Deliveries ({todaysDeliveries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaysDeliveries.map((delivery) => {
                const statusMeta =
                  DELIVERY_STATUS_META[delivery.deliveryStatus];

                return (
                  <div
                    key={delivery.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {delivery.orderNumber}
                        </span>
                        <Badge variant={statusMeta.badgeVariant}>
                          {statusMeta.label}
                        </Badge>
                        {gpsDot(delivery)}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {delivery.shopkeeperName} — {delivery.deliveryAddress}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to={ROUTES.DELIVERY_WORKER_DELIVERIES}
                        state={{ viewDeliveryId: delivery.id }}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Details
                      </Link>
                    </Button>
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
