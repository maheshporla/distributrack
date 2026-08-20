import { useCallback, useEffect, useRef, useState } from "react";

import { deliveryService } from "@/services/api/deliveryService";
import { geolocationErrorMessage } from "@/features/warehouses/hooks/useGeolocation";
import type { Delivery } from "@/types/delivery.types";

/**
 * Production-ready live GPS tracking for an active delivery.
 *
 * Uses the browser Geolocation API (`watchPosition`) and pushes the
 * current position to the backend via `PUT /api/delivery/{id}/location`.
 * The backend stores the latest lat/lng + timestamp and is the source
 * of truth for the map views (owner/manager, shopkeeper).
 *
 * Lifecycle:
 *   - `start()` requests browser permission and begins the watch.
 *   - `stop()` clears the watch and resets state.
 *   - Tracking auto-stops on unmount (never leave a watcher running).
 *   - Callers should `stop()` when the delivery reaches a terminal status.
 *
 * GPS status is explicitly surfaced:
 *   - "active"   — watchPosition running, location being shared
 *   - "locating" — browser resolving initial position (permission granted)
 *   - "error"    — permission denied, unavailable, or network failure
 *   - "idle"     — not tracking
 *
 * The hook NEVER fabricates coordinates. On error, the last good position
 * (if any) is kept and the error is surfaced.
 */

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
};

/** Rounds to 6 decimal places (~0.1 m precision) for clean storage. */
const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

/** GPS status for UI display. */
export type GpsStatus = "idle" | "locating" | "active" | "error";

/** Human-readable labels for each GPS status. */
export const GPS_STATUS_LABELS: Record<GpsStatus, string> = {
  idle: "Location sharing inactive",
  locating: "Acquiring GPS signal…",
  active: "Location sharing active",
  error: "Location unavailable",
};

interface UseLiveTrackingOptions {
  deliveryId: number;
  /** Minimum gap between backend location pushes (ms). Default: 5000. */
  minIntervalMs?: number;
  /** Called with the freshly-persisted delivery after a successful push. */
  onPersisted?: (delivery: Delivery) => void;
  /**
   * When true, automatically start tracking (e.g. delivery transitioned
   * to OUT_FOR_DELIVERY). When false, tracking stays idle until
   * `start()` is called manually.
   */
  autoStart?: boolean;
}

interface UseLiveTrackingResult {
  /** Whether watchPosition is currently running. */
  isTracking: boolean;
  /** True while the browser is resolving an initial position. */
  isLocating: boolean;
  /** Structured GPS status for UI display. */
  gpsStatus: GpsStatus;
  /** Human-readable failure message, or null when healthy. */
  error: string | null;
  /** Last position obtained from the browser (may be ahead of the last push). */
  lastPosition: { latitude: number; longitude: number } | null;
  /** Time the last position was successfully persisted to the backend. */
  lastSentAt: Date | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useLiveTracking({
  deliveryId,
  minIntervalMs = 5_000,
  onPersisted,
  autoStart = false,
}: UseLiveTrackingOptions): UseLiveTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastPushRef = useRef<number>(0);
  const onPersistedRef = useRef(onPersisted);
  const deliveryIdRef = useRef(deliveryId);

  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  useEffect(() => {
    deliveryIdRef.current = deliveryId;
  }, [deliveryId]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsLocating(false);
    setGpsStatus("idle");
  }, []);

  // Cleanup on unmount — never leave a watch running.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError(
        "Geolocation is not supported by this browser, so live tracking is unavailable.",
      );
      setGpsStatus("error");
      return;
    }

    if (watchIdRef.current !== null) {
      // Already tracking.
      return;
    }

    setError(null);
    setIsLocating(true);
    setIsTracking(true);
    setGpsStatus("locating");

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = round(position.coords.latitude);
        const longitude = round(position.coords.longitude);

        setLastPosition({ latitude, longitude });
        setError(null);
        setIsLocating(false);
        setGpsStatus("active");

        // Throttle backend pushes.
        const now = Date.now();
        if (now - lastPushRef.current < minIntervalMs) {
          return;
        }
        lastPushRef.current = now;

        try {
          const persisted = await deliveryService.updateDeliveryLocation(
            deliveryIdRef.current,
            { latitude, longitude },
          );
          setLastSentAt(new Date());
          onPersistedRef.current?.(persisted);
        } catch (pushError) {
          console.error(pushError);
          setError("Location couldn't be sent to the server. Retrying...");
          setGpsStatus("error");
        }
      },
      (watchError) => {
        const code =
          watchError instanceof GeolocationPositionError
            ? watchError.code
            : null;
        const message = geolocationErrorMessage(code);
        setError(message);
        setIsLocating(false);
        // Code 1 = permission denied — stop tracking since retry won't help.
        if (code === 1) {
          setIsTracking(false);
          setGpsStatus("error");
        } else {
          setGpsStatus("error");
        }
      },
      WATCH_OPTIONS,
    );
  }, [minIntervalMs]);

  // Auto-start when autoStart becomes true (delivery transitioned to
  // OUT_FOR_DELIVERY). Auto-stop when it becomes false (terminal status).
  useEffect(() => {
    if (autoStart && !watchIdRef.current) {
      void start();
    } else if (!autoStart && watchIdRef.current) {
      stop();
    }
  }, [autoStart, start, stop]);

  return {
    isTracking,
    isLocating,
    gpsStatus,
    error,
    lastPosition,
    lastSentAt,
    start,
    stop,
  };
}
