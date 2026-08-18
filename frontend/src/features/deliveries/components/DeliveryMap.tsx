interface DeliveryMapProps {
  latitude: number;
  longitude: number;
  /** Extra degrees of map padding around the marker (zoom control). */
  padding?: number;
  className?: string;
}

/**
 * Free live map display using the official OpenStreetMap embed (no API
 * key, no paid service). Shows a single marker for the delivery boy's
 * latest reported position. The backend remains the source of truth —
 * this component only renders the lat/lng it is given.
 */
export function DeliveryMap({
  latitude,
  longitude,
  padding = 0.015,
  className,
}: DeliveryMapProps) {
  const minLat = latitude - padding;
  const maxLat = latitude + padding;
  const minLng = longitude - padding;
  const maxLng = longitude + padding;

  const src =
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${minLng},${minLat},${maxLng},${maxLat}` +
    `&layer=mapnik&marker=${latitude},${longitude}`;

  return (
    <iframe
      title="Delivery location on OpenStreetMap"
      src={src}
      loading="lazy"
      className={
        className ??
        "h-64 w-full rounded-lg border border-border bg-muted"
      }
    />
  );
}
