import type { EnvironmentalContext, ForecastDayDetailed, IndiaLocation } from "@shared/india";
import { decodeWmoWeather, predictProblemsFromWeather } from "./weatherPredictiveEngine";

const cache = new Map<string, { expiresAt: number; value: EnvironmentalContext }>();

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
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
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

    const [weatherResponse, qualityResponse] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=${currentFields}&daily=${dailyFields}&forecast_days=7&timezone=Asia%2FKolkata`,
        { signal: AbortSignal.timeout(7000) }
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`,
        { signal: AbortSignal.timeout(7000) }
      )
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
      observedAt: weather.current?.time ?? null,
      forecast
    };

    const predictions = predictProblemsFromWeather(envPayload, loc);

    const value: EnvironmentalContext = {
      ...envPayload,
      predictions,
      source: "Open-Meteo Forecast API (Current + 7-Day Outlook) & Open-Meteo CAMS Air Quality Telemetry",
      status: "LIVE MODELLED ENVIRONMENTAL CONTEXT"
    };

    cache.set(key, { expiresAt: Date.now() + 10 * 60 * 1000, value });
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
      source: "Open-Meteo environmental context was unavailable at request time",
      status: "UNAVAILABLE"
    };
  }
}
