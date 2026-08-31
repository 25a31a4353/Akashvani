export type IndiaBoundary = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } } | null;

export type IndiaLocation = {
  id: string;
  name: string;
  displayName: string;
  category: "State" | "District" | "City" | "Locality" | "Place";
  latitude: number;
  longitude: number;
  population: number | null;
  populationSource: string;
  boundingBox: [number, number, number, number] | null;
  boundary: IndiaBoundary;
  address: { state?: string; district?: string; city?: string; locality?: string };
  source: string;
};

export type IndiaLocationContext = {
  location: IndiaLocation;
  environment: { temperatureC: number | null; precipitationMm: number | null; usAqi: number | null; pm25: number | null; observedAt: string | null; forecast: Array<{ date: string; temperatureMinC: number | null; temperatureMaxC: number | null; precipitationProbability: number | null; precipitationSumMm: number | null; windSpeedMaxKph: number | null; windGustMaxKph: number | null; weatherCode: number | null }>; source: string; status: string };
  infrastructure: { items: Array<{ id: string; name: string; type: string; latitude: number; longitude: number }>; source: string; status: "LIVE OSM FACILITY SAMPLE" | "UNAVAILABLE"; observedAt: string | null };
  screening: { riskScore: number | null; riskLevel: "Low" | "Moderate" | "High" | "Unavailable"; priority: "Immediate" | "High" | "Moderate" | "Low" | "Unavailable"; hazardContext: string; populationContext: string; status: string };
};

export const andhraPradeshDefault: IndiaLocation = {
  id: "india-andhra-pradesh",
  name: "Andhra Pradesh",
  displayName: "Andhra Pradesh, India",
  category: "State",
  latitude: 15.9129,
  longitude: 79.74,
  population: null,
  populationSource: "Population is resolved where a geocoding source returns it.",
  boundingBox: [12.62, 77.72, 19.92, 84.80],
  boundary: null,
  address: { state: "Andhra Pradesh" },
  source: "DIVA default extent; Nominatim boundary retrieved on context load",
};

export const assamDefault: IndiaLocation = {
  id: "india-assam",
  name: "Assam",
  displayName: "Assam, India",
  category: "State",
  latitude: 26.2006,
  longitude: 92.9376,
  population: null,
  populationSource: "Population is resolved where a geocoding source returns it; state-level totals are not substituted for a current place value.",
  boundingBox: [24.13, 89.68, 28.22, 96.02],
  boundary: null,
  address: { state: "Assam" },
  source: "Assam State default context; Nominatim boundary retrieved on context load",
};

export const indiaDeepLinks: Record<string, IndiaLocation> = {
  india: { ...andhraPradeshDefault, id: "india-overview", name: "India", displayName: "India nationwide overview", category: "Place", latitude: 22.9734, longitude: 78.6569, boundingBox: [6.5, 68, 37.2, 98], address: {}, source: "Shareable DIVA nationwide India link; reference layers retrieved on context load" },
  visakhapatnam: { ...andhraPradeshDefault, id: "india-visakhapatnam", name: "Visakhapatnam", displayName: "Visakhapatnam, Andhra Pradesh, India", category: "City", latitude: 17.6868, longitude: 83.2185, boundingBox: null, address: { state: "Andhra Pradesh", city: "Visakhapatnam" }, source: "Shareable DIVA India location link; boundary retrieved on context load" },
  guntur: { ...andhraPradeshDefault, id: "india-guntur", name: "Guntur", displayName: "Guntur, Andhra Pradesh, India", category: "District", latitude: 16.3067, longitude: 80.4365, boundingBox: null, address: { state: "Andhra Pradesh", district: "Guntur" }, source: "Shareable DIVA India location link; boundary retrieved on context load" },
  nizamabad: { ...andhraPradeshDefault, id: "india-nizamabad", name: "Nizamabad", displayName: "Nizamabad, Telangana, India", category: "City", latitude: 18.6725, longitude: 78.0941, boundingBox: null, address: { state: "Telangana", city: "Nizamabad" }, source: "Shareable DIVA India location link; boundary retrieved on context load" },
  assam: assamDefault,
  "banjara-hills": { ...andhraPradeshDefault, id: "india-banjara-hills", name: "Banjara Hills", displayName: "Banjara Hills, Hyderabad, Telangana, India", category: "Locality", latitude: 17.4156, longitude: 78.4347, boundingBox: null, address: { state: "Telangana", city: "Hyderabad", locality: "Banjara Hills" }, source: "Shareable DIVA India location link; boundary retrieved on context load" },
};

export type IndiaLocationResolution = {
  location: IndiaLocation;
  isFallback: boolean;
  requested: string | null;
};

export function indiaLocationSlug(location: Pick<IndiaLocation, "name">) {
  return location.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "india";
}

export function buildIndiaLocationSearch(location: IndiaLocation, workspace?: string) {
  const params = new URLSearchParams();
  params.set("location", location.id);
  params.set("locationId", location.id);
  params.set("locationData", JSON.stringify({ ...location, boundary: null }));
  if (workspace) params.set("workspace", workspace);
  return `?${params.toString()}`;
}

function isIndiaLocation(value: unknown): value is IndiaLocation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<IndiaLocation>;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.displayName === "string" && ["State", "District", "City", "Locality", "Place"].includes(candidate.category ?? "") && Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude) && (candidate.population === null || typeof candidate.population === "number") && typeof candidate.populationSource === "string" && typeof candidate.source === "string" && Boolean(candidate.address && typeof candidate.address === "object");
}

function resolveKnownLocation(value: string | null) {
  if (!value) return undefined;
  const entry = Object.entries(indiaDeepLinks).find(([slug, location]) => slug === value || location.id === value);
  return entry?.[1];
}

export function resolveIndiaLocationSelection(search: string): IndiaLocationResolution {
  const params = new URLSearchParams(search);
  const requested = params.get("location") ?? params.get("locationId");
  const serialized = params.get("locationData");
  if (serialized) {
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (isIndiaLocation(parsed)) return { location: { ...parsed, boundary: null }, isFallback: false, requested };
    } catch {
      // Fall through to the known deep-link resolver and show its explicit fallback state.
    }
  }
  const known = resolveKnownLocation(params.get("locationId")) ?? resolveKnownLocation(params.get("location"));
  if (known) return { location: known, isFallback: false, requested };
  return { location: assamDefault, isFallback: Boolean(requested || serialized), requested };
}

export function resolveIndiaDeepLink(location: string | null): IndiaLocation {
  return resolveKnownLocation(location) ?? assamDefault;
}

export function resolveIndiaLocationFromSearch(search: string): IndiaLocation {
  return resolveIndiaLocationSelection(search).location;
}
