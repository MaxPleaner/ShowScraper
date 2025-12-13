// Map-related helpers shared by map components.

export const CARD_ZOOM_THRESHOLD = 11; // Show cards at zoom 11 and above, only markers below
export const MIN_ZOOM = 11;
export const MAX_ZOOM = 16;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 0.9;

export const BAY_AREA_CENTER = [37.7749, -122.4194]; // San Francisco
export const DEFAULT_ZOOM = 8; // Zoomed out to show North Bay and Santa Cruz
export const BASE_SIZE = 120; // Largest dimension for map cards (scaled)

// Image size scaling utility for map cards.
export function calculateScale(zoom) {
  if (zoom <= MIN_ZOOM) return MIN_SCALE;
  if (zoom >= MAX_ZOOM) return MAX_SCALE;

  const range = MAX_ZOOM - MIN_ZOOM;
  const position = zoom - MIN_ZOOM;
  const scaleRange = MAX_SCALE - MIN_SCALE;

  return MIN_SCALE + (position / range) * scaleRange;
}

// Parse a "lat,lng" string into numeric tuple; returns null on failure.
export function parseLatLng(latlngStr) {
  if (!latlngStr) return null;
  const parts = latlngStr.split(',').map((s) => parseFloat(s.trim()));
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts;
}
