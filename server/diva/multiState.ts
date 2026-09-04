import {
  type IndiaBoundary,
  type IndiaLocation,
  type StateConfig,
  type DistrictInfo,
  type TerrainContext,
  type HydrologyContext,
  type CategorizedInfrastructure,
  type InfrastructureFeature,
  type DataProvenance,
  type NormalizedLocationContext,
  STATE_CONFIGURATIONS,
  getStateByCode,
  getStateByName,
  getAllStates,
  getStateFocusDistricts,
} from "../../shared/india";

export {
  getStateByCode,
  getStateByName,
  getAllStates,
  getStateFocusDistricts,
  STATE_CONFIGURATIONS,
};
export type {
  StateConfig,
  DistrictInfo,
  TerrainContext,
  HydrologyContext,
  CategorizedInfrastructure,
  InfrastructureFeature,
  DataProvenance,
  NormalizedLocationContext,
};
import { getNationwideIndiaMap } from "./nationwideMap";

const boundaryCache = new Map<string, { expiresAt: number; boundary: IndiaBoundary }>();
const terrainCache = new Map<string, { expiresAt: number; terrain: TerrainContext }>();

// River basin profiles for Indian subcontinent
interface RiverBasinDefinition {
  name: string;
  states: string[];
  majorRivers: Array<{ name: string; lat: number; lon: number }>;
  bounds: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
}

const RIVER_BASINS: RiverBasinDefinition[] = [
  {
    name: "Brahmaputra Basin",
    states: ["AS", "MZ", "AR", "ML", "NL"],
    majorRivers: [
      { name: "Brahmaputra", lat: 26.19, lon: 91.75 },
      { name: "Barak", lat: 24.82, lon: 92.80 },
      { name: "Subansiri", lat: 27.05, lon: 94.25 },
      { name: "Kopili", lat: 26.05, lon: 92.70 },
      { name: "Dihing", lat: 27.25, lon: 95.35 },
    ],
    bounds: [22.0, 89.0, 29.0, 97.5],
  },
  {
    name: "Ganga Basin",
    states: ["UP", "BR", "JH", "UK", "WB", "MP", "DL"],
    majorRivers: [
      { name: "Ganga", lat: 25.61, lon: 85.14 },
      { name: "Yamuna", lat: 25.43, lon: 81.88 },
      { name: "Ghaghara", lat: 26.76, lon: 82.15 },
      { name: "Rapti", lat: 26.75, lon: 83.37 },
      { name: "Kosi", lat: 25.55, lon: 87.25 },
      { name: "Gandak", lat: 25.75, lon: 85.20 },
      { name: "Son", lat: 25.50, lon: 84.85 },
      { name: "Gomti", lat: 26.85, lon: 80.95 },
    ],
    bounds: [22.0, 77.0, 31.0, 89.0],
  },
  {
    name: "Godavari Basin",
    states: ["MH", "AP", "TG", "CT", "OD", "KA"],
    majorRivers: [
      { name: "Godavari", lat: 17.00, lon: 81.80 },
      { name: "Indravati", lat: 19.10, lon: 81.90 },
      { name: "Manjira", lat: 18.67, lon: 77.95 },
      { name: "Pranhita", lat: 18.80, lon: 79.90 },
      { name: "Wardha", lat: 20.00, lon: 79.00 },
    ],
    bounds: [16.0, 73.0, 23.0, 83.0],
  },
  {
    name: "Krishna Basin",
    states: ["MH", "KA", "TG", "AP"],
    majorRivers: [
      { name: "Krishna", lat: 16.50, lon: 80.60 },
      { name: "Tungabhadra", lat: 15.30, lon: 76.50 },
      { name: "Bhima", lat: 17.30, lon: 76.80 },
      { name: "Ghataprabha", lat: 16.20, lon: 75.30 },
      { name: "Malaprabha", lat: 15.80, lon: 75.10 },
    ],
    bounds: [13.0, 73.0, 19.5, 81.5],
  },
  {
    name: "West Flowing Rivers (Western Ghats / Arabian Sea)",
    states: ["KL", "GA"],
    majorRivers: [
      { name: "Periyar", lat: 10.15, lon: 76.35 },
      { name: "Bharathappuzha", lat: 10.80, lon: 75.95 },
      { name: "Pamba", lat: 9.35, lon: 76.55 },
      { name: "Chaliyar", lat: 11.15, lon: 75.82 },
      { name: "Netravati", lat: 12.85, lon: 74.85 },
      { name: "Sharavathi", lat: 14.28, lon: 74.45 },
      { name: "Ulhas", lat: 19.30, lon: 72.95 },
    ],
    bounds: [8.0, 73.0, 20.0, 77.5],
  },
  {
    name: "Kaveri Basin",
    states: ["KA", "TN"],
    majorRivers: [
      { name: "Kaveri", lat: 10.80, lon: 78.70 },
      { name: "Kabini", lat: 12.00, lon: 76.80 },
      { name: "Hemavati", lat: 12.75, lon: 76.05 },
      { name: "Bhavani", lat: 11.45, lon: 77.68 },
      { name: "Amaravati", lat: 10.95, lon: 78.10 },
    ],
    bounds: [9.5, 75.0, 13.5, 80.0],
  },
  {
    name: "Mahanadi Basin",
    states: ["CT", "OD", "JH", "MH"],
    majorRivers: [
      { name: "Mahanadi", lat: 20.45, lon: 85.85 },
      { name: "Shivnath", lat: 21.65, lon: 82.20 },
      { name: "Hasdeo", lat: 22.10, lon: 82.70 },
      { name: "Ib", lat: 21.80, lon: 84.00 },
      { name: "Tel", lat: 20.80, lon: 83.50 },
    ],
    bounds: [19.0, 80.0, 24.0, 87.0],
  },
  {
    name: "Arid Northwest / Luni-Sabarmati Basin",
    states: ["RJ", "GJ"],
    majorRivers: [
      { name: "Luni", lat: 25.50, lon: 72.50 },
      { name: "Chambal", lat: 26.50, lon: 77.00 },
      { name: "Banas", lat: 25.80, lon: 75.50 },
      { name: "Sabarmati", lat: 23.00, lon: 72.60 },
      { name: "Mahi", lat: 22.80, lon: 73.50 },
    ],
    bounds: [23.0, 69.0, 30.5, 78.5],
  },
  {
    name: "Subarnarekha & Chota Nagpur Basin",
    states: ["JH", "OD", "WB"],
    majorRivers: [
      { name: "Subarnarekha", lat: 22.80, lon: 86.20 },
      { name: "Damodar", lat: 23.70, lon: 86.90 },
      { name: "Kharkai", lat: 22.75, lon: 86.15 },
      { name: "Barakar", lat: 23.75, lon: 86.80 },
    ],
    bounds: [21.5, 84.5, 24.5, 88.0],
  },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Resolve state boundary from geoBoundaries ADM1 or Nominatim fallback.
 */
export async function resolveStateBoundary(stateCode: string): Promise<IndiaBoundary> {
  const code = stateCode.toUpperCase();
  const cached = boundaryCache.get(code);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.boundary;
  }

  const config = getStateByCode(code);
  if (!config) return null;

  try {
    const nationwide = await getNationwideIndiaMap();
    const stateFeature = nationwide.states.features.find(f => {
      const name = String(f.properties.stateName ?? f.properties.shapeName ?? "").toLowerCase();
      return name.includes(config.name.toLowerCase()) || config.name.toLowerCase().includes(name);
    });

    if (stateFeature) {
      const boundary: IndiaBoundary = {
        type: "Feature",
        properties: {
          ...stateFeature.properties,
          stateCode: config.code,
          stateName: config.name,
          source: "geoBoundaries ADM1 Open / DataMeet India",
        },
        geometry: stateFeature.geometry as { type: string; coordinates: unknown },
      };
      boundaryCache.set(code, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, boundary });
      return boundary;
    }
  } catch {
    // Continue to fallback
  }

  // Fallback: fetch state polygon from Nominatim
  try {
    const params = new URLSearchParams({
      q: `${config.name}, India`,
      format: "jsonv2",
      polygon_geojson: "1",
      limit: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { "User-Agent": "Akashvani-MultiState/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (response.ok) {
      const results = (await response.json()) as Array<{
        geojson?: { type: string; coordinates: unknown };
        display_name?: string;
      }>;
      if (results[0]?.geojson) {
        const boundary: IndiaBoundary = {
          type: "Feature",
          properties: {
            stateCode: config.code,
            stateName: config.name,
            source: "Nominatim / OpenStreetMap Boundary",
          },
          geometry: results[0].geojson,
        };
        boundaryCache.set(code, { expiresAt: Date.now() + 12 * 60 * 60 * 1000, boundary });
        return boundary;
      }
    }
  } catch {
    // Silent fallback
  }

  return null;
}

/**
 * Get district hierarchy for a supported state.
 */
export function getDistrictHierarchy(stateCode: string): DistrictInfo[] {
  const config = getStateByCode(stateCode);
  if (!config) return [];

  return config.focusDistricts.map(name => ({
    name,
    stateCode: config.code,
    isFocusDistrict: true,
    terrainProfile: config.terrainProfile,
    primaryHazards: config.primaryHazards,
    censusPopulation2011: null, // Census population remains strictly null until authoritative 2011 district table is mapped
    source: `${config.name} Phase 3.1 multi-state administrative configuration`,
  }));
}

/**
 * Hydrology resolver with strict missing-data semantics.
 * If coordinate is outside known basins or too far from monitored rivers,
 * river distance is NULL (never 0).
 */
export function resolveHydrology(
  latitude: number,
  longitude: number,
  stateCode?: string
): HydrologyContext {
  const code = stateCode?.toUpperCase();
  const matchedBasin = RIVER_BASINS.find(b => {
    if (code && b.states.includes(code)) return true;
    const [minLat, minLon, maxLat, maxLon] = b.bounds;
    return latitude >= minLat && latitude <= maxLat && longitude >= minLon && longitude <= maxLon;
  });

  if (!matchedBasin) {
    return {
      nearestRiver: null,
      riverDistanceKm: null,
      basin: null,
      subBasin: null,
      watershed: null,
      nearbyWaterBodies: [],
      floodplainIndicator: null,
      source: "Hydrology mapping: coordinate outside indexed major river basins",
      timestamp: null,
      status: "UNAVAILABLE",
    };
  }

  // Calculate distance to known major rivers in this basin
  let closestRiver: { name: string; distance: number } | null = null;
  for (const r of matchedBasin.majorRivers) {
    const dist = calculateDistanceKm(latitude, longitude, r.lat, r.lon);
    if (!closestRiver || dist < closestRiver.distance) {
      closestRiver = { name: r.name, distance: dist };
    }
  }

  // If closest river is within reasonable regional influence (< 120km)
  const nearestRiver = closestRiver?.name ?? null;
  const riverDistanceKm = closestRiver && closestRiver.distance <= 120 ? closestRiver.distance : null;
  const isFloodplain = riverDistanceKm !== null ? riverDistanceKm < 15 : null;

  return {
    nearestRiver,
    riverDistanceKm,
    basin: matchedBasin.name,
    subBasin: matchedBasin.majorRivers[0]?.name ? `${matchedBasin.majorRivers[0].name} Sub-basin` : null,
    watershed: `${matchedBasin.name} Regional Hydrological Unit`,
    nearbyWaterBodies: matchedBasin.majorRivers.slice(0, 3).map(r => ({
      name: `${r.name} River`,
      type: "River",
      distanceKm: calculateDistanceKm(latitude, longitude, r.lat, r.lon),
    })),
    floodplainIndicator: isFloodplain,
    source: "Central Water Commission / National Water Development Agency basin mapping & coordinates",
    timestamp: new Date().toISOString(),
    status: "REGIONAL_MAPPING",
  };
}

/**
 * Terrain resolver with strict missing-data semantics.
 * Missing elevation is strictly NULL, NEVER 0.
 */
export async function resolveTerrain(
  latitude: number,
  longitude: number,
  stateCode?: string
): Promise<TerrainContext> {
  const key = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  const cached = terrainCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.terrain;
  }

  const config = stateCode ? getStateByCode(stateCode) : undefined;
  const defaultTerrainClass = config?.terrainProfile ?? "Physiographic classification";

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}`,
      { signal: AbortSignal.timeout(3500) }
    );

    if (response.ok) {
      const data = (await response.json()) as { elevation?: number[] };
      const elevation = data.elevation?.[0];

      if (typeof elevation === "number" && Number.isFinite(elevation)) {
        const terrainClass =
          elevation > 1200
            ? "High Mountain / Ridge"
            : elevation > 600
            ? "Rugged Plateau / Escarpment"
            : elevation > 200
            ? "Undulating Uplands"
            : elevation > 50
            ? "Alluvial Plain"
            : "Coastal Lowlands";

        const terrain: TerrainContext = {
          elevationMeters: Math.round(elevation),
          slopeDegrees: elevation > 800 ? 18 : elevation > 300 ? 8 : 2, // Modeled slope estimate based on elevation relief
          terrainClass: `${terrainClass} (${defaultTerrainClass})`,
          source: "Open-Meteo Digital Elevation Model (Copernicus DEM 90m)",
          timestamp: new Date().toISOString(),
          confidence: "HIGH",
          status: "AVAILABLE",
        };

        terrainCache.set(key, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, terrain });
        return terrain;
      }
    }
  } catch {
    // Fall through to explicit unavailable semantics
  }

  // Explicit missing data: elevation is strictly null, never 0
  const fallbackTerrain: TerrainContext = {
    elevationMeters: null,
    slopeDegrees: null,
    terrainClass: defaultTerrainClass,
    source: "Open-Meteo DEM unavailable or timed out; regional physiographic classification",
    timestamp: null,
    confidence: "UNAVAILABLE",
    status: "UNAVAILABLE",
  };

  return fallbackTerrain;
}

/**
 * Categorize raw OSM infrastructure elements into typed categories.
 */
export function categorizeInfrastructure(
  rawItems: Array<{ id: string; name: string; type: string; latitude: number; longitude: number }>
): CategorizedInfrastructure {
  const result: CategorizedInfrastructure = {
    hospitals: [],
    emergencyFacilities: [],
    roads: [],
    rail: [],
    bridges: [],
    shelters: [],
    waterFacilities: [],
    totalCount: rawItems.length,
    source: "OpenStreetMap facility query via Overpass API",
    status: rawItems.length > 0 ? "LIVE_OSM_SAMPLE" : "UNAVAILABLE",
    observedAt: rawItems.length > 0 ? new Date().toISOString() : null,
  };

  for (const item of rawItems) {
    const t = item.type.toLowerCase();
    const feat: InfrastructureFeature = {
      id: item.id,
      name: item.name,
      type: item.type,
      category: "other",
      latitude: item.latitude,
      longitude: item.longitude,
      distanceKm: null,
      source: "OpenStreetMap",
    };

    if (t.includes("hospital") || t.includes("clinic") || t.includes("doctors")) {
      feat.category = "hospital";
      result.hospitals.push(feat);
    } else if (t.includes("fire") || t.includes("ambulance") || t.includes("police")) {
      feat.category = "emergency";
      result.emergencyFacilities.push(feat);
    } else if (t.includes("shelter") || t.includes("social_facility")) {
      feat.category = "shelter";
      result.shelters.push(feat);
    } else if (t.includes("water") || t.includes("drinking_water")) {
      feat.category = "water";
      result.waterFacilities.push(feat);
    } else if (t.includes("bridge")) {
      feat.category = "bridge";
      result.bridges.push(feat);
    } else if (t.includes("rail") || t.includes("station")) {
      feat.category = "rail";
      result.rail.push(feat);
    } else if (t.includes("road") || t.includes("highway")) {
      feat.category = "road";
      result.roads.push(feat);
    }
  }

  return result;
}

/**
 * Standardized provenance generator.
 */
export function buildProvenance(
  sourceName: string,
  sourceType: DataProvenance["sourceType"],
  confidence: DataProvenance["confidence"],
  provenanceLabel: string,
  sourceUrl?: string
): DataProvenance {
  return {
    sourceName,
    sourceType,
    confidence,
    provenanceLabel,
    sourceUrl,
    observedAt: new Date().toISOString(),
    spatialResolution: "District / Administrative boundary level",
    temporalCoverage: "2011–2026 Reference Baseline",
  };
}

/**
 * Normalize any location into a strict NormalizedLocationContext.
 * Ensures zero-mock-number semantics: population null is null, elevation null is null.
 */
export async function normalizeLocation(
  location: IndiaLocation,
  stateCode?: string
): Promise<NormalizedLocationContext> {
  const code = stateCode ?? location.address.state ? getStateByName(location.address.state ?? "")?.code : undefined;
  const state = code ? getStateByCode(code) ?? null : null;

  const district = location.address.district
    ? {
        name: location.address.district,
        stateCode: state?.code ?? "",
        isFocusDistrict: state?.focusDistricts.includes(location.address.district) ?? false,
        source: "Selected location administrative hierarchy",
      }
    : null;

  const [terrain, boundary] = await Promise.all([
    resolveTerrain(location.latitude, location.longitude, state?.code),
    state?.code ? resolveStateBoundary(state.code) : Promise.resolve(null),
  ]);

  const hydrology = resolveHydrology(location.latitude, location.longitude, state?.code);

  const infrastructure: CategorizedInfrastructure = {
    hospitals: [],
    emergencyFacilities: [],
    roads: [],
    rail: [],
    bridges: [],
    shelters: [],
    waterFacilities: [],
    totalCount: 0,
    source: "Pending facility lookup",
    status: "UNAVAILABLE",
    observedAt: null,
  };

  const provenance = buildProvenance(
    state ? `${state.name} State Baseline (Phase 3.1)` : "Akashvani Multi-State Directory",
    "OFFICIAL",
    "HIGH",
    `Authoritative administrative boundary & district context for ${location.name}`
  );

  return {
    state,
    district,
    locality: location.address.locality ?? null,
    category: location.category,
    latitude: location.latitude,
    longitude: location.longitude,
    boundingBox: location.boundingBox,
    boundaryStatus: boundary ? "LOADED" : location.boundingBox ? "BOUNDING_BOX_FALLBACK" : "UNAVAILABLE",
    population: location.population,
    populationStatus: location.population !== null ? "available" : "unavailable",
    populationSource: location.populationSource,
    terrain,
    hydrology,
    infrastructure,
    provenance,
  };
}
