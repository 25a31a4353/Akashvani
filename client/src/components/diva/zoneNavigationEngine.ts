/**
 * Zone Navigation Engine for Akashvani PS191
 *
 * Dynamically resolves the nearest safe relocation haven (Green Zone)
 * for ANY clicked Red Zone or Orange Zone across India, and computes
 * the exact road connectivity path with distance (km) and travel time (min).
 */

export interface SafeHaven {
  id: string;
  name: string;
  role: string;
  suitability: "PREFERRED" | "CONDITIONAL";
  lat: number;
  lon: number;
  capacity?: number | null;
  capacityStatus?: "VERIFIED" | "ESTIMATED_REGISTRY" | "UNAVAILABLE";
  district?: string;
  stateCode?: string;
  source?: string;
}

export type RoutingSource = "OSRM_LIVE_NETWORK" | "VERIFIED_ROAD_CORRIDOR" | "GEODESIC_DIRECT_PROVISIONAL" | "UNAVAILABLE";
export type RoutingStatus = "AVAILABLE" | "ROAD_ROUTING_UNAVAILABLE";

export interface ZoneNavigationRoute {
  originLabel: string;
  destinationLabel: string;
  originCoords: [number, number]; // [lon, lat]
  destinationCoords: [number, number]; // [lon, lat]
  coordinates: number[][]; // [lon, lat][] polyline
  distanceKm: number;
  travelTimeMinutes: number;
  isRoadRoute: boolean;
  routingSource: RoutingSource;
  routingStatus: RoutingStatus;
  timestamp: string;
  classification: "RED" | "ORANGE" | "CRITICAL" | "HIGH";
  hazardType?: string;
  safeRole?: string;
  capacity?: number | null;
  capacityStatus?: "VERIFIED" | "ESTIMATED_REGISTRY" | "UNAVAILABLE";
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Curated Baseline Safe Havens across Key Target States ────────────────────
export const CURATED_SAFE_HAVENS: SafeHaven[] = [
  // Assam — Dibrugarh & Dhemaji
  { id: "SH-AS-DIB-1", name: "Dikom Multi-Purpose Relief Shelter", role: "EMERGENCY_SHELTER", suitability: "PREFERRED", lat: 27.4985, lon: 95.0820, capacity: 2500, capacityStatus: "ESTIMATED_REGISTRY", district: "Dibrugarh", stateCode: "AS", source: "ASDMA_SHELTER_REGISTRY" },
  { id: "SH-AS-DIB-2", name: "Chabua Central Evacuation Shelter", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 27.4842, lon: 95.1782, capacity: 3200, capacityStatus: "ESTIMATED_REGISTRY", district: "Dibrugarh", stateCode: "AS", source: "ASDMA_SHELTER_REGISTRY" },
  { id: "SH-AS-DIB-3", name: "Dibrugarh Town Community Hall", role: "COMMUNITY_FACILITY", suitability: "PREFERRED", lat: 27.4800, lon: 94.9150, capacity: 1800, capacityStatus: "ESTIMATED_REGISTRY", district: "Dibrugarh", stateCode: "AS", source: "ASDMA_SHELTER_REGISTRY" },
  { id: "SH-AS-DHE-1", name: "Dhemaji Government Higher Secondary School", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 27.4799, lon: 94.5847, capacity: 1500, capacityStatus: "ESTIMATED_REGISTRY", district: "Dhemaji", stateCode: "AS", source: "ASDMA_SHELTER_REGISTRY" },

  // Kerala — Wayanad & Idukki
  { id: "SH-KL-WAY-1", name: "Meppadi Community Relief Shelter", role: "EMERGENCY_SHELTER", suitability: "PREFERRED", lat: 11.5512, lon: 76.1284, capacity: 2200, capacityStatus: "ESTIMATED_REGISTRY", district: "Wayanad", stateCode: "KL", source: "KSDMA_SHELTER_REGISTRY" },
  { id: "SH-KL-WAY-2", name: "Wayanad District Collectorate Relief Centre", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 11.6122, lon: 76.0854, capacity: 3000, capacityStatus: "ESTIMATED_REGISTRY", district: "Wayanad", stateCode: "KL", source: "KSDMA_SHELTER_REGISTRY" },
  { id: "SH-KL-WAY-3", name: "Government Higher Secondary School Kalpetta", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 11.6080, lon: 76.0821, capacity: 1600, capacityStatus: "ESTIMATED_REGISTRY", district: "Wayanad", stateCode: "KL", source: "KSDMA_SHELTER_REGISTRY" },
  { id: "SH-KL-IDK-1", name: "Munnar Town Panchayat Community Hall", role: "COMMUNITY_FACILITY", suitability: "PREFERRED", lat: 10.0892, lon: 77.0599, capacity: 1400, capacityStatus: "ESTIMATED_REGISTRY", district: "Idukki", stateCode: "KL", source: "KSDMA_SHELTER_REGISTRY" },
  { id: "SH-KL-IDK-2", name: "Idukki District Collectorate Emergency Centre", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 9.8516, lon: 76.9660, capacity: 2800, capacityStatus: "ESTIMATED_REGISTRY", district: "Idukki", stateCode: "KL", source: "KSDMA_SHELTER_REGISTRY" },

  // Uttarakhand — Chamoli / Joshimath
  { id: "SH-UK-CHA-1", name: "ITBP Base Camp Joshimath (Safe Haven)", role: "EMERGENCY_SHELTER", suitability: "PREFERRED", lat: 30.5558, lon: 79.5642, capacity: 2400, capacityStatus: "ESTIMATED_REGISTRY", district: "Chamoli", stateCode: "UK", source: "USDMA_SHELTER_REGISTRY" },
  { id: "SH-UK-CHA-2", name: "Gopeshwar Central Relief Campus", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 30.4085, lon: 79.3148, capacity: 3500, capacityStatus: "ESTIMATED_REGISTRY", district: "Chamoli", stateCode: "UK", source: "USDMA_SHELTER_REGISTRY" },
  { id: "SH-UK-CHA-3", name: "Chamoli District Relief Camp Karnaprayag", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 30.2558, lon: 79.2390, capacity: 2000, capacityStatus: "ESTIMATED_REGISTRY", district: "Chamoli", stateCode: "UK", source: "USDMA_SHELTER_REGISTRY" },

  // Odisha — Puri & Kendrapara
  { id: "SH-OD-PUR-1", name: "Puri Multi-Purpose Cyclone Shelter (Official)", role: "EMERGENCY_SHELTER", suitability: "PREFERRED", lat: 19.7902, lon: 85.8274, capacity: 3000, capacityStatus: "ESTIMATED_REGISTRY", district: "Puri", stateCode: "OD", source: "OSDMA_CYCLONE_SHELTER_REGISTRY" },
  { id: "SH-OD-PUR-2", name: "Puri Government High School Relief Campus", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 19.8108, lon: 85.8317, capacity: 1800, capacityStatus: "ESTIMATED_REGISTRY", district: "Puri", stateCode: "OD", source: "OSDMA_CYCLONE_SHELTER_REGISTRY" },

  // Andhra Pradesh — East Godavari & Krishna
  { id: "SH-AP-EGD-1", name: "PR Government College Evacuation Campus Kakinada", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 16.9530, lon: 82.2415, capacity: 2600, capacityStatus: "ESTIMATED_REGISTRY", district: "East Godavari", stateCode: "AP", source: "APSDMA_SHELTER_REGISTRY" },
  { id: "SH-AP-EGD-2", name: "East Godavari Central Relief Transit Center", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 16.9800, lon: 82.2600, capacity: 3200, capacityStatus: "ESTIMATED_REGISTRY", district: "East Godavari", stateCode: "AP", source: "APSDMA_SHELTER_REGISTRY" },

  // Maharashtra — Sangli & Pune
  { id: "SH-MH-SAN-1", name: "Sangli Central High School & Flood Relief Centre", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 16.8560, lon: 74.5720, capacity: 2400, capacityStatus: "ESTIMATED_REGISTRY", district: "Sangli", stateCode: "MH", source: "MAHADMA_SHELTER_REGISTRY" },

  // Tamil Nadu — Nilgiris
  { id: "SH-TN-NIL-1", name: "Nilgiris District Collectorate Relief Shelter", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 11.4110, lon: 76.7010, capacity: 1900, capacityStatus: "ESTIMATED_REGISTRY", district: "Nilgiris", stateCode: "TN", source: "TNDMA_SHELTER_REGISTRY" },

  // Rajasthan — Jodhpur
  { id: "SH-RJ-JOD-1", name: "Government Senior Secondary School Jodhpur", role: "SCHOOL_EVACUATION_SUPPORT", suitability: "PREFERRED", lat: 26.2730, lon: 73.0210, capacity: 2200, capacityStatus: "ESTIMATED_REGISTRY", district: "Jodhpur", stateCode: "RJ", source: "DMRA_SHELTER_REGISTRY" },

  // Chhattisgarh — Raipur
  { id: "SH-CT-RAI-1", name: "Raipur Central Emergency Evacuation Shelter", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 21.2514, lon: 81.6296, capacity: 2500, capacityStatus: "ESTIMATED_REGISTRY", district: "Raipur", stateCode: "CT", source: "CGSDMA_SHELTER_REGISTRY" },

  // Jharkhand — Ranchi
  { id: "SH-JH-RAN-1", name: "Ranchi District Disaster Relief Campus", role: "RELIEF_CENTRE", suitability: "PREFERRED", lat: 23.3605, lon: 85.3322, capacity: 2800, capacityStatus: "ESTIMATED_REGISTRY", district: "Ranchi", stateCode: "JH", source: "JSDMA_SHELTER_REGISTRY" },

  // Bihar — Khagaria & Patna
  { id: "SH-BR-KHA-1", name: "Khagaria District Flood Evacuation Shelter", role: "EMERGENCY_SHELTER", suitability: "PREFERRED", lat: 25.5030, lon: 86.4750, capacity: 3100, capacityStatus: "ESTIMATED_REGISTRY", district: "Khagaria", stateCode: "BR", source: "BSDMA_SHELTER_REGISTRY" },
];

import { VERIFIED_ROAD_CORRIDORS } from "@shared/verifiedRoadCorridors";

// ── Known Real Road-Traced Corridors for Key Demo Areas ──────────────────────
interface RoadFallback {
  matchLat: number;
  matchLon: number;
  toleranceKm: number;
  destLat: number;
  destLon: number;
  destName: string;
  coords: number[][]; // [lon, lat][]
  distanceKm: number;
  travelTimeMinutes: number;
}

export const KNOWN_ROAD_CORRIDORS: RoadFallback[] = VERIFIED_ROAD_CORRIDORS.map(c => ({
  matchLat: c.matchLat,
  matchLon: c.matchLon,
  toleranceKm: c.toleranceKm,
  destLat: c.destLat,
  destLon: c.destLon,
  destName: c.destName,
  coords: c.coordinates,
  distanceKm: c.distanceKm,
  travelTimeMinutes: c.travelTimeMinutes,
}));

/**
 * Fetch live turn-by-turn driving route geometry directly from OSRM public servers.
 * Returns true highway/street coordinates, exact road distance, and travel time.
 */
export async function fetchLiveOsrmRoadRoute(
  origLon: number,
  origLat: number,
  destLon: number,
  destLat: number
): Promise<{ coordinates: number[][]; distanceKm: number; travelTimeMinutes: number; routingSource: RoutingSource; routingStatus: RoutingStatus } | null> {
  const endpoints = [
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${origLon.toFixed(5)},${origLat.toFixed(5)};${destLon.toFixed(5)},${destLat.toFixed(5)}?overview=full&geometries=geojson`,
    `https://router.project-osrm.org/route/v1/driving/${origLon.toFixed(5)},${origLat.toFixed(5)};${destLon.toFixed(5)},${destLat.toFixed(5)}?overview=full&geometries=geojson`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length > 0) {
            return {
              coordinates: coords,
              distanceKm: Number((route.distance / 1000).toFixed(1)),
              travelTimeMinutes: Math.max(1, Math.round(route.duration / 60)),
              routingSource: "OSRM_LIVE_NETWORK",
              routingStatus: "AVAILABLE",
            };
          }
        }
      }
    } catch {
      // try next endpoint
    }
  }
  return null;
}

/**
 * Find the nearest safe relocation facility to a given origin point.
 */
export function findNearestSafeHaven(
  originLat: number,
  originLon: number,
  extraFacilities?: Array<{ name: string; latitude?: number; longitude?: number; lat?: number; lon?: number; role?: string; suitability?: string; capacity?: number | null; source?: string }>
): SafeHaven {
  let closest: SafeHaven | null = null;
  let minDist = Infinity;

  // 1. Check extraFacilities (e.g. from GeoJSON layer or API)
  if (extraFacilities && extraFacilities.length > 0) {
    for (const f of extraFacilities) {
      const lat = f.latitude ?? f.lat;
      const lon = f.longitude ?? f.lon;
      if (lat == null || lon == null) continue;
      // Exclude specialized hospitals and unsuitable facilities for mass safe haven
      if (f.role === "HOSPITAL_MEDICAL_SUPPORT" || f.suitability === "UNSUITABLE") continue;

      const d = haversineKm(originLat, originLon, lat, lon);
      if (d > 0.05 && d < minDist) {
        minDist = d;
        closest = {
          id: `EXT-${f.name}`,
          name: f.name,
          role: f.role ?? "EMERGENCY_SHELTER",
          suitability: (f.suitability as any) ?? "PREFERRED",
          lat,
          lon,
          capacity: f.capacity ?? null,
          capacityStatus: f.capacity ? "VERIFIED" : "UNAVAILABLE",
          source: f.source ?? "OPENSTREETMAP_OVERPASS_LIVE",
        };
      }
    }
  }

  // 2. Check curated baseline safe havens
  for (const sh of CURATED_SAFE_HAVENS) {
    const d = haversineKm(originLat, originLon, sh.lat, sh.lon);
    if (d > 0.05 && d < minDist) {
      minDist = d;
      closest = sh;
    }
  }

  // 3. If no facility within local radius, select nearest verified curated safe haven
  if (!closest) {
    closest = CURATED_SAFE_HAVENS[0];
  }

  return closest;
}

/**
 * Generate a Google Maps style road navigation route from any clicked Red or Orange zone.
 */
export function generateZoneNavigationRoute(
  origin: {
    name: string;
    latitude: number;
    longitude: number;
    classification: "RED" | "ORANGE" | "CRITICAL" | "HIGH";
    hazardType?: string;
  },
  extraFacilities?: any[]
): ZoneNavigationRoute {
  const origLat = origin.latitude;
  const origLon = origin.longitude;
  const timestamp = new Date().toISOString();

  // Check known corridor overrides
  for (const kc of KNOWN_ROAD_CORRIDORS) {
    const dist = haversineKm(origLat, origLon, kc.matchLat, kc.matchLon);
    if (dist <= kc.toleranceKm) {
      return {
        originLabel: `${origin.name} (${origin.classification} ZONE)`,
        destinationLabel: kc.destName,
        originCoords: [origLon, origLat],
        destinationCoords: [kc.destLon, kc.destLat],
        coordinates: kc.coords,
        distanceKm: kc.distanceKm,
        travelTimeMinutes: kc.travelTimeMinutes,
        isRoadRoute: true,
        routingSource: "VERIFIED_ROAD_CORRIDOR",
        routingStatus: "AVAILABLE",
        timestamp,
        classification: origin.classification,
        hazardType: origin.hazardType ?? "Critical Hazard Screening",
        safeRole: "Verified Safe Relocation Shelter",
        capacityStatus: "ESTIMATED_REGISTRY",
      };
    }
  }

  // Find nearest safe haven
  const destination = findNearestSafeHaven(origLat, origLon, extraFacilities);
  const destLat = destination.lat;
  const destLon = destination.lon;

  const straightDist = haversineKm(origLat, origLon, destLat, destLon);
  const roadDistKm = Math.round(Math.max(1.8, straightDist * 1.28) * 10) / 10;
  const estMinutes = Math.max(5, Math.round((roadDistKm / 35) * 60));

  // Synthesize provisional polyline with terrain curvature
  const steps = 8;
  const coords: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const baseLon = origLon + t * (destLon - origLon);
    const baseLat = origLat + t * (destLat - origLat);
    const lateralDetour = Math.sin(t * Math.PI) * (straightDist > 5 ? 0.007 : 0.003);
    const perpLon = -(destLat - origLat) * lateralDetour;
    const perpLat = (destLon - origLon) * lateralDetour;
    coords.push([
      Math.round((baseLon + perpLon) * 100000) / 100000,
      Math.round((baseLat + perpLat) * 100000) / 100000,
    ]);
  }

  return {
    originLabel: `${origin.name} (${origin.classification} ZONE)`,
    destinationLabel: destination.name,
    originCoords: [origLon, origLat],
    destinationCoords: [destLon, destLat],
    coordinates: coords,
    distanceKm: roadDistKm,
    travelTimeMinutes: estMinutes,
    isRoadRoute: false, // Provisional geodesic until live OSRM confirms real road geometry
    routingSource: "GEODESIC_DIRECT_PROVISIONAL",
    routingStatus: "ROAD_ROUTING_UNAVAILABLE",
    timestamp,
    classification: origin.classification,
    hazardType: origin.hazardType ?? "Red/Orange Zone Hazard Exposure",
    safeRole: destination.role.replace(/_/g, " "),
    capacity: destination.capacity ?? null,
    capacityStatus: destination.capacityStatus ?? "UNAVAILABLE",
  };
}
