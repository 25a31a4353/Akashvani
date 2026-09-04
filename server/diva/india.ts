import {
  andhraPradeshDefault,
  type IndiaBoundary,
  type IndiaLocation,
  type IndiaLocationContext,
  getStateByName,
  getStateByCode,
  type DistrictInfo,
} from "../../shared/india";
import { getEnvironmentalContext } from "./environment";
import {
  resolveTerrain,
  resolveHydrology,
  categorizeInfrastructure,
  resolveStateBoundary,
  buildProvenance,
} from "./multiState";
import { buildMultiHazardProfile } from "./hazards/engine";

type NominatimResult = { place_id: number; display_name: string; lat: string; lon: string; type?: string; addresstype?: string; class?: string; boundingbox?: string[]; geojson?: { type: string; coordinates: unknown }; address?: Record<string, string> };
type OpenMeteoResult = { id: number; name: string; latitude: number; longitude: number; population?: number; admin1?: string; admin2?: string; admin3?: string; admin4?: string; feature_code?: string };

const cache = new Map<string, { expiresAt: number; values: IndiaLocation[] }>();
const infrastructureCache = new Map<string, { expiresAt: number; value: IndiaLocationContext["infrastructure"] }>();
const header = { "User-Agent": "DIVA-PS191-location-context/1.0 (educational decision-support application)" };
const category = (value?: string): IndiaLocation["category"] => value === "state" || value === "administrative" ? "State" : value === "district" || value === "county" ? "District" : value === "city" || value === "town" ? "City" : value === "village" || value === "suburb" || value === "neighbourhood" ? "Locality" : "Place";
const toBox = (box?: string[]): IndiaLocation["boundingBox"] => box?.length === 4 ? [Number(box[0]), Number(box[2]), Number(box[1]), Number(box[3])] : null;
const toBoundary = (item: NominatimResult): IndiaBoundary => item.geojson ? { type: "Feature", properties: { source: "Nominatim / OpenStreetMap", displayName: item.display_name }, geometry: item.geojson } : null;
const idFor = (name: string, latitude: number, longitude: number) => `india-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${latitude.toFixed(3)}-${longitude.toFixed(3)}`;

async function resolveWithin<T>(operation: Promise<T>, milliseconds: number, fallback: T): Promise<T> {
  return Promise.race([operation.catch(() => fallback), new Promise<T>(resolve => setTimeout(() => resolve(fallback), milliseconds))]);
}

async function parseProviderJson<T>(response: Response, fallback: T): Promise<T> {
  if (!response.ok) return fallback;
  try { return JSON.parse(await response.text()) as T; } catch { return fallback; }
}

function fromNominatim(item: NominatimResult): IndiaLocation {
  const address = item.address ?? {};
  const latitude = Number(item.lat); const longitude = Number(item.lon);
  const district = address.state_district ?? address.county ?? address.district;
  const localCategory = district && !address.city && !address.town && !address.village && !address.suburb && !address.neighbourhood ? "District" : category(item.addresstype ?? item.type);
  return { id: idFor(item.display_name, latitude, longitude), name: district ?? address.city ?? address.town ?? address.village ?? address.suburb ?? address.neighbourhood ?? address.state ?? item.display_name.split(",")[0] ?? "Selected location", displayName: item.display_name, category: localCategory, latitude, longitude, population: null, populationSource: "No population value is supplied by Nominatim for this selected place.", boundingBox: toBox(item.boundingbox), boundary: toBoundary(item), address: { state: address.state, district, city: address.city ?? address.town, locality: address.village ?? address.suburb ?? address.neighbourhood }, source: "Nominatim / OpenStreetMap search and boundary context" };
}

function fromOpenMeteo(item: OpenMeteoResult): IndiaLocation {
  const hierarchy = [item.admin4, item.admin3, item.admin2, item.admin1, "India"].filter(Boolean).join(", ");
  return { id: idFor(item.name, item.latitude, item.longitude), name: item.name, displayName: `${item.name}${hierarchy ? `, ${hierarchy}` : ", India"}`, category: item.feature_code?.startsWith("PPL") ? "Locality" : item.admin2 ? "District" : item.admin1 ? "State" : "Place", latitude: item.latitude, longitude: item.longitude, population: typeof item.population === "number" ? item.population : null, populationSource: typeof item.population === "number" ? "Open-Meteo Geocoding API / GeoNames" : "Open-Meteo Geocoding API did not return a population value for this place.", boundingBox: null, boundary: null, address: { state: item.admin1, district: item.admin2, locality: item.admin3 ?? item.admin4 }, source: "Open-Meteo Geocoding API / GeoNames" };
}

export async function searchIndiaLocations(query: string): Promise<IndiaLocation[]> {
  const normalized = query.trim(); if (normalized.length < 2) return [];
  const key = normalized.toLowerCase(); const cached = cache.get(key); if (cached && cached.expiresAt > Date.now()) return cached.values;
  const params = new URLSearchParams({ q: `${normalized}, India`, format: "jsonv2", addressdetails: "1", polygon_geojson: "1", countrycodes: "in", limit: "6" });
  const geo = new URLSearchParams({ name: normalized, countryCode: "IN", count: "6", language: "en" });
  const [nominatim, openMeteo] = await Promise.allSettled([
    fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: header, signal: AbortSignal.timeout(8000) }).then(async result => {
      const parsed = await parseProviderJson<unknown>(result, []);
      return Array.isArray(parsed) ? parsed as NominatimResult[] : [];
    }),
    fetch(`https://geocoding-api.open-meteo.com/v1/search?${geo.toString()}`, { signal: AbortSignal.timeout(8000) }).then(async result => {
      const parsed = await parseProviderJson<unknown>(result, { results: [] });
      return parsed && typeof parsed === "object" && Array.isArray((parsed as { results?: unknown }).results) ? parsed as { results: OpenMeteoResult[] } : { results: [] };
    }),
  ]);
  const result: IndiaLocation[] = [];
  if (nominatim.status === "fulfilled") result.push(...nominatim.value.filter(item => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))).map(fromNominatim));
  if (openMeteo.status === "fulfilled") result.push(...(openMeteo.value.results ?? []).map(fromOpenMeteo));
  const values = result.reduce<IndiaLocation[]>((output, item) => {
    const existingIndex = output.findIndex(other => Math.abs(other.latitude - item.latitude) < .015 && Math.abs(other.longitude - item.longitude) < .015);
    if (existingIndex < 0) { output.push(item); return output; }
    const existing = output[existingIndex];
    if (existing && existing.population === null && item.population !== null) output[existingIndex] = { ...existing, population: item.population, populationSource: item.populationSource, source: `${existing.source}; population: ${item.source}` };
    return output;
  }, []).slice(0, 8);
  cache.set(key, { expiresAt: Date.now() + 15 * 60 * 1000, values });
  return values;
}

async function enrichBoundary(location: IndiaLocation) {
  if (location.boundary) return location;
  try {
    const matches = await searchIndiaLocations(location.name);
    const boundaryMatch = matches.find(item => item.boundary && Math.abs(item.latitude - location.latitude) < 1.2 && Math.abs(item.longitude - location.longitude) < 1.2);
    return boundaryMatch ? { ...location, boundary: boundaryMatch.boundary, boundingBox: boundaryMatch.boundingBox ?? location.boundingBox, source: `${location.source}; ${boundaryMatch.source}` } : location;
  } catch {
    return location;
  }
}

type OverpassElement = { type?: string; id?: number; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string> };

async function getNearbyInfrastructure(location: IndiaLocation): Promise<IndiaLocationContext["infrastructure"]> {
  const key = `${location.latitude.toFixed(2)}:${location.longitude.toFixed(2)}`;
  const cached = infrastructureCache.get(key); if (cached && cached.expiresAt > Date.now()) return cached.value;
  const unavailable: IndiaLocationContext["infrastructure"] = { items: [], source: "OpenStreetMap facility lookup did not return before the response deadline.", status: "UNAVAILABLE", observedAt: null };
  const radius = location.category === "Locality" ? 5_000 : location.category === "City" ? 12_000 : 20_000;
  const query = `[out:json][timeout:8];(nwr(around:${radius},${location.latitude},${location.longitude})["amenity"~"hospital|clinic|shelter|fire_station"];nwr(around:${radius},${location.latitude},${location.longitude})["emergency"~"ambulance_station|fire_station"];);out center 60;`;
  const response = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", headers: { "Content-Type": "text/plain", ...header }, body: query, signal: AbortSignal.timeout(7_500) });
  const parsed = await parseProviderJson<{ elements?: unknown }>(response, {});
  const elements = Array.isArray(parsed.elements) ? parsed.elements as OverpassElement[] : [];
  const items = elements.map((element, index) => {
    const latitude = element.lat ?? element.center?.lat; const longitude = element.lon ?? element.center?.lon; const tags = element.tags ?? {};
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { id: `osm-${element.type ?? "feature"}-${element.id ?? index}`, name: tags.name ?? tags.amenity ?? tags.emergency ?? "Mapped facility", type: tags.amenity ?? tags.emergency ?? "facility", latitude: Number(latitude), longitude: Number(longitude) };
  }).filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 40);
  const value: IndiaLocationContext["infrastructure"] = items.length ? { items, source: `OpenStreetMap contributors via Overpass API; up to ${radius / 1000} km coordinate-centred facility sample. Coverage and tags vary by area.`, status: "LIVE OSM FACILITY SAMPLE", observedAt: new Date().toISOString() } : unavailable;
  infrastructureCache.set(key, { expiresAt: Date.now() + 10 * 60 * 1000, value });
  return value;
}

export async function getIndiaLocationContext(location: IndiaLocation): Promise<IndiaLocationContext> {
  const seededLocation = location.id === andhraPradeshDefault.id ? { ...andhraPradeshDefault, ...location } : location;
  const stateName = seededLocation.address.state ?? seededLocation.name;
  const stateConfig = getStateByName(stateName) ?? (seededLocation.address.state ? getStateByCode(seededLocation.address.state) : undefined);

  const unavailableEnvironment = { temperatureC: null, precipitationMm: null, weatherCode: null, usAqi: null, pm25: null, observedAt: null, forecast: [], source: "Selected-location environmental context could not be refreshed before the response deadline.", status: "UNAVAILABLE" as const };
  const unavailableInfrastructure: IndiaLocationContext["infrastructure"] = { items: [], source: "OpenStreetMap facility lookup is temporarily unavailable.", status: "UNAVAILABLE", observedAt: null };

  const [selectedWithBoundary, environment, infrastructure, terrain] = await Promise.all([
    resolveWithin(enrichBoundary(seededLocation), 3_500, seededLocation),
    resolveWithin(getEnvironmentalContext(seededLocation.latitude, seededLocation.longitude), 4_500, unavailableEnvironment),
    resolveWithin(getNearbyInfrastructure(seededLocation), 4_500, unavailableInfrastructure),
    resolveWithin(
      resolveTerrain(seededLocation.latitude, seededLocation.longitude, stateConfig?.code),
      3_500,
      {
        elevationMeters: null,
        slopeDegrees: null,
        terrainClass: stateConfig?.terrainProfile ?? "Physiographic classification",
        source: "Open-Meteo DEM timed out; fallback physiographic context",
        timestamp: null,
        confidence: "UNAVAILABLE" as const,
        status: "UNAVAILABLE" as const,
      }
    ),
  ]);

  // If boundary is still null but we have a stateConfig and category is State, try authoritative state boundary
  let finalLocation = selectedWithBoundary;
  if (!finalLocation.boundary && stateConfig && finalLocation.category === "State") {
    try {
      const stateBoundary = await resolveStateBoundary(stateConfig.code);
      if (stateBoundary) {
        finalLocation = { ...finalLocation, boundary: stateBoundary, source: `${finalLocation.source}; geoBoundaries ADM1 boundary` };
      }
    } catch {
      // Continue with current location
    }
  }

  const hydrology = resolveHydrology(seededLocation.latitude, seededLocation.longitude, stateConfig?.code);
  const categorizedInfra = categorizeInfrastructure(infrastructure.items);

  let districtInfo: DistrictInfo | undefined = undefined;
  if (seededLocation.address.district && stateConfig) {
    districtInfo = {
      name: seededLocation.address.district,
      stateCode: stateConfig.code,
      isFocusDistrict: stateConfig.focusDistricts.some(
        d => d.toLowerCase() === seededLocation.address.district?.toLowerCase()
      ),
      terrainProfile: stateConfig.terrainProfile,
      primaryHazards: stateConfig.primaryHazards,
      censusPopulation2011: null,
      source: `${stateConfig.name} district administrative directory`,
    };
  }

  const provenance = buildProvenance(
    stateConfig ? `${stateConfig.name} Multi-State Real Data Foundation` : "Akashvani Spatial Intelligence",
    "OFFICIAL",
    "HIGH",
    `Authoritative administrative boundary and multi-source context for ${finalLocation.name}`
  );

  const values = [environment.precipitationMm === null ? null : Math.min(42, environment.precipitationMm * 7), environment.temperatureC === null ? null : Math.max(0, environment.temperatureC - 28) * 4, environment.usAqi === null ? null : Math.max(0, environment.usAqi - 50) / 3].filter((value): value is number => value !== null);
  const riskScore = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  const riskLevel = riskScore === null ? "Unavailable" : riskScore >= 55 ? "High" : riskScore >= 25 ? "Moderate" : "Low";
  const priority = riskScore === null ? "Unavailable" : riskScore >= 70 ? "Immediate" : riskScore >= 50 ? "High" : riskScore >= 25 ? "Moderate" : "Low";

  const hazardProfile = buildMultiHazardProfile({
    locationName: finalLocation.name,
    latitude: finalLocation.latitude,
    longitude: finalLocation.longitude,
    stateCode: stateConfig?.code,
    stateName: stateConfig?.name,
    district: seededLocation.address.district,
    slopeDegrees: terrain.slopeDegrees,
    elevationMeters: terrain.elevationMeters,
    currentRainfallMm: environment.precipitationMm,
    forecastMaxMm: environment.forecast[0]?.precipitationSumMm,
    currentTemperatureC: environment.temperatureC,
    isCoastalState: stateConfig?.isCoastal,
  });

  const hazardContext = hazardProfile.redZone.triggers.length > 0
    ? `${hazardProfile.redZone.status} ZONE: ${hazardProfile.redZone.explainability}`
    : riskScore === null
      ? "Live environmental inputs are unavailable; no screening context is calculated."
      : "Screening context is derived from selected-location modelled precipitation, temperature and air quality. It is not an official hazard warning.";

  return {
    location: finalLocation,
    environment,
    infrastructure,
    screening: {
      riskScore,
      riskLevel,
      priority,
      hazardContext,
      populationContext: finalLocation.population === null ? "Population value is unavailable from the selected geocoding result and is not estimated." : `${finalLocation.population.toLocaleString("en-IN")} inhabitants reported by the selected geocoding source.`,
      status: "LOCATION-SPECIFIC SCREENING CONTEXT",
    },
    terrain,
    hydrology,
    categorizedInfrastructure: categorizedInfra,
    provenance,
    stateConfig,
    districtInfo,
    hazardProfile,
    redZone: hazardProfile.redZone,
  };
}

