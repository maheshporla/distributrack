import { useEffect, useMemo, useState } from "react";
import { Eye, Plus, Route, Search } from "lucide-react";
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
import { DeliveryForm } from "@/features/deliveries/components/DeliveryForm";
import { DeliveryDetails } from "@/features/deliveries/components/DeliveryDetails";

import {
  DELIVERY_STATUSES,
  type Delivery,
  type DeliveryStatus,
} from "@/types/delivery.types";
import { formatDateTime } from "@/lib/formatters";

type PageView = "list" | "details" | "form";

export function DeliveriesPage() {
  const user = useAuthStore((state) => state.user);
  const role = user?.role ?? "SHOPKEEPER";

  // Matches SecurityConfig + DeliveryServiceImpl:
  //   - assignment (POST /api/delivery) is SA/OWNER/MANAGER only
  //   - status/location updates are SA/OWNER/MANAGER/DELIVERY_BOY
  //     (handled inside DeliveryDetails via `role`)
  const canAssign =
    role === "SUPER_ADMIN" || role === "OWNER" || role === "MANAGER";

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");

  const [view, setView] = useState<PageView>("list");
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  // =========================================================
  // Load deliveries — the backend scopes the list by role
  // (DELIVERY_BOY: own; SHOPKEEPER: own orders; business: all)
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
  // Search + status filter (client-side over the loaded list)
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
        delivery.deliveryBoyName.toLowerCase().includes(keyword) ||
        delivery.deliveryStatus.toLowerCase().includes(keyword) ||
        delivery.deliveryAddress.toLowerCase().includes(keyword)
      );
    });
  }, [deliveries, searchKeyword, statusFilter]);

  // =========================================================
  // Status update (SA/OWNER/MANAGER/DELIVERY_BOY only)
  // =========================================================

  const handleStatusChange = async (next: DeliveryStatus) => {
    if (!selectedDelivery) return;

    try {
      setUpdatingStatusId(selectedDelivery.id);

      const updated = await deliveryService.updateDeliveryStatus(
        selectedDelivery.id,
        next,
      );

      toast.success(
        `Delivery marked as ${next.replace(/_/g, " ").toLowerCase()}`,
      );

      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === updated.id ? updated : delivery,
        ),
      );
      setSelectedDelivery(updated);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update delivery status");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  /** Merges a location-updated delivery back into the list state. */
  const handleDeliveryUpdated = (updated: Delivery) => {
    setDeliveries((prev) =>
      prev.map((delivery) => (delivery.id === updated.id ? updated : delivery)),
    );
    setSelectedDelivery(updated);
  };

  // =========================================================
  // View switching
  // =========================================================

  const handleViewDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setView("details");
  };

  const handleAssignDelivery = () => {
    setView("form");
  };

  const handleFormSuccess = async () => {
    setView("list");
    setSelectedDelivery(null);
    await loadDeliveries();
  };

  const handleFormCancel = () => {
    setView("list");
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
  // Assign Delivery Screen (SA/OWNER/MANAGER)
  // =========================================================

  if (view === "form") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Assign Delivery"
          description="Assign an approved order to a delivery worker."
        />

        <div className="rounded-lg border bg-card p-6">
          <DeliveryForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </div>
      </div>
    );
  }

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
              : "Assign, track and manage deliveries."
        }
        actions={
          canAssign ? (
            <Button onClick={handleAssignDelivery}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Delivery
            </Button>
          ) : undefined
        }
      />

      {/* Search + Status Filter */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-muted-foreground"
          />

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
            <p className="text-sm text-muted-foreground">
              Loading deliveries...
            </p>
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
                ? canAssign
                  ? "Assign an approved order to a delivery worker to get started."
                  : "You have no deliveries right now."
                : "Try clearing the search or choosing a different status."
            }
            action={
              deliveries.length === 0 && canAssign ? (
                <Button onClick={handleAssignDelivery}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Delivery
                </Button>
              ) : deliveries.length > 0 ? (
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
                  <th className="px-4 py-3">Delivery Boy</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody>
                {displayedDeliveries.map((delivery) => {
                  const statusMeta =
                    DELIVERY_STATUS_META[delivery.deliveryStatus];

                  return (
                    <tr key={delivery.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">
                          {delivery.orderNumber}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Delivery #{delivery.id}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        {delivery.shopkeeperName}
                      </td>

                      <td className="px-4 py-3">
                        {delivery.deliveryBoyName}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(delivery.assignedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={statusMeta.badgeVariant}>
                          {statusMeta.label}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
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
