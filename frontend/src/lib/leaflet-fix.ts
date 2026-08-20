/**
 * Fix Leaflet default marker icons broken by webpack/Vite bundling.
 *
 * Leaflet expects marker images at a relative path that doesn't resolve
 * correctly when bundled. This module re-points the icon URLs to the
 * images shipped inside the leaflet package.
 *
 * Import once at app startup (main.tsx).
 */
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon as unknown as string,
  iconRetinaUrl: markerIcon2x as unknown as string,
  shadowUrl: markerShadow as unknown as string,
});
