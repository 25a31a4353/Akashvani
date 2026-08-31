type ForecastDay = { date: string; temperatureMinC: number | null; temperatureMaxC: number | null; precipitationProbability: number | null; precipitationSumMm: number | null; windSpeedMaxKph: number | null; windGustMaxKph: number | null; weatherCode: number | null };
type EnvironmentalContext = { temperatureC: number | null; precipitationMm: number | null; weatherCode: number | null; usAqi: number | null; pm25: number | null; observedAt: string | null; forecast: ForecastDay[]; source: string; status: "LIVE MODELLED ENVIRONMENTAL CONTEXT" | "UNAVAILABLE" };

const cache = new Map<string, { expiresAt: number; value: EnvironmentalContext }>();

async function safeJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  try { return JSON.parse(await response.text()) as T; } catch { return null; }
}

function forecastFromDaily(daily?: { time?: string[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[]; precipitation_sum?: number[]; wind_speed_10m_max?: number[]; wind_gusts_10m_max?: number[]; weather_code?: number[] }): ForecastDay[] {
  return (daily?.time ?? []).slice(0, 5).map((date, index) => ({ date, temperatureMinC: daily?.temperature_2m_min?.[index] ?? null, temperatureMaxC: daily?.temperature_2m_max?.[index] ?? null, precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null, precipitationSumMm: daily?.precipitation_sum?.[index] ?? null, windSpeedMaxKph: daily?.wind_speed_10m_max?.[index] ?? null, windGustMaxKph: daily?.wind_gusts_10m_max?.[index] ?? null, weatherCode: daily?.weather_code?.[index] ?? null }));
}

export async function getEnvironmentalContext(latitude: number, longitude: number): Promise<EnvironmentalContext> {
  const key = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const [weatherResponse, qualityResponse] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,weather_code&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max&forecast_days=5&timezone=Asia%2FKolkata`, { signal: AbortSignal.timeout(7000) }),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5&timezone=Asia%2FKolkata`, { signal: AbortSignal.timeout(7000) }),
    ]);
    const weather = await safeJson<{ current?: { temperature_2m?: number; precipitation?: number; weather_code?: number; time?: string }; daily?: { time?: string[]; temperature_2m_min?: number[]; temperature_2m_max?: number[]; precipitation_probability_max?: number[]; precipitation_sum?: number[]; wind_speed_10m_max?: number[]; wind_gusts_10m_max?: number[]; weather_code?: number[] } }>(weatherResponse);
    const quality = await safeJson<{ current?: { us_aqi?: number; pm2_5?: number } }>(qualityResponse);
    if (!weather || !quality) throw new Error("Environmental source unavailable");
    const value: EnvironmentalContext = { temperatureC: weather.current?.temperature_2m ?? null, precipitationMm: weather.current?.precipitation ?? null, weatherCode: weather.current?.weather_code ?? null, usAqi: quality.current?.us_aqi ?? null, pm25: quality.current?.pm2_5 ?? null, observedAt: weather.current?.time ?? null, forecast: forecastFromDaily(weather.daily), source: "Open-Meteo Forecast API (current + five-day forecast) and Open-Meteo Air Quality API / CAMS modelled context", status: "LIVE MODELLED ENVIRONMENTAL CONTEXT" };
    cache.set(key, { expiresAt: Date.now() + 10 * 60 * 1000, value });
    return value;
  } catch {
    return { temperatureC: null, precipitationMm: null, weatherCode: null, usAqi: null, pm25: null, observedAt: null, forecast: [], source: "Open-Meteo environmental context was unavailable at request time", status: "UNAVAILABLE" };
  }
}
