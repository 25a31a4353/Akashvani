type GeoFeature = { type: "Feature"; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } };
type GeoCollection = { type: "FeatureCollection"; features: GeoFeature[] };
type WeatherCell = { id: string; name: string; latitude: number; longitude: number; west: number; east: number; south: number; north: number };

const INDIA_IMAGE_COORDINATES: [[number, number], [number, number], [number, number], [number, number]] = [[68, 37], [98, 37], [98, 6], [68, 6]];
const STATES_URL = "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1_simplified.geojson";
const populationImage = "https://worldpop.arcgis.com/arcgis/rest/services/WorldPop_Population_Density_1km/ImageServer/exportImage?bbox=68,6,98,37&bboxSR=4326&size=1200,1200&imageSR=4326&format=png32&f=image";
const terrainImage = "https://utility.arcgis.com/usrsvcs/servers/6ff9b2ff0b2940c3bd5febf68a643a50/rest/services/WorldElevation/Terrain/ImageServer/exportImage?bbox=68,6,98,37&bboxSR=4326&size=1200,1200&imageSR=4326&format=png32&f=image";

let statesCache: { expiresAt: number; value: GeoCollection } | null = null;
let nationwideCache: { expiresAt: number; value: NationwideMapContext } | null = null;

export type NationwideMapContext = {
  states: GeoCollection;
  weather: GeoCollection;
  geology: GeoCollection;
  sensitivity: GeoCollection;
  imageCoordinates: [[number, number], [number, number], [number, number], [number, number]];
  populationImage: string;
  terrainImage: string;
  sources: Record<"states" | "population" | "terrain" | "geology" | "weather" | "sensitivity", string>;
  statuses: Record<"states" | "population" | "terrain" | "geology" | "weather" | "sensitivity", string>;
  updatedAt: string;
};

async function safeJson(response: Response): Promise<unknown> {
  if (!response.ok) return null;
  try { return JSON.parse(await response.text()) as unknown; } catch { return null; }
}

function reduceRing(ring: unknown): unknown {
  if (!Array.isArray(ring) || ring.length <= 220) return ring;
  const step = Math.ceil(ring.length / 220); const reduced = ring.filter((_, index) => index % step === 0);
  const first = ring[0]; const last = ring[ring.length - 1];
  if (JSON.stringify(reduced[0]) !== JSON.stringify(first)) reduced.unshift(first);
  if (JSON.stringify(reduced[reduced.length - 1]) !== JSON.stringify(last)) reduced.push(last);
  return reduced;
}

function reduceGeometry(geometry: { type?: unknown; coordinates?: unknown }): GeoFeature["geometry"] | null {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) return { type: "Polygon", coordinates: geometry.coordinates.map(reduceRing) };
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) return { type: "MultiPolygon", coordinates: geometry.coordinates.map(polygon => Array.isArray(polygon) ? polygon.map(reduceRing) : polygon) };
  return null;
}

async function getStates() {
  if (statesCache && statesCache.expiresAt > Date.now()) return statesCache;
  const response = await fetch(STATES_URL, { headers: { "User-Agent": "DIVA-PS191-national-map/1.0" }, signal: AbortSignal.timeout(15_000) });
  const raw = await safeJson(response) as { features?: Array<{ properties?: Record<string, unknown>; geometry?: { type?: unknown; coordinates?: unknown } }> } | null;
  const features = Array.isArray(raw?.features) ? raw.features.reduce<GeoFeature[]>((output, feature, index) => {
    const geometry = feature.geometry ? reduceGeometry(feature.geometry) : null;
    if (!geometry) return output;
    const name = String(feature.properties?.shapeName ?? feature.properties?.name ?? `State ${index + 1}`);
    output.push({ type: "Feature", properties: { ...feature.properties, stateName: name, source: "geoBoundaries ADM1 / DataMeet India community and Election Commission of India" }, geometry });
    return output;
  }, []) : [];
  return statesCache = { expiresAt: Date.now() + 24 * 60 * 60 * 1000, value: { type: "FeatureCollection", features } };
}

function nationalWeatherCells(): WeatherCell[] {
  const cells: WeatherCell[] = []; const step = 3;
  for (let south = 6; south < 37; south += step) for (let west = 68; west < 98; west += step) {
    const north = Math.min(37, south + step); const east = Math.min(98, west + step);
    cells.push({ id: `weather-${south}-${west}`, name: `${south}–${north}°N / ${west}–${east}°E model cell`, latitude: (south + north) / 2, longitude: (west + east) / 2, south, north, west, east });
  }
  return cells;
}

function weatherFeature(cell: WeatherCell, current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; wind_speed_10m?: number; wind_direction_10m?: number; wind_gusts_10m?: number; time?: string }, daily?: { time?: string[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[]; precipitation_sum?: number[]; wind_speed_10m_max?: number[] }): GeoFeature {
  const forecast = (daily?.time ?? []).slice(0, 3).map((date, index) => ({ date, temperatureMinC: daily?.temperature_2m_min?.[index] ?? null, temperatureMaxC: daily?.temperature_2m_max?.[index] ?? null, precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null, precipitationSumMm: daily?.precipitation_sum?.[index] ?? null, windSpeedMaxKph: daily?.wind_speed_10m_max?.[index] ?? null }));
  return { type: "Feature", properties: { id: cell.id, name: cell.name, temperatureC: current?.temperature_2m ?? null, precipitationMm: current?.precipitation ?? null, weatherCode: current?.weather_code ?? null, windSpeedKph: current?.wind_speed_10m ?? null, windDirectionDegrees: current?.wind_direction_10m ?? null, windGustKph: current?.wind_gusts_10m ?? null, observedAt: current?.time ?? null, forecast }, geometry: { type: "Polygon", coordinates: [[[cell.west, cell.south], [cell.east, cell.south], [cell.east, cell.north], [cell.west, cell.north], [cell.west, cell.south]]] } };
}

async function getWeather(cells: WeatherCell[]): Promise<GeoCollection> {
  try {
    const parameters = new URLSearchParams({ latitude: cells.map(cell => cell.latitude.toFixed(3)).join(","), longitude: cells.map(cell => cell.longitude.toFixed(3)).join(","), current: "temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m", daily: "temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max", forecast_days: "3", timezone: "Asia/Kolkata" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters.toString()}`, { signal: AbortSignal.timeout(12_000) });
    const raw = await safeJson(response); const reports = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return { type: "FeatureCollection", features: cells.map((cell, index) => { const report = reports[index] as { current?: Parameters<typeof weatherFeature>[1]; daily?: Parameters<typeof weatherFeature>[2] } | undefined; return weatherFeature(cell, report?.current, report?.daily); }) };
  } catch { return { type: "FeatureCollection", features: cells.map(cell => weatherFeature(cell)) }; }
}

const geology: GeoCollection = { type: "FeatureCollection", features: [] };
const sensitivity: GeoCollection = { type: "FeatureCollection", features: [
  { type: "Feature", properties: { id: "seismic-himalayan", hazard: "Earthquake sensitivity", level: "High", source: "DIVA broad tectonic-belt screening extent; an official seismic-zone geometry was unavailable from the verified service at retrieval time." }, geometry: { type: "Polygon", coordinates: [[[73, 31], [77, 36.8], [95, 36.8], [98, 30], [94, 27], [85, 27.5], [79, 29], [73, 31]]] } },
  { type: "Feature", properties: { id: "seismic-kutch", hazard: "Earthquake sensitivity", level: "Moderate", source: "DIVA broad tectonic-belt screening extent; not an official seismic-zone boundary." }, geometry: { type: "Polygon", coordinates: [[[68.2, 22.2], [73.6, 22.2], [73.6, 25.4], [68.2, 25.4], [68.2, 22.2]]] } },
  { type: "Feature", properties: { id: "landslide-himalaya", hazard: "Landslide sensitivity", level: "High", source: "ISRO Landslide Atlas regional coverage context (Himalayas and Western Ghats); DIVA screening extent, not a landslide inventory polygon." }, geometry: { type: "Polygon", coordinates: [[[73, 28], [77, 36.8], [96, 36.8], [97, 28.2], [91, 26.5], [83, 27.4], [77, 27.2], [73, 28]]] } },
  { type: "Feature", properties: { id: "landslide-western-ghats", hazard: "Landslide sensitivity", level: "Moderate", source: "ISRO Landslide Atlas regional coverage context; DIVA screening extent, not a landslide inventory polygon." }, geometry: { type: "Polygon", coordinates: [[[73.2, 8.2], [77.4, 8.2], [77.4, 20.8], [74.3, 21.5], [73.2, 8.2]]] } },
  { type: "Feature", properties: { id: "flood-ganga-brahmaputra", hazard: "Flood sensitivity", level: "High", source: "DIVA broad riverine/monsoon screening extent informed by Bhuvan flood-service availability; not a live inundation or official flood forecast." }, geometry: { type: "Polygon", coordinates: [[[74, 23.2], [89, 23.2], [97.5, 25.2], [97, 28.8], [88, 29.8], [80, 28.8], [74, 26.2], [74, 23.2]]] } },
  { type: "Feature", properties: { id: "flood-coastal", hazard: "Flood sensitivity", level: "Moderate", source: "DIVA broad coastal/monsoon screening extent informed by Bhuvan flood-service availability; not a live inundation or official flood forecast." }, geometry: { type: "Polygon", coordinates: [[[72, 8], [76.8, 8], [76.8, 23.5], [72, 23.5], [72, 8]]] } },
] };

export async function getNationwideIndiaMap(): Promise<NationwideMapContext> {
  if (nationwideCache && nationwideCache.expiresAt > Date.now()) return nationwideCache.value;
  let stateResult: Awaited<ReturnType<typeof getStates>>;
  try { stateResult = await getStates(); } catch { stateResult = { expiresAt: Date.now(), value: { type: "FeatureCollection", features: [] } }; }
  const weather = await getWeather(nationalWeatherCells());
  const value: NationwideMapContext = {
    states: stateResult.value, weather, geology, sensitivity, imageCoordinates: INDIA_IMAGE_COORDINATES, populationImage, terrainImage,
    sources: {
      states: "geoBoundaries ADM1 (DataMeet India community / Election Commission of India); reference boundary year 2011",
      population: "WorldPop Population Density 1 km image service; people per km²; reference data years 2000–2020",
      terrain: "Esri World Elevation Terrain image service; physical-terrain visual reference",
      geology: "Geological Survey of India Bhukosh / USGS South Asia geology reference; no verified live nationwide service currently available",
      weather: "Open-Meteo Forecast API, current conditions and three-day modelled outlook sampled on a 3° nationwide coverage grid (temperature, precipitation, 10 m wind speed, direction, gust)",
      sensitivity: "ISRO/NRSC Bhuvan disaster-service availability and ISRO Landslide Atlas coverage context; DIVA broad sensitivity screening geometry",
    },
    statuses: {
      states: stateResult.value.features.length ? "NATIONWIDE REFERENCE BOUNDARIES" : "UNAVAILABLE",
      population: "NATIONWIDE REFERENCE RASTER",
      terrain: "NATIONWIDE TERRAIN REFERENCE",
      geology: "UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED",
      weather: weather.features.some(feature => feature.properties.temperatureC !== null) ? "LIVE MODELLED WEATHER, WIND + 3-DAY FORECAST COVERAGE GRID" : "UNAVAILABLE",
      sensitivity: "BROAD ANALYTICAL SENSITIVITY EXTENTS — NOT OFFICIAL ZONES, EVENT IMPACTS, OR FORECASTS",
    },
    updatedAt: new Date().toISOString(),
  };
  nationwideCache = { expiresAt: Date.now() + 5 * 60 * 1000, value };
  return value;
}
