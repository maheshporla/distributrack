import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";

interface InteractiveMapProps {
  /** Current latitude (may be NaN if no location selected yet). */
  latitude: number | undefined;
  /** Current longitude (may be NaN if no location selected yet). */
  longitude: number | undefined;
  /** Called when the user clicks the map or a marker is placed. */
  onLocationSelect: (lat: number, lng: number) => void;
  /** Height of the map container. */
  height?: string;
  /** Whether the map is read-only (no click-to-select). */
  readOnly?: boolean;
}

/**
 * Interactive Leaflet map for warehouse location selection.
 *
 * Features:
 *   - Click anywhere on the map to place/update the marker
 *   - Marker shows the selected location
 *   - Auto-centers on the current coordinates
 *   - Uses free OpenStreetMap tiles (no API key)
 *   - Reverse geocoding is handled by the parent via `onLocationSelect`
 *
 * The map re-centers when coordinates change externally (e.g. from
 * GPS capture or search result selection).
 */

/** Default center (Hyderabad, India) when no coordinates are set. */
const DEFAULT_CENTER: [number, number] = [17.385, 78.4867];
const DEFAULT_ZOOM = 13;

/** Inner component that handles map events and re-centering. */
function MapEvents({
  onLocationSelect,
  center,
  readOnly,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  center: [number, number];
  readOnly: boolean;
}) {
  const map = useMap();

  // Re-center when coordinates change externally.
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  // Click to place marker.
  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (!readOnly) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}

export function InteractiveMap({
  latitude,
  longitude,
  onLocationSelect,
  height = "h-64",
  readOnly = false,
}: InteractiveMapProps) {
  const hasCoords =
    latitude !== undefined &&
    longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const center: [number, number] = hasCoords
    ? [latitude!, longitude!]
    : DEFAULT_CENTER;

  const zoom = hasCoords ? DEFAULT_ZOOM + 2 : DEFAULT_ZOOM;

  const position: [number, number] | null = hasCoords
    ? [latitude!, longitude!]
    : null;

  // Stable key that forces MapContainer to re-mount when center
  // changes significantly (avoids stale tile rendering).
  const mapKey = useMemo(() => {
    if (!hasCoords) return "default";
    return `${latitude!.toFixed(4)},${longitude!.toFixed(4)}`;
  }, [hasCoords, latitude, longitude]);

  return (
    <div
      className={`${height} w-full overflow-hidden rounded-md border border-border`}
    >
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents
          onLocationSelect={onLocationSelect}
          center={center}
          readOnly={readOnly}
        />
        {position && <Marker position={position} />}
      </MapContainer>
    </div>
  );
}
