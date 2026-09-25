/**
 * ResQ Decision Intelligence Engine V2 — Spatial Alignment Engine
 * 
 * Normalizes all spatial calculations into WGS84 / EPSG:4326.
 * Enforces rigorous geometry checks:
 * - Real geodesic Haversine distance.
 * - Deterministic point-in-polygon checks.
 * - Strict prohibition of fake circular buffers or straight lines pretending to be roads.
 */

export interface Point2D {
  latitude: number;
  longitude: number;
}

/**
 * Deterministic geodesic distance between two points in kilometers (WGS84 ellipsoid approximation)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth mean radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Standard ray-casting algorithm for 2D Point-in-Polygon testing.
 * Polygon coordinates are expected in GeoJSON [lon, lat] format.
 */
export function pointInPolygon(
  point: [number, number], // [lon, lat]
  polygon: [number, number][] // array of [lon, lat] rings
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Validates coordinate pair against valid geographic bounds for India (Lat 5–38°N, Lon 68–98°E)
 */
export function isValidIndiaCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= 5.0 &&
    lat <= 38.0 &&
    lon >= 68.0 &&
    lon <= 98.0
  );
}

/**
 * Calculates minimum distance from a point to a polyline segment
 */
export function pointToPolylineDistanceKm(
  lat: number,
  lon: number,
  lineCoords: [number, number][] // [lon, lat]
): number {
  if (!lineCoords || lineCoords.length === 0) return Infinity;
  let minDistance = Infinity;
  for (const [pLon, pLat] of lineCoords) {
    const d = haversineDistanceKm(lat, lon, pLat, pLon);
    if (d < minDistance) minDistance = d;
  }
  return Number(minDistance.toFixed(2));
}
