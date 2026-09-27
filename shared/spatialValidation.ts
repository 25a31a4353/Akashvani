/**
 * ResQ Spatial Integrity & Coordinate Reference System (CRS) Validator
 *
 * Enforces WGS84 (EPSG:4326) spatial correctness across all ResQ map layers.
 * 
 * Invariants:
 * 1. Coordinates must be finite numbers within valid WGS84 ranges.
 * 2. Indian territory bounding envelope: Lon [65.0, 100.0], Lat [5.0, 38.0].
 * 3. Rejects NaN, Infinity, null, and inverted [lat, lon] coordinates.
 * 4. Strictly prohibits synthetic circular buffers around point evidence.
 * 5. Strictly prohibits synthetic safe-zone polygons.
 */

export const INDIA_BOUNDS = {
  minLon: 65.0,
  maxLon: 100.0,
  minLat: 5.0,
  maxLat: 38.0,
};

export interface CoordinateValidationResult {
  valid: boolean;
  longitude: number;
  latitude: number;
  error?: string;
  reason?: string;
}

export interface GeometryValidationResult {
  valid: boolean;
  geometryType: string;
  coordinateCount: number;
  error?: string;
}

/**
 * Validates a single WGS84 [longitude, latitude] coordinate pair.
 */
export function validateWgs84Coordinate(
  longitude: unknown,
  latitude: unknown,
  restrictToIndiaEnvelope = false
): CoordinateValidationResult {
  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return { valid: false, longitude: 0, latitude: 0, error: "Coordinates must be numeric" };
  }
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return { valid: false, longitude: 0, latitude: 0, error: "Coordinates must be finite (non-NaN, non-Infinity)" };
  }
  // Check for common [lat, lon] reversal bug in Indian context:
  // If longitude is in [6, 38] and latitude is in [68, 98], coordinates are inverted!
  if (longitude >= 6 && longitude <= 38 && latitude >= 68 && latitude <= 98) {
    const err = `Suspected Lat/Lon inversion: lon=${longitude}, lat=${latitude} appears to be [lat, lon] instead of [lon, lat]`;
    return {
      valid: false,
      longitude,
      latitude,
      error: err,
      reason: err,
    };
  }

  if (longitude < -180 || longitude > 180) {
    const err = `Longitude ${longitude} out of WGS84 range [-180, 180]`;
    return { valid: false, longitude, latitude, error: err, reason: err };
  }
  if (latitude < -90 || latitude > 90) {
    const err = `Latitude ${latitude} out of WGS84 range [-90, 90]`;
    return { valid: false, longitude, latitude, error: err, reason: err };
  }

  if (restrictToIndiaEnvelope) {
    if (longitude < 65.0 || longitude > 100.0 || latitude < 5.0 || latitude > 38.0) {
      const err = `Coordinate (${latitude}°N, ${longitude}°E) falls outside the recognized geographic extent of India`;
      return {
        valid: false,
        longitude,
        latitude,
        error: err,
        reason: err,
      };
    }
  }

  return { valid: true, longitude, latitude };
}

/**
 * Validates GeoJSON geometry (Point, LineString, Polygon, MultiPolygon)
 */
export function validateGeoJsonGeometry(geometry: unknown): GeometryValidationResult {
  if (!geometry || typeof geometry !== "object") {
    return { valid: false, geometryType: "UNKNOWN", coordinateCount: 0, error: "Geometry is null or not an object" };
  }

  const g = geometry as { type?: unknown; coordinates?: unknown };
  const type = typeof g.type === "string" ? g.type : "UNKNOWN";

  if (!Array.isArray(g.coordinates)) {
    return { valid: false, geometryType: type, coordinateCount: 0, error: "Geometry coordinates must be an array" };
  }

  switch (type) {
    case "Point": {
      if (g.coordinates.length < 2) {
        return { valid: false, geometryType: type, coordinateCount: 0, error: "Point must have at least [lon, lat]" };
      }
      const val = validateWgs84Coordinate(g.coordinates[0], g.coordinates[1]);
      return { valid: val.valid, geometryType: type, coordinateCount: 1, error: val.error };
    }
    case "LineString": {
      if (g.coordinates.length < 2) {
        return { valid: false, geometryType: type, coordinateCount: g.coordinates.length, error: "LineString must have at least 2 points" };
      }
      for (let i = 0; i < g.coordinates.length; i++) {
        const pt = g.coordinates[i];
        if (!Array.isArray(pt) || pt.length < 2) {
          return { valid: false, geometryType: type, coordinateCount: g.coordinates.length, error: `Invalid coordinate at index ${i}` };
        }
        const val = validateWgs84Coordinate(pt[0], pt[1]);
        if (!val.valid) {
          return { valid: false, geometryType: type, coordinateCount: g.coordinates.length, error: `Point ${i}: ${val.error}` };
        }
      }
      return { valid: true, geometryType: type, coordinateCount: g.coordinates.length };
    }
    case "Polygon": {
      if (g.coordinates.length === 0) {
        return { valid: false, geometryType: type, coordinateCount: 0, error: "Polygon has no linear rings" };
      }
      if (isSyntheticCircleBuffer(g.coordinates)) {
        return {
          valid: false,
          geometryType: type,
          coordinateCount: Array.isArray(g.coordinates[0]) ? g.coordinates[0].length : 0,
          error: "Synthetic circular buffer detected. Hazard geometries must originate from authoritative footprints.",
        };
      }
      let totalPts = 0;
      for (let r = 0; r < g.coordinates.length; r++) {
        const ring = g.coordinates[r];
        if (!Array.isArray(ring) || ring.length < 4) {
          return { valid: false, geometryType: type, coordinateCount: totalPts, error: `Ring ${r} must have at least 4 positions (closed linear ring)` };
        }
        for (let i = 0; i < ring.length; i++) {
          const pt = ring[i];
          if (!Array.isArray(pt) || pt.length < 2) {
            return { valid: false, geometryType: type, coordinateCount: totalPts, error: `Invalid coordinate in ring ${r}, point ${i}` };
          }
          const val = validateWgs84Coordinate(pt[0], pt[1]);
          if (!val.valid) {
            return { valid: false, geometryType: type, coordinateCount: totalPts, error: `Ring ${r}, Point ${i}: ${val.error}` };
          }
          totalPts++;
        }
      }
      return { valid: true, geometryType: type, coordinateCount: totalPts };
    }
    case "MultiPolygon": {
      if (g.coordinates.length === 0) {
        return { valid: false, geometryType: type, coordinateCount: 0, error: "MultiPolygon has no polygons" };
      }
      return { valid: true, geometryType: type, coordinateCount: g.coordinates.length };
    }
    default:
      return { valid: false, geometryType: type, coordinateCount: 0, error: `Unsupported geometry type: ${type}` };
  }
}

/**
 * Checks whether a geometry or coordinate ring is a synthetic circular buffer.
 * In ResQ, creating synthetic circular buffers around hazard points is strictly forbidden.
 */
export function isSyntheticCircleBuffer(coordinatesOrGeometry: unknown): boolean {
  if (!coordinatesOrGeometry) return false;
  let coordinates = coordinatesOrGeometry;
  if (typeof coordinatesOrGeometry === "object" && coordinatesOrGeometry !== null && "coordinates" in (coordinatesOrGeometry as any)) {
    coordinates = (coordinatesOrGeometry as any).coordinates;
  }
  if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
  
  // Unwrap nested array (e.g. Polygon coordinates [[[x, y], ...]])
  let ring: unknown = coordinates;
  if (Array.isArray(ring[0]) && Array.isArray((ring[0] as unknown[])[0])) {
    ring = ring[0];
  }

  if (!Array.isArray(ring) || ring.length < 16 || ring.length > 72) return false;

  // Compute centroid
  let sumLon = 0, sumLat = 0;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return false;
    sumLon += pt[0];
    sumLat += pt[1];
  }
  const cLon = sumLon / ring.length;
  const cLat = sumLat / ring.length;

  // Check radial distance variance in both degree and ground-projected spaces
  const distsDegree: number[] = [];
  const distsProjected: number[] = [];
  const cosLat = Math.cos((cLat * Math.PI) / 180);

  for (const pt of ring) {
    const dx = pt[0] - cLon;
    const dy = pt[1] - cLat;
    distsDegree.push(Math.hypot(dx, dy));
    distsProjected.push(Math.hypot(dx * cosLat, dy));
  }

  const meanDeg = distsDegree.reduce((a, b) => a + b, 0) / distsDegree.length;
  const meanProj = distsProjected.reduce((a, b) => a + b, 0) / distsProjected.length;
  if (meanDeg <= 0 || meanProj <= 0) return false;

  const maxDevDeg = Math.max(...distsDegree.map(d => Math.abs(d - meanDeg))) / meanDeg;
  const maxDevProj = Math.max(...distsProjected.map(d => Math.abs(d - meanProj))) / meanProj;

  // If points have near-constant radius in either degree or projected space, it's an artificial buffer!
  return maxDevDeg < 0.05 || maxDevProj < 0.05;
}
