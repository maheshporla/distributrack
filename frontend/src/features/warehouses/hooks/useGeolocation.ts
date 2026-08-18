import { useCallback, useState } from "react";

/**
 * Browser Geolocation wrapper with explicit, user-friendly handling of
 * every failure mode the API exposes:
 *   - permission denied   (code 1)
 *   - position unavailable (code 2)
 *   - timeout             (code 3)
 *   - unsupported browser
 *
 * Coordinates are rounded to 6 decimal places (~0.1 m precision) so
 * form values stay clean. The hook never fabricates a location — on any
 * failure it resolves to null and leaves the caller's fields untouched.
 */

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

export function geolocationErrorMessage(code: number | null): string {
  switch (code) {
    case 1:
      return "Location permission was denied. Allow location access in your browser settings and try again.";
    case 2:
      return "Your current location is unavailable. Check your connection and try again.";
    case 3:
      return "Location request timed out. Move to an area with better signal and try again.";
    default:
      return "Unable to retrieve your location. Please enter the coordinates manually.";
  }
}

interface UseGeolocationResult {
  /** True while the browser is resolving the position. */
  isLocating: boolean;
  /** Human-readable failure message, or null when idle/successful. */
  locationError: string | null;
  /**
   * Requests the current position. Resolves with rounded coordinates on
   * success, or null on any failure (after setting `locationError`).
   */
  getCurrentLocation: () => Promise<{
    latitude: number;
    longitude: number;
  } | null>;
}

export function useGeolocation(): UseGeolocationResult {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getCurrentLocation = useCallback(async () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      const message =
        "Geolocation is not supported by this browser. Please enter the coordinates manually.";
      setLocationError(message);
      return null;
    }

    setIsLocating(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            GEOLOCATION_OPTIONS,
          );
        },
      );

      const round = (value: number) =>
        Math.round(value * 1_000_000) / 1_000_000;

      return {
        latitude: round(position.coords.latitude),
        longitude: round(position.coords.longitude),
      };
    } catch (error) {
      const code =
        error instanceof GeolocationPositionError ? error.code : null;
      setLocationError(geolocationErrorMessage(code));
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { isLocating, locationError, getCurrentLocation };
}
