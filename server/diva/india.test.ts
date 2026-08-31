import { afterEach, describe, expect, it, vi } from "vitest";
import { andhraPradeshDefault, assamDefault, buildIndiaLocationSearch, resolveIndiaDeepLink, resolveIndiaLocationFromSearch, resolveIndiaLocationSelection } from "../../shared/india";
import { getIndiaLocationContext, searchIndiaLocations } from "./india";

afterEach(() => vi.unstubAllGlobals());

describe("India location context", () => {
  it("starts the India-wide workspace at Assam and retains Andhra Pradesh as a supported location", () => {
    expect(assamDefault).toMatchObject({ name: "Assam", category: "State", latitude: 26.2006, longitude: 92.9376 });
    expect(assamDefault.boundingBox).toHaveLength(4);
    expect(andhraPradeshDefault).toMatchObject({ name: "Andhra Pradesh", category: "State", latitude: 15.9129, longitude: 79.74 });
  });

  it("resolves the Nizamabad share-link without silently reverting to Andhra Pradesh", () => {
    expect(resolveIndiaDeepLink("nizamabad")).toMatchObject({ id: "india-nizamabad", name: "Nizamabad", latitude: 18.6725, longitude: 78.0941, address: { state: "Telangana", city: "Nizamabad" } });
  });

  it("resolves the India overview route query to the nationwide map selection", () => {
    expect(resolveIndiaLocationFromSearch("?location=india")).toMatchObject({ id: "india-overview", name: "India", boundingBox: [6.5, 68, 37.2, 98] });
  });

  it("round-trips an arbitrary searched result by canonical ID and serialized location data", () => {
    const searched = { ...andhraPradeshDefault, id: "india-search-17.416-78.435", name: "Banjara Hills", displayName: "Banjara Hills, Hyderabad, Telangana, India", category: "Locality" as const, latitude: 17.4156, longitude: 78.4347, boundingBox: null, address: { state: "Telangana", city: "Hyderabad", locality: "Banjara Hills" }, source: "Nominatim / OpenStreetMap search and boundary context" };
    const query = buildIndiaLocationSearch(searched, "map");
    const resolution = resolveIndiaLocationSelection(query);
    expect(resolution).toMatchObject({ isFallback: false, requested: searched.id });
    expect(resolution.location).toMatchObject({ id: searched.id, name: searched.name, displayName: searched.displayName, latitude: searched.latitude, longitude: searched.longitude, address: searched.address });
    expect(query).toContain("locationId=india-search-17.416-78.435");
  });

  it("flags unknown and malformed deep links instead of silently presenting them as named locations", () => {
    expect(resolveIndiaLocationSelection("?location=not-a-real-place")).toMatchObject({ isFallback: true, requested: "not-a-real-place", location: assamDefault });
    expect(resolveIndiaLocationSelection("?locationData=%7Bbad-json")).toMatchObject({ isFallback: true, location: assamDefault });
  });

  it("shapes state, city, district, and locality search records from source responses", async () => {
    const nominatim = [
      { place_id: 1, display_name: "Andhra Pradesh, India", lat: "15.9", lon: "79.7", addresstype: "state", boundingbox: ["12", "19", "77", "85"], address: { state: "Andhra Pradesh" } },
      { place_id: 2, display_name: "Visakhapatnam, Andhra Pradesh, India", lat: "17.7", lon: "83.3", addresstype: "city", address: { city: "Visakhapatnam", state: "Andhra Pradesh" } },
      { place_id: 3, display_name: "Guntur District, Andhra Pradesh, India", lat: "16.3", lon: "80.4", addresstype: "district", address: { district: "Guntur", state: "Andhra Pradesh" } },
      { place_id: 4, display_name: "Banjara Hills, Hyderabad, Telangana, India", lat: "17.4", lon: "78.4", addresstype: "neighbourhood", address: { neighbourhood: "Banjara Hills", state: "Telangana" } },
    ];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(url.includes("nominatim") ? nominatim : { results: [] }), { status: 200 })));
    const values = await searchIndiaLocations(`test-india-location-${Date.now()}`);
    expect(values.map(item => item.category)).toEqual(expect.arrayContaining(["State", "City", "District", "Locality"]));
    expect(values.find(item => item.category === "State")?.boundingBox).toEqual([12, 77, 19, 85]);
  });

  it("enriches a selected location with its source boundary, environment, and transparent screening context", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("nominatim")) return new Response(JSON.stringify([{ place_id: 9, display_name: "Context Test Province, India", lat: "22", lon: "82", addresstype: "state", boundingbox: ["21", "23", "81", "83"], geojson: { type: "Polygon", coordinates: [[[81, 21], [83, 21], [83, 23], [81, 23], [81, 21]]] }, address: { state: "Context Test Province" } }]), { status: 200 });
      if (url.includes("geocoding-api")) return new Response(JSON.stringify({ results: [] }), { status: 200 });
      if (url.includes("air-quality")) return new Response(JSON.stringify({ current: { us_aqi: 71, pm2_5: 18 } }), { status: 200 });
      return new Response(JSON.stringify({ current: { temperature_2m: 31, precipitation: 2, weather_code: 61, time: "2026-08-23T17:00" }, daily: { time: ["2026-08-24", "2026-08-25"], temperature_2m_min: [24, 25], temperature_2m_max: [33, 34], precipitation_probability_max: [60, 30], precipitation_sum: [8, 2], wind_speed_10m_max: [24, 18], wind_gusts_10m_max: [38, 30], weather_code: [61, 2] } }), { status: 200 });
    }));
    const context = await getIndiaLocationContext({ id: "context-test", name: "Context Test Province", displayName: "Context Test Province, India", category: "State", latitude: 22, longitude: 82, population: null, populationSource: "Unavailable", boundingBox: [21, 81, 23, 83], boundary: null, address: { state: "Context Test Province" }, source: "Test" });
    expect(context.location.boundary?.geometry.type).toBe("Polygon");
    expect(context.environment).toMatchObject({ temperatureC: 31, precipitationMm: 2, usAqi: 71 });
    expect(context.environment.forecast).toEqual(expect.arrayContaining([expect.objectContaining({ date: "2026-08-24", temperatureMaxC: 33, windSpeedMaxKph: 24 })]));
    expect(context.screening).toMatchObject({ status: "LOCATION-SPECIFIC SCREENING CONTEXT", priority: "Low" });
  });

  it("retains a population returned by the overlapping geocoding provider while keeping the boundary-rich result", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("nominatim")) return new Response(JSON.stringify([{ place_id: 21, display_name: "Population Test, India", lat: "17.1", lon: "78.1", addresstype: "city", address: { city: "Population Test", state: "Telangana" } }]), { status: 200 });
      return new Response(JSON.stringify({ results: [{ id: 31, name: "Population Test", latitude: 17.1, longitude: 78.1, population: 456789, admin1: "Telangana", feature_code: "PPLA" }] }), { status: 200 });
    }));
    const values = await searchIndiaLocations(`population-test-${Date.now()}`);
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ population: 456789, populationSource: "Open-Meteo Geocoding API / GeoNames" });
  });

  it("returns typed empty provider results when a provider sends HTML instead of JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><h1>Upstream error</h1></html>", { status: 200, headers: { "content-type": "text/html" } })));
    await expect(searchIndiaLocations(`malformed-provider-${Date.now()}`)).resolves.toEqual([]);
  });

  it("returns a typed Assam context when geocoding providers send HTML instead of JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html><h1>Temporary upstream page</h1></html>", { status: 200, headers: { "content-type": "text/html" } })));
    await expect(getIndiaLocationContext({ id: "india-assam", name: "Assam", displayName: "Assam, India", category: "State", latitude: 26.2006, longitude: 92.9376, population: null, populationSource: "Unavailable", boundingBox: null, boundary: null, address: { state: "Assam" }, source: "Test" })).resolves.toMatchObject({
      location: { name: "Assam", boundary: null },
      environment: { status: "UNAVAILABLE" },
      screening: { status: "LOCATION-SPECIFIC SCREENING CONTEXT" },
    });
  });

  it("returns a typed Assam context when selected-location providers cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(getIndiaLocationContext({ id: "india-assam", name: "Assam", displayName: "Assam, India", category: "State", latitude: 26.2006, longitude: 92.9376, population: null, populationSource: "Unavailable", boundingBox: null, boundary: null, address: { state: "Assam" }, source: "Test" })).resolves.toMatchObject({
      location: { name: "Assam", address: { state: "Assam" }, boundary: null },
      environment: { status: "UNAVAILABLE" },
      screening: { riskLevel: "Unavailable", status: "LOCATION-SPECIFIC SCREENING CONTEXT" },
    });
  });

  it("returns a typed Nizamabad context when selected-location providers cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(getIndiaLocationContext({ id: "india-nizamabad", name: "Nizamabad", displayName: "Nizamabad, Telangana, India", category: "City", latitude: 18.6725, longitude: 78.0941, population: null, populationSource: "Unavailable", boundingBox: null, boundary: null, address: { state: "Telangana", city: "Nizamabad" }, source: "Test" })).resolves.toMatchObject({
      location: { name: "Nizamabad", address: { state: "Telangana" }, boundary: null },
      environment: { status: "UNAVAILABLE" },
      screening: { riskLevel: "Unavailable", status: "LOCATION-SPECIFIC SCREENING CONTEXT" },
    });
  });
});
