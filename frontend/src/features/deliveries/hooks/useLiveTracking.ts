import { useCallback, useEffect, useRef, useState } from "react";

import { deliveryService } from "@/services/api/deliveryService";
import { geolocationErrorMessage } from "@/features/warehouses/hooks/useGeolocation";

/**
 * Live GPS tracking for an active delivery.
 *
 * Uses the browser Geolocation API (watchPosition) and pushes the
 * current position to the backend via PUT /api/delivery/{id}/location.
 * The backend stores the latest lat/lng + timestamp and is the source
 * of truth for the map views (owner/manager, shopkeeper).
 *
 * Behavior:
 *   - high-accuracy watchPosition; updates pushed at most every
 *     `minIntervalMs` (default 5s) so we don't hammer the API
 *   - every failure mode is surfaced with a specific message:
 *     permission denied (1), position unavailable (2), timeout (3),
 *     unsupported browser
 *   - never fabricates coordinates — on error the last good position
 *     (if any) is kept and the error is reported
 *   - tracking stops on unmount and can be stopped explicitly; the
 *     caller should also stop it when the delivery reaches a terminal
 *     status (DELIVERED / FAILED / CANCELLED)
 */

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 5_000,
};

/** Rounds to ~0.1 m precision so stored values stay clean. */
const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

interface UseLiveTrackingOptions {
  deliveryId: number;
  /** Minimum gap between backend location pushes (ms). */
  minIntervalMs?: number;
  /** Called with the freshly-persisted delivery after a push. */
  onPersisted?: (delivery: import("@/types/delivery.types").Delivery) => void;
}

interface UseLiveTrackingResult {
  /** Whether watchPosition is currently active. */
  isTracking: boolean;
  /** True while the browser is resolving an initial position. */
  isLocating: boolean;
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
}: UseLiveTrackingOptions): UseLiveTrackingResult {
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPosition, setLastPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastPushRef = useRef<number>(0);
  const onPersistedRef = useRef(onPersisted);

  useEffect(() => {
    onPersistedRef.current = onPersisted;
  }, [onPersisted]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setIsLocating(false);
  }, []);

  // Cleanup on unmount — never leave a watch running.
  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError(
        "Geolocation is not supported by this browser, so live tracking is unavailable.",
      );
      return;
    }

    if (watchIdRef.current !== null) {
      // Already tracking.
      return;
    }

    setError(null);
    setIsLocating(true);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const latitude = round(position.coords.latitude);
        const longitude = round(position.coords.longitude);

        setLastPosition({ latitude, longitude });
        setError(null);
        setIsLocating(false);

        const now = Date.now();
        if (now - lastPushRef.current < minIntervalMs) {
          return;
        }
        lastPushRef.current = now;

        try {
          const persisted = await deliveryService.updateDeliveryLocation(
            deliveryId,
            { latitude, longitude },
          );
          setLastSentAt(new Date());
          onPersistedRef.current?.(persisted);
        } catch (pushError) {
          console.error(pushError);
          setError("Location couldn't be sent to the server. Retrying...");
        }
      },
      (watchError) => {
        const code =
          watchError instanceof GeolocationPositionError
            ? watchError.code
            : null;
        setError(geolocationErrorMessage(code));
        setIsLocating(false);
      },
      WATCH_OPTIONS,
    );
  }, [deliveryId, minIntervalMs]);

  return {
    isTracking,
    isLocating,
    error,
    lastPosition,
    lastSentAt,
    start,
    stop,
  };
}
