import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, Route, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";

import { deliveryService } from "@/services/api/deliveryService";
import { useAuthStore } from "@/store/authStore";

import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import { DeliveryDetails } from "@/features/deliveries/components/DeliveryDetails";

import {
  DELIVERY_STATUSES,
  type Delivery,
  type DeliveryStatus,
} from "@/types/delivery.types";
import { cn } from "@/lib/utils";
type PageView = "list" | "details";

export function DeliveriesPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? "SHOPKEEPER";

  const canEmergencyReassign =
    role === "SUPER_ADMIN" || role === "OWNER" || role === "MANAGER";

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");

  const [view, setView] = useState<PageView>("list");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [reassigningId, setReassigningId] = useState<number | null>(null);

  // =========================================================
  // Load deliveries
  // =========================================================

  const loadDeliveries = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryService.getAllDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load deliveries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  // =========================================================
  // Search + status filter
  // =========================================================

  const displayedDeliveries = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      if (statusFilter !== "all" && delivery.deliveryStatus !== statusFilter) {
        return false;
      }
      if (!keyword) return true;

      return (
        delivery.orderNumber.toLowerCase().includes(keyword) ||
        delivery.shopkeeperName.toLowerCase().includes(keyword) ||
        (delivery.deliveryBoyName && delivery.deliveryBoyName.toLowerCase().includes(keyword)) ||
        delivery.deliveryStatus.toLowerCase().includes(keyword) ||
        delivery.deliveryAddress.toLowerCase().includes(keyword)
      );
    });
  }, [deliveries, searchKeyword, statusFilter]);

  // =========================================================
  // Status update
  // =========================================================

  const handleStatusChange = async (
    next: DeliveryStatus,
    failureReason?: string,
  ) => {
    if (!selectedDelivery) return;

    try {
      setUpdatingStatusId(selectedDelivery.id);
      const updated = await deliveryService.updateDeliveryStatus(
        selectedDelivery.id,
        next,
        failureReason,
      );
      toast.success(`Delivery marked as ${next.replace(/_/g, " ").toLowerCase()}`);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d)),
      );
      setSelectedDelivery(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update delivery status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeliveryUpdated = (updated: Delivery) => {
    setDeliveries((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
    setSelectedDelivery(updated);
  };

  // =========================================================
  // Emergency reassign
  // =========================================================

  const handleEmergencyReassign = async (delivery: Delivery) => {
    const confirmed = window.confirm(
      `Emergency reassign delivery for ${delivery.orderNumber}? This will make it available for other workers to accept.`,
    );
    if (!confirmed) return;

    try {
      setReassigningId(delivery.id);
      await deliveryService.emergencyReassign(delivery.id);
      toast.success(`Delivery for ${delivery.orderNumber} is now available for re-assignment`);
      await loadDeliveries();
    } catch (error) {
      console.error(error);
      toast.error("Failed to reassign delivery");
    } finally {
      setReassigningId(null);
    }
  };

  // =========================================================
  // GPS freshness indicator
  // =========================================================

  const STALE_MS = 5 * 60 * 1_000;
  function GpsIndicator({ delivery }: { delivery: Delivery }) {
    const hasCoords = delivery.latitude !== null && delivery.longitude !== null;
    const isStale = !delivery.lastLocationAt ||
      Date.now() - new Date(delivery.lastLocationAt).getTime() > STALE_MS;

    if (!hasCoords) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-muted-foreground/30" />
          No GPS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span
          className={cn(
            "size-1.5 rounded-full",
            isStale ? "bg-amber-500" : "bg-green-500",
          )}
        />
        {isStale ? "Stale" : "Live"}
      </span>
    );
  }

  // =========================================================
  // View switching
  // =========================================================

  const handleViewDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setView("details");
  };

  const handleBackToList = () => {
    setView("list");
    setSelectedDelivery(null);
  };

  const handleClearFilters = () => {
    setSearchKeyword("");
    setStatusFilter("all");
  };

  // =========================================================
  // Delivery Details Screen
  // =========================================================

  if (view === "details" && selectedDelivery) {
    return (
      <DeliveryDetails
        delivery={selectedDelivery}
        role={role}
        updatingStatusId={updatingStatusId}
        onBack={handleBackToList}
        onStatusChange={handleStatusChange}
        onDeliveryUpdated={handleDeliveryUpdated}
      />
    );
  }

  // =========================================================
  // Deliveries List
  // =========================================================

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deliveries"
        description={
          role === "DELIVERY_BOY"
            ? "Your assigned deliveries and live tracking."
            : role === "SHOPKEEPER"
              ? "Track the delivery of your orders."
              : "Monitor deliveries and manage emergency reassignment."
        }
      />

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="Search order, customer, delivery boy or status..."
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as DeliveryStatus | "all")
          }
          className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          {DELIVERY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {DELIVERY_STATUS_META[status].label}
            </option>
          ))}
        </select>

        {(searchKeyword || statusFilter !== "all") && (
          <Button variant="ghost" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Deliveries List */}
      <div className="rounded-lg border bg-card">
        {loadError ? (
          <ErrorState
            title="Couldn't load deliveries"
            description={loadError}
            onRetry={loadDeliveries}
          />
        ) : isLoading ? (
          <div className="flex min-h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading deliveries...</p>
          </div>
        ) : displayedDeliveries.length === 0 ? (
          <EmptyState
            icon={Route}
            title={
              deliveries.length === 0
                ? "No deliveries yet"
                : "No deliveries match your filters"
            }
            description={
              deliveries.length === 0
                ? "Approve an order to automatically create an available delivery."
                : "Try clearing the search or choosing a different status."
            }
            action={
              deliveries.length > 0 ? (
                <Button variant="outline" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Worker</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">GPS</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedDeliveries.map((delivery) => {
                  const statusMeta = DELIVERY_STATUS_META[delivery.deliveryStatus];

                  return (
                    <tr key={delivery.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{delivery.orderNumber}</span>
                        <p className="text-xs text-muted-foreground">
                          Delivery #{delivery.id}
                        </p>
                      </td>

                      <td className="px-4 py-3">{delivery.shopkeeperName}</td>

                      <td className="px-4 py-3">
                        {delivery.deliveryBoyName ?? (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={statusMeta.badgeVariant}>
                          {statusMeta.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <GpsIndicator delivery={delivery} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canEmergencyReassign &&
                            delivery.deliveryStatus === "ASSIGNED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEmergencyReassign(delivery)}
                              disabled={reassigningId === delivery.id}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
                              {reassigningId === delivery.id
                                ? "Reassigning..."
                                : "Emergency Reassign"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDelivery(delivery)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                        </div>
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
