import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatINR } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import {
  DELIVERY_STATUS_ACTIONS,
  DELIVERY_STATUS_META,
  isDeliveryActive,
} from "@/features/deliveries/deliveryStatus";
import { DeliveryMap } from "@/features/deliveries/components/DeliveryMap";
import { FailureReasonDialog } from "@/features/deliveries/components/FailureReasonDialog";
import {
  useLiveTracking,
  GPS_STATUS_LABELS,
  type GpsStatus,
} from "@/features/deliveries/hooks/useLiveTracking";

import type { Delivery, DeliveryStatus } from "@/types/delivery.types";
import type { RoleName } from "@/types/auth.types";

interface DeliveryDetailsProps {
  delivery: Delivery;
  role: RoleName;
  /** Delivery id currently having its status updated. */
  updatingStatusId: number | null;
  onBack: () => void;
  onStatusChange: (next: DeliveryStatus, failureReason?: string) => void;
  /** Called when live tracking persists a new location. */
  onDeliveryUpdated: (updated: Delivery) => void;
}

const STATUS_ROLES: RoleName[] = [
  "SUPER_ADMIN",
  "OWNER",
  "MANAGER",
  "DELIVERY_BOY",
];

/** How old a location update is before we consider it "stale" (5 minutes). */
const STALE_THRESHOLD_MS = 5 * 60 * 1_000;

function isLocationStale(lastLocationAt: string | null): boolean {
  if (!lastLocationAt) return true;
  return Date.now() - new Date(lastLocationAt).getTime() > STALE_THRESHOLD_MS;
}

/** GPS status dot color. */
function gpsDotColor(status: GpsStatus): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "locating":
      return "bg-amber-500 animate-pulse";
    case "error":
      return "bg-red-500";
    case "idle":
    default:
      return "bg-muted-foreground/40";
  }
}

export function DeliveryDetails({
  delivery,
  role,
  updatingStatusId,
  onBack,
  onStatusChange,
  onDeliveryUpdated,
}: DeliveryDetailsProps) {
  const statusMeta = DELIVERY_STATUS_META[delivery.deliveryStatus];
  const active = isDeliveryActive(delivery.deliveryStatus);

  const canUpdateStatus = STATUS_ROLES.includes(role);
  // Only the delivery boy's own device broadcasts a live position;
  // business roles and the shopkeeper just view the reported location.
  const canTrack = role === "DELIVERY_BOY" && active;

  // Auto-start tracking when delivery is OUT_FOR_DELIVERY,
  // auto-stop on terminal statuses (DELIVERED/FAILED/CANCELLED).
  const tracking = useLiveTracking({
    deliveryId: delivery.id,
    onPersisted: onDeliveryUpdated,
    autoStart: canTrack && delivery.deliveryStatus === "OUT_FOR_DELIVERY",
  });

  // Stop tracking when delivery reaches a terminal status.
  useEffect(() => {
    if (!active) {
      tracking.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const actions = canUpdateStatus
    ? DELIVERY_STATUS_ACTIONS[delivery.deliveryStatus]
    : [];

  const isUpdating = updatingStatusId === delivery.id;

  // --- Failure reason dialog state ---
  const [showFailureDialog, setShowFailureDialog] = useState(false);

  const handleActionClick = (next: DeliveryStatus) => {
    if (next === "FAILED") {
      setShowFailureDialog(true);
    } else {
      onStatusChange(next);
    }
  };

  const handleFailureConfirm = (reason: string) => {
    setShowFailureDialog(false);
    onStatusChange("FAILED", reason);
  };

  const handleFailureCancel = () => {
    setShowFailureDialog(false);
  };

  const hasCoordinates =
    delivery.latitude !== null &&
    delivery.longitude !== null &&
    Number.isFinite(delivery.latitude) &&
    Number.isFinite(delivery.longitude);

  const lat = delivery.latitude;
  const lng = delivery.longitude;
  const stale = isLocationStale(delivery.lastLocationAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to deliveries
          </Button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              Delivery #{delivery.id}
            </h1>
            <Badge variant={statusMeta.badgeVariant}>
              {statusMeta.label}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Order {delivery.orderNumber} — assigned{" "}
            {formatDateTime(delivery.assignedAt)}
          </p>
        </div>

        {/* Status actions */}
        {actions.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.to}
                variant={action.buttonVariant}
                onClick={() => handleActionClick(action.to)}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Delivery Boy
          </p>
          <p className="mt-1 font-medium">{delivery.deliveryBoyName}</p>
          <p className="text-xs text-muted-foreground">
            Worker ID: {delivery.deliveryBoyId}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Order Total
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {formatINR(delivery.orderTotalAmount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {delivery.orderNumber}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Vehicle
          </p>
          <p className="mt-1 font-medium">
            {delivery.vehicleNumber || "Not specified"}
          </p>
          {delivery.deliveredAt && (
            <p className="text-xs text-muted-foreground">
              Delivered {formatDateTime(delivery.deliveredAt)}
            </p>
          )}
        </div>
      </div>

      {/* Customer + address */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Customer / Shop
          </p>
          <p className="mt-1 font-medium">{delivery.shopkeeperName}</p>
          <p className="text-xs text-muted-foreground">
            {delivery.shopkeeperPhone}
          </p>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Delivery Address
          </p>
          <p className="mt-1 font-medium">{delivery.deliveryAddress}</p>
        </div>
      </div>

      {/* Failure reason (shown when delivery is FAILED) */}
      {delivery.deliveryStatus === "FAILED" && delivery.failureReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Failure Reason
          </p>
          <p className="mt-1 text-sm">{delivery.failureReason}</p>
        </div>
      )}

      {/* Live location */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" />
              Live Location
            </h2>

            {/* GPS Status — delivery boy sees tracking status; admin sees staleness */}
            {canTrack ? (
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-block size-2 rounded-full",
                    gpsDotColor(tracking.gpsStatus),
                  )}
                />
                <span className="text-xs font-medium text-muted-foreground">
                  {GPS_STATUS_LABELS[tracking.gpsStatus]}
                </span>
                {tracking.error && tracking.gpsStatus === "error" && (
                  <span className="text-xs text-destructive">
                    — {tracking.error}
                  </span>
                )}
              </div>
            ) : hasCoordinates && lat !== null && lng !== null ? (
              <p className="text-xs text-muted-foreground">
                {lat.toFixed(6)}, {lng.toFixed(6)}
                {delivery.lastLocationAt && (
                  <>
                    {" "}
                    · updated {formatDateTime(delivery.lastLocationAt)}
                    {stale && (
                      <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                        (stale)
                      </span>
                    )}
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {active
                  ? "No location reported yet — tracking starts when the delivery boy begins."
                  : "No location was reported for this delivery."}
              </p>
            )}
          </div>

          {/* Tracking controls — delivery boy manual start/stop */}
          {canTrack && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {!tracking.isTracking ? (
                <Button
                  size="sm"
                  onClick={tracking.start}
                  disabled={tracking.isLocating}
                >
                  <Crosshair className="mr-2 h-4 w-4" />
                  {tracking.isLocating ? "Locating..." : "Start Location Tracking"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={tracking.stop}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Stop Tracking
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Live position info for delivery boy */}
        {tracking.isTracking && tracking.lastPosition && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Navigation className="h-3 w-3" />
            Current position: {tracking.lastPosition.latitude.toFixed(6)},{" "}
            {tracking.lastPosition.longitude.toFixed(6)}
            {tracking.lastSentAt && (
              <> · last sent {formatDateTime(tracking.lastSentAt)}</>
            )}
          </p>
        )}

        {/* Map */}
        {hasCoordinates && lat !== null && lng !== null ? (
          <div className="mt-4">
            <DeliveryMap latitude={lat} longitude={lng} />
          </div>
        ) : (
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">
              Map will appear here once a location is reported.
            </p>
          </div>
        )}
      </div>

      {/* Failure reason dialog */}
      <FailureReasonDialog
        isOpen={showFailureDialog}
        onConfirm={handleFailureConfirm}
        onCancel={handleFailureCancel}
        isSubmitting={isUpdating}
      />
    </div>
  );
}
