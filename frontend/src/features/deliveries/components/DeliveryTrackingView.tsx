import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, RefreshCw, Truck, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deliveryService } from "@/services/api/deliveryService";
import { DELIVERY_STATUS_META } from "@/features/deliveries/deliveryStatus";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Delivery } from "@/types/delivery.types";

// --- Custom marker icons (using inline SVG data URIs to avoid asset path issues) ---

const workerIcon = L.divIcon({
  className: "",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
  html: `<div style="position:relative;width:32px;height:42px;">
    <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#2563eb"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="#2563eb">🚚</text>
    </svg>
  </div>`,
});

const destIcon = L.divIcon({
  className: "",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
  html: `<div style="position:relative;width:32px;height:42px;">
    <svg viewBox="0 0 32 42" width="32" height="42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#dc2626"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
      <text x="16" y="21" text-anchor="middle" font-size="14" font-weight="bold" fill="#dc2626">📍</text>
    </svg>
  </div>`,
});



/** How old a GPS update before we consider it stale (5 minutes). */
const STALE_THRESHOLD_MS = 5 * 60 * 1_000;

/** Polling interval for live location updates. */
const POLL_INTERVAL_MS = 8_000;

interface DeliveryTrackingViewProps {
  deliveryId: number;
  onBack: () => void;
}

/** Inner component that fits the map bounds to show both markers. */
function FitBounds({
  workerPos,
  destPos,
}: {
  workerPos: [number, number] | null;
  destPos: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (workerPos && destPos) {
      const bounds = L.latLngBounds([workerPos, destPos]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (workerPos) {
      map.setView(workerPos, 15, { animate: true });
    } else if (destPos) {
      map.setView(destPos, 15, { animate: true });
    }
  }, [workerPos, destPos, map]);

  return null;
}

/** GPS status classification based on lastLocationAt. */
function getGpsStatus(
  delivery: Delivery,
): { label: string; color: "green" | "amber" | "gray"; dotClass: string } {
  const hasCoords =
    delivery.latitude !== null &&
    delivery.longitude !== null &&
    Number.isFinite(delivery.latitude) &&
    Number.isFinite(delivery.longitude);

  if (!hasCoords) {
    return {
      label: "GPS Unavailable",
      color: "gray",
      dotClass: "bg-muted-foreground/40",
    };
  }

  if (!delivery.lastLocationAt) {
    return {
      label: "No location data",
      color: "gray",
      dotClass: "bg-muted-foreground/40",
    };
  }

  const age = Date.now() - new Date(delivery.lastLocationAt).getTime();
  if (age > STALE_THRESHOLD_MS) {
    return {
      label: "Stale",
      color: "amber",
      dotClass: "bg-amber-500",
    };
  }

  return {
    label: "Live",
    color: "green",
    dotClass: "bg-green-500",
  };
}

/**
 * Interactive Leaflet delivery tracking view for admin/distributor.
 * Polls the backend for live location updates while the delivery is active.
 * Stops polling when delivery reaches a terminal status.
 */
export function DeliveryTrackingView({
  deliveryId,
  onBack,
}: DeliveryTrackingViewProps) {
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDelivery = useCallback(async () => {
    try {
      const data = await deliveryService.getDeliveryById(deliveryId);
      setDelivery(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to fetch delivery for tracking:", err);
      setError("Failed to load delivery data");
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  // Initial fetch
  useEffect(() => {
    fetchDelivery();
  }, [fetchDelivery]);

  // Polling: only while delivery is active (ASSIGNED or OUT_FOR_DELIVERY)
  const isActive = useMemo(() => {
    if (!delivery) return false;
    return (
      delivery.deliveryStatus === "ASSIGNED" ||
      delivery.deliveryStatus === "OUT_FOR_DELIVERY"
    );
  }, [delivery?.deliveryStatus]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(fetchDelivery, POLL_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, fetchDelivery]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to deliveries
        </Button>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-card">
          <p className="text-sm text-muted-foreground">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to deliveries
        </Button>
        <div className="flex h-64 items-center justify-center rounded-lg border bg-card">
          <p className="text-sm text-destructive">{error || "Delivery not found"}</p>
        </div>
      </div>
    );
  }

  const statusMeta = DELIVERY_STATUS_META[delivery.deliveryStatus];
  const gpsStatus = getGpsStatus(delivery);

  const hasWorkerCoords =
    delivery.latitude !== null &&
    delivery.longitude !== null &&
    Number.isFinite(delivery.latitude) &&
    Number.isFinite(delivery.longitude);

  const workerPos: [number, number] | null = hasWorkerCoords
    ? [delivery.latitude!, delivery.longitude!]
    : null;

  const hasDestCoords =
    delivery.destinationLatitude !== null &&
    delivery.destinationLongitude !== null &&
    Number.isFinite(delivery.destinationLatitude) &&
    Number.isFinite(delivery.destinationLongitude);

  const destPos: [number, number] | null = hasDestCoords
    ? [delivery.destinationLatitude!, delivery.destinationLongitude!]
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-2">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to deliveries
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Delivery Tracking
            </h1>
            <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Order {delivery.orderNumber}
          </p>
        </div>

        {isActive && (
          <Button variant="outline" size="sm" onClick={fetchDelivery}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh Now
          </Button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Delivery Boy Card */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            Delivery Boy
          </div>
          {delivery.deliveryBoyName ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium">{delivery.deliveryBoyName}</p>
              {delivery.deliveryBoyPhone && (
                <p className="text-sm text-muted-foreground">
                  📞 {delivery.deliveryBoyPhone}
                </p>
              )}
              {delivery.deliveryBoyVehicleType && (
                <p className="text-sm text-muted-foreground">
                  🚗 {delivery.deliveryBoyVehicleType}
                  {delivery.deliveryBoyVehicleNumber &&
                    ` · ${delivery.deliveryBoyVehicleNumber}`}
                </p>
              )}
              {!delivery.deliveryBoyVehicleType &&
                delivery.deliveryBoyVehicleNumber && (
                  <p className="text-sm text-muted-foreground">
                    🚗 {delivery.deliveryBoyVehicleNumber}
                  </p>
                )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground italic">
              Not Assigned
            </p>
          )}
        </div>

        {/* GPS Status Card */}
        <div className="rounded-lg border bg-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            GPS Status
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("inline-block size-2.5 rounded-full", gpsStatus.dotClass)} />
            <span className="font-medium">{gpsStatus.label}</span>
          </div>
          {delivery.lastLocationAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last updated: {formatDateTime(delivery.lastLocationAt)}
            </p>
          )}
          {hasWorkerCoords && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {delivery.latitude!.toFixed(6)}, {delivery.longitude!.toFixed(6)}
            </p>
          )}
        </div>

        {/* Destination Card */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Destination
          </div>
          <p className="mt-2 font-medium">{delivery.shopkeeperName}</p>
          {delivery.shopkeeperPhone && (
            <p className="text-sm text-muted-foreground">
              📞 {delivery.shopkeeperPhone}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {delivery.deliveryAddress}
          </p>
          {hasDestCoords && (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              📍 {delivery.destinationLatitude!.toFixed(6)}, {delivery.destinationLongitude!.toFixed(6)}
            </p>
          )}
          {!hasDestCoords && (
            <p className="mt-1 text-xs text-muted-foreground italic">
              Destination coordinates not available
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-full bg-blue-600" />
            🚚 Delivery Boy
          </span>
          {hasDestCoords && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-full bg-red-600" />
              📍 Destination
            </span>
          )}
        </div>

        {(hasWorkerCoords || hasDestCoords) ? (
          <div className="h-[400px] w-full overflow-hidden rounded-lg">
            <MapContainer
              center={workerPos ?? destPos ?? [17.385, 78.4867]}
              zoom={15}
              className="h-full w-full"
              scrollWheelZoom={true}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds workerPos={workerPos} destPos={destPos} />

              {/* Worker marker */}
              {workerPos && (
                <Marker position={workerPos} icon={workerIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">
                        🚚 {delivery.deliveryBoyName || "Delivery Boy"}
                      </p>
                      {delivery.deliveryBoyPhone && (
                        <p className="text-muted-foreground">
                          📞 {delivery.deliveryBoyPhone}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {delivery.latitude!.toFixed(6)},{" "}
                        {delivery.longitude!.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination marker */}
              {destPos && (
                <Marker position={destPos} icon={destIcon}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">
                        📍 {delivery.shopkeeperName}
                      </p>
                      <p className="text-muted-foreground">
                        {delivery.deliveryAddress}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed bg-muted/30">
            <div className="text-center">
              <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                {delivery.deliveryStatus === "ASSIGNED"
                  ? "Waiting for delivery boy to start delivery and send GPS location..."
                  : delivery.deliveryStatus === "OUT_FOR_DELIVERY"
                    ? "No GPS location reported yet"
                    : "GPS location not available for this delivery"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active polling indicator */}
      {isActive && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          Live tracking active — updating every {POLL_INTERVAL_MS / 1000}s
          <span className="ml-auto text-xs opacity-70">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Terminal status notice */}
      {!isActive && delivery.deliveryStatus !== "AVAILABLE" && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Tracking stopped — delivery has reached final status: {statusMeta.label}
        </div>
      )}
    </div>
  );
}
