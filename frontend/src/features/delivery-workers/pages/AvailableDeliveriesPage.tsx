import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";

import { deliveryService } from "@/services/api/deliveryService";
import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import type { Delivery } from "@/types/delivery.types";
import { formatDateTime, formatINR } from "@/lib/formatters";

/**
 * Available deliveries page — shows deliveries in AVAILABLE state
 * that the current delivery boy can accept. Uses polling (10s)
 * to keep the list fresh without a WebSocket system.
 */
export function AvailableDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const loadAvailable = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await deliveryService.getAvailableDeliveries();
      setDeliveries(data);
    } catch (error) {
      console.error(error);
      setLoadError("Failed to load available deliveries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvailable();
  }, []);

  // Poll every 10 seconds for fresh availability.
  useEffect(() => {
    const interval = setInterval(() => {
      void loadAvailable();
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (delivery: Delivery) => {
    try {
      setAcceptingId(delivery.id);
      await deliveryService.acceptDelivery(delivery.id);
      toast.success(`Delivery for ${delivery.orderNumber} accepted!`);
      // Remove from available list immediately.
      setDeliveries((prev) => prev.filter((d) => d.id !== delivery.id));
    } catch (error: any) {
      console.error(error);
      const message =
        error?.message || "Failed to accept delivery. It may have been taken by another worker.";
      toast.error(message);
      // Refresh the list since another worker may have taken it.
      await loadAvailable();
    } finally {
      setAcceptingId(null);
    }
  };

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Available Deliveries"
          description="Deliveries waiting to be accepted by a worker."
        />
        <LoadingSpinner fullHeight label="Loading available deliveries..." />
      </div>
    );
  }

  if (loadError && deliveries.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Available Deliveries"
          description="Deliveries waiting to be accepted by a worker."
        />
        <ErrorState
          title="Failed to load deliveries"
          description={loadError}
          onRetry={loadAvailable}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Available Deliveries"
        description="Deliveries waiting to be accepted. Accept one to assign it to yourself."
        actions={
          <Button variant="outline" onClick={loadAvailable} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {deliveries.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No available deliveries"
          description="There are no deliveries waiting to be accepted right now. Check back soon."
          action={
            <Button variant="outline" onClick={loadAvailable}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery) => {
            const isAccepting = acceptingId === delivery.id;

            return (
              <Card key={delivery.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold">
                          {delivery.orderNumber}
                        </span>
                        <Badge variant={DELIVERY_STATUS_META[delivery.deliveryStatus].badgeVariant}>
                          {DELIVERY_STATUS_META[delivery.deliveryStatus].label}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{delivery.shopkeeperName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                          <span>{formatINR(delivery.orderTotalAmount)}</span>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {delivery.deliveryAddress}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Available since {formatDateTime(delivery.availableAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(delivery)}
                        disabled={isAccepting}
                      >
                        {isAccepting ? (
                          <>
                            <Truck className="mr-2 h-4 w-4 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Accept Delivery
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
