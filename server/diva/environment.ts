import type {
  EnvironmentalContext,
  ForecastDayDetailed,
  IndiaLocation,
} from "@shared/india";
import type { ImdWarningContext } from "@shared/multiState";
import { decodeWmoWeather, predictProblemsFromWeather } from "./weatherPredictiveEngine";

const cache = new Map<string, { expiresAt: number; value: EnvironmentalContext }>();

interface ImdNowcastItem {
  title: string;
  id: string;
  color: string;
  info: string;
  balloonText?: string;
}

let imdNowcastCache: { expiresAt: number; data: ImdNowcastItem[] } | null = null;

async function getImdNowcasts(): Promise<ImdNowcastItem[]> {
  if (imdNowcastCache && imdNowcastCache.expiresAt > Date.now()) {
    return imdNowcastCache.data;
  }
  try {
    const res = await fetch("https://mausam.imd.gov.in/responsive/districtWiseNowcast.php", {
      headers: { "User-Agent": "ResQ-Disaster-Intelligence/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return imdNowcastCache?.data ?? [];
    const text = await res.text();
    let items: ImdNowcastItem[] = [];
    try {
      items = JSON.parse(text) as ImdNowcastItem[];
    } catch {
      const match = text.match(/\[\s*\{\s*"title"\s*:\s*"[\s\S]*?"\s*,\s*"id"\s*:/);
      if (match && match.index !== undefined) {
        const startIdx = match.index;
        let depth = 0;
        let endIdx = -1;
        for (let i = startIdx; i < text.length; i++) {
          if (text[i] === "[") depth++;
          else if (text[i] === "]") {
            depth--;
            if (depth === 0) {
              endIdx = i + 1;
              break;
            }
          }
        }
        if (endIdx > startIdx) {
          items = JSON.parse(text.slice(startIdx, endIdx)) as ImdNowcastItem[];
        }
      }
    }
    if (Array.isArray(items) && items.length > 0) {
      imdNowcastCache = { expiresAt: Date.now() + 15 * 60 * 1000, data: items };
      return items;
    }
  } catch {
    // Return stale cache if available
  }
  return imdNowcastCache?.data ?? [];
}

export async function resolveImdDistrictWarning(
  districtName?: string,
  stateName?: string
): Promise<ImdWarningContext | null> {
  if (!districtName) return null;
  const items = await getImdNowcasts();
  if (!items.length) return null;

  const norm = districtName.trim().toUpperCase().replace(/[^A-Z]/g, "");
  let found = items.find(item => item.title.replace(/[^A-Z]/g, "") === norm);
  if (!found) {
    found = items.find(item => {
      const itemTitle = item.title.replace(/[^A-Z]/g, "");
      return itemTitle.includes(norm) || norm.includes(itemTitle);
    });
  }
  if (!found) return null;

  const hex = (found.color ?? "").toLowerCase();
  let warningLevel: ImdWarningContext["warningLevel"] = "NO_WARNING";
  if (hex.includes("ff0000") || hex === "#f00") warningLevel = "WARNING";
  else if (hex.includes("ffa500") || hex.includes("orange")) warningLevel = "ALERT";
  else if (hex.includes("ffff00") || hex.includes("yellow")) warningLevel = "WATCH";

  const rawInfo = found.info ?? "";
  const infoText = rawInfo.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, " ").trim();
  const timeMatch = rawInfo.match(/Time of issue<\/b>:\s*<p>(.*?)<\/p>/i);
  const validMatch = rawInfo.match(/Valid upto<\/b>:\s*<p>?(.*?)<\/p>?/i);

  const cleanHeadline = infoText
    .replace(/Time of issue.*?$/i, "")
    .replace(/Valid upto.*?$/i, "")
    .trim();

  return {
    district: found.title,
    state: stateName,
    warningColor: found.color,
    warningLevel,
    headline: cleanHeadline || (warningLevel === "NO_WARNING" ? "No Warning" : `${warningLevel} Alert`),
    details: infoText,
    issuedAt: timeMatch ? timeMatch[1].trim() : null,
    validUpto: validMatch ? validMatch[1].trim() : null,
    source: "India Meteorological Department (IMD) — Mausam District Nowcast & Warning Portal",
    sourceUrl: "https://mausam.imd.gov.in/responsive/districtWiseNowcast.php",
    provenance: "OFFICIAL",
  };
}

async function safeJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function forecastFromDaily(daily?: {
  time?: string[];
  temperature_2m_min?: number[];
  temperature_2m_max?: number[];
  apparent_temperature_min?: number[];
  apparent_temperature_max?: number[];
  precipitation_probability_max?: number[];
  precipitation_sum?: number[];
  wind_speed_10m_max?: number[];
  wind_gusts_10m_max?: number[];
  uv_index_max?: number[];
  weather_code?: number[];
}): ForecastDayDetailed[] {
  return (daily?.time ?? []).slice(0, 7).map((date, index) => {
    const code = daily?.weather_code?.[index] ?? null;
    return {
      date,
      temperatureMinC: daily?.temperature_2m_min?.[index] ?? null,
      temperatureMaxC: daily?.temperature_2m_max?.[index] ?? null,
      apparentTemperatureMinC: daily?.apparent_temperature_min?.[index] ?? null,
      apparentTemperatureMaxC: daily?.apparent_temperature_max?.[index] ?? null,
      precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null,
      precipitationSumMm: daily?.precipitation_sum?.[index] ?? null,
      windSpeedMaxKph: daily?.wind_speed_10m_max?.[index] ?? null,
      windGustMaxKph: daily?.wind_gusts_10m_max?.[index] ?? null,
      uvIndexMax: daily?.uv_index_max?.[index] ?? null,
      weatherCode: code,
      weatherDescription: decodeWmoWeather(code).label
    };
  });
}

export async function getEnvironmentalContext(
  latitude: number,
  longitude: number,
  location?: IndiaLocation
): Promise<EnvironmentalContext> {
  const districtName = location?.address?.district ?? (location?.category === "District" ? location.name : undefined);
  const stateName = location?.address?.state;
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)},${districtName ?? ""}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const loc: IndiaLocation = location ?? {
    id: `coord-${latitude.toFixed(3)}-${longitude.toFixed(3)}`,
    name: `Location (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`,
    displayName: `Selected Coordinates, India`,
    category: "Place",
    latitude,
    longitude,
    population: null,
    populationSource: "Unspecified",
    boundingBox: null,
    boundary: null,
    address: {},
    source: "Coordinates"
  };

  try {
    const currentFields = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
    const dailyFields = "weather_code,temperature_2m_min,temperature_2m_max,apparent_temperature_min,apparent_temperature_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max";

    const [weatherResponse, qualityResponse, imdWarning] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentFields}&daily=${dailyFields}&forecast_days=7&timezone=Asia%2FKolkata`,
        { signal: AbortSignal.timeout(7000) }
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`,
        { signal: AbortSignal.timeout(7000) }
      ),
      resolveImdDistrictWarning(districtName, stateName)
    ]);

    const weather = await safeJson<{
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        apparent_temperature?: number;
        precipitation?: number;
        weather_code?: number;
        surface_pressure?: number;
        wind_speed_10m?: number;
        wind_direction_10m?: number;
        wind_gusts_10m?: number;
        time?: string;
      };
      daily?: {
        time?: string[];
        temperature_2m_min?: number[];
        temperature_2m_max?: number[];
        apparent_temperature_min?: number[];
        apparent_temperature_max?: number[];
        precipitation_probability_max?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
        wind_gusts_10m_max?: number[];
        uv_index_max?: number[];
        weather_code?: number[];
      };
    }>(weatherResponse);

    const quality = await safeJson<{
      current?: {
        us_aqi?: number;
        pm2_5?: number;
        pm10?: number;
      };
    }>(qualityResponse);

    if (!weather || !quality) throw new Error("Environmental source unavailable");

    const forecast = forecastFromDaily(weather.daily);
    const weatherCode = weather.current?.weather_code ?? null;
    const weatherDesc = decodeWmoWeather(weatherCode).label;

    const envPayload = {
      temperatureC: weather.current?.temperature_2m ?? null,
      apparentTemperatureC: weather.current?.apparent_temperature ?? null,
      relativeHumidityPct: weather.current?.relative_humidity_2m ?? null,
      precipitationMm: weather.current?.precipitation ?? null,
      surfacePressureHpa: weather.current?.surface_pressure ?? null,
      windSpeedKph: weather.current?.wind_speed_10m ?? null,
      windDirectionDeg: weather.current?.wind_direction_10m ?? null,
      windGustKph: weather.current?.wind_gusts_10m ?? null,
      uvIndex: forecast[0]?.uvIndexMax ?? null,
      weatherCode,
      weatherDescription: weatherDesc,
      usAqi: quality.current?.us_aqi ?? null,
      pm25: quality.current?.pm2_5 ?? null,
      pm10: quality.current?.pm10 ?? null,
      observedAt: weather.current?.time ?? new Date().toISOString(),
      forecast,
      imdWarning,
      telemetryType: {
        temperature: "MODELLED" as const,
        wind: "MODELLED" as const,
        precipitation: "MODELLED" as const,
        airQuality: "MODELLED" as const,
        warning: (imdWarning ? (imdWarning.warningLevel === "NO_WARNING" ? "OFFICIAL_NOWCAST" : "OFFICIAL_WARNING") : "UNAVAILABLE") as "OFFICIAL_WARNING" | "OFFICIAL_NOWCAST" | "UNAVAILABLE",
      },
      validPeriod: imdWarning?.validUpto ? `Valid upto ${imdWarning.validUpto}` : "3-hour operational cycle",
      retrievedAt: new Date().toISOString(),
    };

    const predictions = predictProblemsFromWeather(envPayload, loc);

    const sourceLabel = imdWarning
      ? `IMD Mausam District Nowcast (${imdWarning.warningLevel}) & Open-Meteo ECMWF/GFS Numerical Telemetry`
      : "Open-Meteo Forecast API (ECMWF/GFS Seamless) & Open-Meteo CAMS Air Quality Telemetry";

    const value: EnvironmentalContext = {
      ...envPayload,
      predictions,
      source: sourceLabel,
      status: imdWarning ? "LIVE IMD WARNING & MODELLED TELEMETRY" : "LIVE MODELLED ENVIRONMENTAL CONTEXT"
    };

    cache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, value });
    return value;
  } catch {
    return {
      temperatureC: null,
      precipitationMm: null,
      weatherCode: null,
      weatherDescription: "Telemetry temporarily unavailable",
      usAqi: null,
      pm25: null,
      observedAt: null,
      forecast: [],
      imdWarning: null,
      telemetryType: {
        temperature: "MODELLED",
        wind: "MODELLED",
        precipitation: "MODELLED",
        airQuality: "MODELLED",
        warning: "UNAVAILABLE",
      },
      validPeriod: "Unavailable",
      retrievedAt: new Date().toISOString(),
      source: "Environmental services temporarily unavailable",
      status: "UNAVAILABLE"
    };
  }
}

