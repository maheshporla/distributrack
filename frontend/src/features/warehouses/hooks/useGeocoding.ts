import { useCallback, useRef, useState } from "react";

/**
 * Geocoding hook using the Nominatim (OpenStreetMap) API.
 *
 * Nominatim is free, requires no API key, and has global coverage.
 * Usage policy: max 1 request/second, must set a custom User-Agent.
 *
 * Provides:
 *   - `search(query)` — forward geocode a location name/address
 *   - `reverseGeocode(lat, lng)` — reverse geocode coordinates to address
 *
 * All results include `displayName` (human-readable), `lat`, `lon`,
 * and `boundingBox` for map fitting.
 */

const NOMINATIM_BASE =
  import.meta.env.VITE_NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";

/** Nominatim search result shape. */
export interface GeocodingResult {
  /** Unique place ID from Nominatim. */
  placeId: number;
  /** Human-readable display name. */
  displayName: string;
  /** Latitude. */
  lat: number;
  /** Longitude. */
  lon: number;
  /** Bounding box [south, north, west, east]. */
  boundingBox: [number, number, number, number];
  /** Place type (e.g. "city", "house", "road"). */
  type: string;
}

interface UseGeocodingResult {
  /** Search results from the last query. */
  results: GeocodingResult[];
  /** True while a search request is in flight. */
  isSearching: boolean;
  /** Error message from the last failed request. */
  searchError: string | null;
  /** Forward geocode a location name/address. */
  search: (query: string) => Promise<void>;
  /** Reverse geocode coordinates to a display name. */
  reverseGeocode: (
    lat: number,
    lng: number,
  ) => Promise<string | null>;
  /** Clear results and error state. */
  clearResults: () => void;
}

export function useGeocoding(): UseGeocodingResult {
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    // Cancel any in-flight request.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({
        q: trimmed,
        format: "json",
        limit: "8",
        addressdetails: "1",
      });

      const response = await fetch(
        `${NOMINATIM_BASE}/search?${params.toString()}`,
        {
          headers: {
            "Accept-Language": "en",
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Geocoding service returned ${response.status}`);
      }

      const data: Array<{
        place_id: number;
        display_name: string;
        lat: string;
        lon: string;
        boundingbox: string[];
        type: string;
      }> = await response.json();

      setResults(
        data.map((item) => ({
          placeId: item.place_id,
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          boundingBox: [
            parseFloat(item.boundingbox[0]),
            parseFloat(item.boundingbox[1]),
            parseFloat(item.boundingbox[2]),
            parseFloat(item.boundingbox[3]),
          ],
          type: item.type,
        })),
      );
    } catch (error: unknown) {
      // Ignore abort errors — a new request superseded this one.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      console.error("Geocoding search failed:", error);
      setSearchError(
        error instanceof Error
          ? error.message
          : "Location search failed. Please try again.",
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string | null> => {
      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lng.toString(),
          format: "json",
          zoom: "18",
          addressdetails: "1",
        });

        const response = await fetch(
          `${NOMINATIM_BASE}/reverse?${params.toString()}`,
          {
            headers: {
              "Accept-Language": "en",
            },
          },
        );

        if (!response.ok) return null;

        const data: { display_name?: string } = await response.json();
        return data.display_name ?? null;
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        return null;
      }
    },
    [],
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setSearchError(null);
  }, []);

  return { results, isSearching, searchError, search, reverseGeocode, clearResults };
}
