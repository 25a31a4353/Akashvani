import { describe, expect, it } from "vitest";
import { decodeWmoWeather, predictProblemsFromWeather } from "./weatherPredictiveEngine";
import type { IndiaLocation } from "@shared/india";

const dummyLocation = (name: string, state: string, district?: string): IndiaLocation => ({
  id: `loc-${name.toLowerCase()}`,
  name,
  displayName: `${name}, ${state}, India`,
  category: "District",
  latitude: 20.0,
  longitude: 80.0,
  population: 500000,
  populationSource: "Test",
  boundingBox: null,
  boundary: null,
  address: { state, district: district ?? name },
  source: "Test"
});

describe("weatherPredictiveEngine", () => {
  it("decodes WMO weather codes accurately", () => {
    expect(decodeWmoWeather(0).label).toBe("Clear Sky");
    expect(decodeWmoWeather(0).severity).toBe("calm");
    expect(decodeWmoWeather(65).label).toBe("Heavy Rain");
    expect(decodeWmoWeather(65).severity).toBe("severe");
    expect(decodeWmoWeather(96).label).toBe("Thunderstorm with Slight Hail");
    expect(decodeWmoWeather(96).severity).toBe("extreme");
  });

  it("predicts Flash Flood & Urban Waterlogging on heavy precipitation & thunderstorm", () => {
    const loc = dummyLocation("Dibrugarh", "Assam");
    const report = predictProblemsFromWeather(
      {
        temperatureC: 28,
        apparentTemperatureC: 34,
        relativeHumidityPct: 92,
        precipitationMm: 14.5,
        weatherCode: 96, // Thunderstorm with hail
        usAqi: 45,
        pm25: 12,
        forecast: [
          {
            date: "2026-09-23",
            temperatureMinC: 24,
            temperatureMaxC: 30,
            precipitationProbability: 85,
            precipitationSumMm: 45.2,
            windSpeedMaxKph: 28,
            windGustMaxKph: 42,
            weatherCode: 96
          }
        ]
      },
      loc
    );

    expect(report.overallRiskLevel).toBe("CRITICAL");
    const flashFlood = report.predictedProblems.find(p => p.category === "FLASH_FLOOD");
    expect(flashFlood).toBeDefined();
    expect(flashFlood?.severity).toBe("CRITICAL");
    expect(flashFlood?.immediateDirectives.length).toBeGreaterThan(0);

    const thunderstorm = report.predictedProblems.find(p => p.category === "THUNDERSTORM_LIGHTNING");
    expect(thunderstorm).toBeDefined();
  });

  it("predicts Landslide & Slope Instability in hilly terrain (Wayanad, Kerala) under rain", () => {
    const loc = dummyLocation("Wayanad", "Kerala");
    const report = predictProblemsFromWeather(
      {
        temperatureC: 22,
        apparentTemperatureC: 25,
        precipitationMm: 18,
        weatherCode: 65, // Heavy rain
        usAqi: 30,
        pm25: 8,
        forecast: [
          {
            date: "2026-09-23",
            temperatureMinC: 19,
            temperatureMaxC: 24,
            precipitationProbability: 80,
            precipitationSumMm: 35,
            windSpeedMaxKph: 20,
            windGustMaxKph: 32,
            weatherCode: 65
          }
        ]
      },
      loc
    );

    const landslide = report.predictedProblems.find(p => p.category === "LANDSLIDE");
    expect(landslide).toBeDefined();
    expect(landslide?.title).toContain("Slope Instability");
    expect(landslide?.immediateDirectives.some(d => d.includes("ghat"))).toBe(true);
  });

  it("predicts Extreme Heatwave on high apparent temperature & UV", () => {
    const loc = dummyLocation("Jodhpur", "Rajasthan");
    const report = predictProblemsFromWeather(
      {
        temperatureC: 41,
        apparentTemperatureC: 44.5,
        precipitationMm: 0,
        weatherCode: 0,
        uvIndex: 9.2,
        usAqi: 65,
        pm25: 22,
        forecast: [
          {
            date: "2026-09-23",
            temperatureMinC: 29,
            temperatureMaxC: 42,
            apparentTemperatureMaxC: 45,
            precipitationProbability: 5,
            precipitationSumMm: 0,
            windSpeedMaxKph: 15,
            windGustMaxKph: 24,
            uvIndexMax: 9.5,
            weatherCode: 0
          }
        ]
      },
      loc
    );

    expect(report.overallRiskLevel).toBe("CRITICAL");
    const heatwave = report.predictedProblems.find(p => p.category === "HEATWAVE");
    expect(heatwave).toBeDefined();
    expect(heatwave?.severity).toBe("CRITICAL");
    expect(heatwave?.immediateDirectives.some(d => d.includes("hydration") || d.includes("laborers"))).toBe(true);
  });

  it("predicts Squall & Gale Hazard on high wind gusts", () => {
    const loc = dummyLocation("Puri", "Odisha");
    const report = predictProblemsFromWeather(
      {
        temperatureC: 29,
        apparentTemperatureC: 33,
        precipitationMm: 2,
        weatherCode: 2,
        windSpeedKph: 36,
        windGustKph: 58,
        usAqi: 40,
        pm25: 10,
        forecast: [
          {
            date: "2026-09-23",
            temperatureMinC: 26,
            temperatureMaxC: 31,
            precipitationProbability: 35,
            precipitationSumMm: 4,
            windSpeedMaxKph: 38,
            windGustMaxKph: 62,
            weatherCode: 2
          }
        ]
      },
      loc
    );

    const squall = report.predictedProblems.find(p => p.category === "SQUALL_GALE");
    expect(squall).toBeDefined();
    expect(squall?.severity).toBe("CRITICAL");
    expect(squall?.immediateDirectives.some(d => d.includes("fisherfolk"))).toBe(true);
  });

  it("returns LOW risk and stable narrative under mild baseline conditions", () => {
    const loc = dummyLocation("Bengaluru", "Karnataka");
    const report = predictProblemsFromWeather(
      {
        temperatureC: 24,
        apparentTemperatureC: 25,
        precipitationMm: 0,
        weatherCode: 1,
        windSpeedKph: 12,
        windGustKph: 18,
        uvIndex: 4,
        usAqi: 50,
        pm25: 15,
        forecast: [
          {
            date: "2026-09-23",
            temperatureMinC: 18,
            temperatureMaxC: 27,
            precipitationProbability: 10,
            precipitationSumMm: 0,
            windSpeedMaxKph: 14,
            windGustMaxKph: 20,
            uvIndexMax: 5,
            weatherCode: 1
          }
        ]
      },
      loc
    );

    expect(report.overallRiskLevel).toBe("LOW");
    expect(report.predictedProblems.length).toBe(0);
    expect(report.summaryNarrative).toContain("stable atmospheric conditions");
  });
});
