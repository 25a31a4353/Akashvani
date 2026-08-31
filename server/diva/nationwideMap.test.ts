import { afterEach, describe, expect, it, vi } from "vitest";
import { getNationwideIndiaMap } from "./nationwideMap";

afterEach(() => vi.unstubAllGlobals());

describe("nationwide India map", () => {
  it("returns normalized state boundaries, live-model weather-wind coverage cells, and transparent sensitivity extents", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("geoBoundaries")) return new Response(JSON.stringify({ type: "FeatureCollection", features: [
        { type: "Feature", properties: { shapeName: "Example State" }, geometry: { type: "Polygon", coordinates: [[[76, 15], [78, 15], [78, 17], [76, 17], [76, 15]]] } },
      ] }), { status: 200 });
      return new Response(JSON.stringify([{ current: { temperature_2m: 30.5, precipitation: 1.2, weather_code: 61, wind_speed_10m: 12, wind_direction_10m: 145, wind_gusts_10m: 19, time: "2026-08-23T17:45" }, daily: { time: ["2026-08-24", "2026-08-25", "2026-08-26"], temperature_2m_min: [21, 22, 23], temperature_2m_max: [31, 32, 33], precipitation_probability_max: [30, 40, 50], precipitation_sum: [1, 2, 3], wind_speed_10m_max: [15, 16, 17] } }]), { status: 200 });
    }));
    const map = await getNationwideIndiaMap();
    expect(map.states.features[0]).toMatchObject({ properties: { stateName: "Example State" }, geometry: { type: "Polygon" } });
    expect(map.weather.features[0]).toMatchObject({ properties: { temperatureC: 30.5, precipitationMm: 1.2, windSpeedKph: 12, windDirectionDegrees: 145, windGustKph: 19 }, geometry: { type: "Polygon" } });
    expect(map.weather.features[0]?.properties.forecast).toEqual(expect.arrayContaining([expect.objectContaining({ date: "2026-08-24", temperatureMaxC: 31, windSpeedMaxKph: 15 })]));
    expect(map.weather.features.length).toBeGreaterThan(90);
    expect(map.statuses).toMatchObject({ states: "NATIONWIDE REFERENCE BOUNDARIES", weather: "LIVE MODELLED WEATHER, WIND + 3-DAY FORECAST COVERAGE GRID", population: "NATIONWIDE REFERENCE RASTER", terrain: "NATIONWIDE TERRAIN REFERENCE", geology: "UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED", sensitivity: "BROAD ANALYTICAL SENSITIVITY EXTENTS — NOT OFFICIAL ZONES, EVENT IMPACTS, OR FORECASTS" });
    expect(map.geology.features).toEqual([]);
    expect(map.sensitivity.features.map(feature => feature.properties.hazard)).toEqual(expect.arrayContaining(["Earthquake sensitivity", "Landslide sensitivity", "Flood sensitivity"]));
    expect(map.imageCoordinates).toEqual([[68, 37], [98, 37], [98, 6], [68, 6]]);
  });
});
