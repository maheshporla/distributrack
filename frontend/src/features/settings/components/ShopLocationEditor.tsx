import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InteractiveMap } from "@/features/warehouses/components/InteractiveMap";
import {
  useGeocoding,
  type GeocodingResult,
} from "@/features/warehouses/hooks/useGeocoding";
import {
  useGeolocation,
} from "@/features/warehouses/hooks/useGeolocation";

interface ShopLocationEditorProps {
  /** Current saved latitude. */
  latitude: number | null;
  /** Current saved longitude. */
  longitude: number | null;
  /** Current saved address text. */
  address: string | null;
  /** Called when the user saves a new location. */
  onSave: (data: {
    latitude: number;
    longitude: number;
    address: string;
  }) => Promise<void>;
  /** Whether the parent is currently saving. */
  isSaving: boolean;
}

/**
 * Interactive location editor for the shopkeeper's shop delivery location.
 *
 * Three selection modes:
 * 1. Search — Nominatim forward geocoding (reuses useGeocoding hook)
 * 2. Use Current Location — browser GPS (reuses useGeolocation hook)
 * 3. Select on Map — click on Leaflet map (reuses InteractiveMap component)
 *
 * All three produce: latitude, longitude, address.
 */
export function ShopLocationEditor({
  latitude,
  longitude,
  address: savedAddress,
  onSave,
  isSaving,
}: ShopLocationEditorProps) {
  // Location state
  const [lat, setLat] = useState<number | undefined>(
    latitude ?? undefined,
  );
  const [lng, setLng] = useState<number | undefined>(
    longitude ?? undefined,
  );
  const [addressText, setAddressText] = useState(savedAddress ?? "");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const { results, isSearching, searchError, search, reverseGeocode, clearResults } =
    useGeocoding();
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // GPS state
  const { isLocating, locationError, getCurrentLocation } = useGeolocation();

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Search handler (debounced) ---
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (value.trim().length < 2) {
      clearResults();
      setShowResults(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      void search(value);
      setShowResults(true);
    }, 500);
  };

  // --- Select a search result ---
  const handleSelectResult = async (result: GeocodingResult) => {
    setLat(result.lat);
    setLng(result.lon);
    setAddressText(result.displayName);
    setSearchQuery(result.displayName);
    setShowResults(false);
    clearResults();
  };

  // --- Use Current Location ---
  const handleUseCurrentLocation = async () => {
    const pos = await getCurrentLocation();
    if (pos) {
      setLat(pos.latitude);
      setLng(pos.longitude);
      // Reverse geocode to get address
      const revAddress = await reverseGeocode(pos.latitude, pos.longitude);
      if (revAddress) {
        setAddressText(revAddress);
      }
    }
  };

  // --- Map click handler ---
  const handleMapClick = useCallback(
    async (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      // Reverse geocode the clicked location
      const revAddress = await reverseGeocode(newLat, newLng);
      if (revAddress) {
        setAddressText(revAddress);
      }
    },
    [reverseGeocode],
  );

  // --- Save ---
  const handleSave = async () => {
    if (lat == null || lng == null) {
      toast.error("Please select a location first.");
      return;
    }
    if (!addressText.trim()) {
      toast.error("Address is required.");
      return;
    }
    await onSave({
      latitude: lat,
      longitude: lng,
      address: addressText.trim(),
    });
  };

  // --- Clear location ---
  const handleClear = () => {
    setLat(undefined);
    setLng(undefined);
    setAddressText("");
    setSearchQuery("");
  };

  const hasLocation = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative" ref={searchRef}>
        <label className="mb-1.5 block text-sm font-medium">
          Search Location
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder='Search for a location (e.g. "Hyderabad")'
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                clearResults();
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {isSearching && (
          <p className="mt-1 text-xs text-muted-foreground">Searching...</p>
        )}
        {searchError && (
          <p className="mt-1 text-xs text-destructive">{searchError}</p>
        )}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-card shadow-lg">
            {results.map((result) => (
              <button
                key={result.placeId}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <p className="line-clamp-2">{result.displayName}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Location button */}
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
        >
          <Navigation className="mr-2 h-4 w-4" />
          {isLocating ? "Getting location..." : "Use Current Location"}
        </Button>
        {locationError && (
          <p className="mt-1 text-xs text-destructive">{locationError}</p>
        )}
      </div>

      {/* Coordinates display */}
      {hasLocation && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>
            📍 {lat!.toFixed(6)}, {lng!.toFixed(6)}
          </span>
        </div>
      )}

      {/* Map */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Select on Map (click to place marker)
        </label>
        <InteractiveMap
          latitude={lat}
          longitude={lng}
          onLocationSelect={handleMapClick}
          height="h-72"
        />
      </div>

      {/* Address display */}
      {addressText && (
        <div className="rounded-md border bg-muted/50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Address
          </p>
          <p className="mt-1 text-sm">{addressText}</p>
        </div>
      )}

      {/* Save / Clear buttons */}
      <div className="flex justify-between border-t pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={handleClear}
          disabled={isSaving}
        >
          Clear Location
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasLocation}
        >
          {isSaving ? "Saving..." : "Save Shop Location"}
        </Button>
      </div>
    </div>
  );
}
