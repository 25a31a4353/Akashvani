import { afterEach, describe, expect, it, vi } from "vitest";
import {
  STATE_CONFIGURATIONS,
  getAllStates,
  getStateByCode,
  getStateByName,
  getStateFocusDistricts,
  stateConfigToLocation,
  type IndiaLocation,
} from "../../shared/india";
import {
  getDistrictHierarchy,
  resolveHydrology,
  resolveTerrain,
  categorizeInfrastructure,
  buildProvenance,
  normalizeLocation,
} from "./multiState";

afterEach(() => vi.unstubAllGlobals());

describe("Akashvani Phase 3.1 Multi-State Real Data Foundation", () => {
  // 1. All 13 target states exist
  it("includes all 13 target states in the configuration with hazards, centroids, and zoom levels", () => {
    const targetCodes = [
      "AS", "AP", "MH", "KA", "BR", "JH",
      "MZ", "OD", "CT", "UP", "RJ", "TN", "KL",
    ];

    expect(Object.keys(STATE_CONFIGURATIONS)).toEqual(expect.arrayContaining(targetCodes));
    expect(getAllStates()).toHaveLength(13);

    for (const code of targetCodes) {
      const state = getStateByCode(code);
      expect(state).toBeDefined();
      expect(state?.code).toBe(code);
      expect(state?.name.length).toBeGreaterThan(0);
      expect(state?.centroid).toHaveLength(2);
      expect(state?.defaultZoom).toBeGreaterThan(5);
      expect(state?.primaryHazards.length).toBeGreaterThan(0);
      expect(state?.majorRiverSystems.length).toBeGreaterThan(0);
      expect(state?.focusDistricts.length).toBeGreaterThan(0);
    }
  });

  // 2. Unique state codes and valid coordinates
  it("maintains unique state codes and valid geographical coordinates within India's bounds", () => {
    const states = getAllStates();
    const codes = states.map(s => s.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(states.length);

    for (const state of states) {
      const [lon, lat] = state.centroid;
      expect(lat).toBeGreaterThanOrEqual(5);
      expect(lat).toBeLessThanOrEqual(38);
      expect(lon).toBeGreaterThanOrEqual(68);
      expect(lon).toBeLessThanOrEqual(98);
    }
  });

  // 3. District hierarchy resolver returns districts for any valid state code
  it("district hierarchy resolver returns focus districts for any valid state code and empty for invalid", () => {
    const assamDistricts = getDistrictHierarchy("AS");
    expect(assamDistricts.length).toBeGreaterThan(0);
    expect(assamDistricts.some(d => d.name === "Dhemaji")).toBe(true);
    expect(assamDistricts.some(d => d.name === "Dibrugarh")).toBe(true);
    expect(assamDistricts[0]?.stateCode).toBe("AS");
    expect(assamDistricts[0]?.isFocusDistrict).toBe(true);

    const biharDistricts = getDistrictHierarchy("BR");
    expect(biharDistricts.length).toBeGreaterThan(0);
    expect(biharDistricts.some(d => d.name === "Patna")).toBe(true);
    expect(biharDistricts.some(d => d.name === "Darbhanga")).toBe(true);

    const invalid = getDistrictHierarchy("INVALID_CODE");
    expect(invalid).toEqual([]);
  });

  // 4. NormalizedLocationContext normalizes location data correctly
  it("normalizes location data into a complete NormalizedLocationContext", async () => {
    const loc: IndiaLocation = {
      id: "test-location-1",
      name: "Guwahati",
      displayName: "Guwahati, Kamrup Metropolitan, Assam, India",
      category: "City",
      latitude: 26.1445,
      longitude: 91.7362,
      population: 957352,
      populationSource: "Census of India 2011",
      boundingBox: [26.05, 91.65, 26.25, 91.85],
      boundary: null,
      address: { state: "Assam", district: "Kamrup Metropolitan", city: "Guwahati" },
      source: "OpenStreetMap / Nominatim",
    };

    const normalized = await normalizeLocation(loc, "AS");
    expect(normalized.category).toBe("City");
    expect(normalized.state?.name).toBe("Assam");
    expect(normalized.latitude).toBe(26.1445);
    expect(normalized.longitude).toBe(91.7362);
    expect(normalized.population).toBe(957352);
    expect(normalized.populationStatus).toBe("available");
    expect(normalized.hydrology.basin).toBe("Brahmaputra Basin");
    expect(normalized.hydrology.nearestRiver).toBe("Brahmaputra");
    expect(normalized.provenance.sourceType).toBe("OFFICIAL");
  });

  // 5. Missing population is strictly null, never 0
  it("preserves missing population as strictly null, never defaulting to 0", async () => {
    const loc: IndiaLocation = {
      id: "test-missing-pop",
      name: "Unknown Hamlet",
      displayName: "Unknown Hamlet, Mizoram, India",
      category: "Locality",
      latitude: 23.2,
      longitude: 92.8,
      population: null, // explicitly missing
      populationSource: "No population value supplied by source",
      boundingBox: null,
      boundary: null,
      address: { state: "Mizoram" },
      source: "Test Geocoder",
    };

    const normalized = await normalizeLocation(loc, "MZ");
    expect(normalized.population).toBeNull();
    expect(normalized.population).not.toBe(0);
    expect(normalized.populationStatus).toBe("unavailable");
  });

  // 6. Missing elevation is strictly null, never 0
  it("preserves missing elevation as strictly null, never defaulting to 0", async () => {
    // Stub fetch to simulate API failure/timeout for elevation
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("DEM service connection timed out");
    }));

    const terrain = await resolveTerrain(26.2, 92.9, "AS");
    expect(terrain.elevationMeters).toBeNull();
    expect(terrain.elevationMeters).not.toBe(0);
    expect(terrain.slopeDegrees).toBeNull();
    expect(terrain.confidence).toBe("UNAVAILABLE");
    expect(terrain.status).toBe("UNAVAILABLE");
  });

  // 7. Hydrology resolver returns null for unknown river distance, never 0
  it("hydrology resolver returns null for river distance when outside known monitor range, never 0", () => {
    // Coordinate far outside any mapped river coordinates
    const farCoordinateHydrology = resolveHydrology(0, 0);
    expect(farCoordinateHydrology.nearestRiver).toBeNull();
    expect(farCoordinateHydrology.riverDistanceKm).toBeNull();
    expect(farCoordinateHydrology.riverDistanceKm).not.toBe(0);
    expect(farCoordinateHydrology.basin).toBeNull();
    expect(farCoordinateHydrology.status).toBe("UNAVAILABLE");
  });

  // 8. Kerala search/context resolves with reference validation metadata
  it("resolves Kerala location context with reference validation metadata and West Flowing Rivers basin", async () => {
    const keralaLoc = stateConfigToLocation(STATE_CONFIGURATIONS.KL);
    expect(keralaLoc.name).toBe("Kerala");

    const normalized = await normalizeLocation(keralaLoc, "KL");
    expect(normalized.state?.code).toBe("KL");
    expect(normalized.state?.historicalCaseCandidates).toEqual(
      expect.arrayContaining([expect.stringContaining("Kerala Mega Floods 2018")])
    );
    expect(normalized.hydrology.basin).toContain("West Flowing Rivers");
    expect(normalized.state?.sourceReferences.historicalValidation).toBeDefined();
  });

  // 9. Assam search/context resolves with Brahmaputra valley characteristics
  it("resolves Assam location context with Brahmaputra valley characteristics", async () => {
    const assamLoc = stateConfigToLocation(STATE_CONFIGURATIONS.AS);
    expect(assamLoc.name).toBe("Assam");

    const normalized = await normalizeLocation(assamLoc, "AS");
    expect(normalized.state?.code).toBe("AS");
    expect(normalized.hydrology.basin).toBe("Brahmaputra Basin");
    expect(normalized.state?.primaryHazards).toEqual(
      expect.arrayContaining(["Riverine Flood", "Riverbank Erosion"])
    );
    expect(normalized.state?.majorRiverSystems).toEqual(
      expect.arrayContaining(["Brahmaputra", "Barak"])
    );
  });

  // 10. All 13 states can be normalized without throwing errors
  it("normalizes all 13 states without throwing errors or missing required fields", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (typeof url === "string" && url.includes("elevation")) {
        return new Response(JSON.stringify({ elevation: [250] }), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }));

    const states = getAllStates();
    expect(states).toHaveLength(13);

    for (const state of states) {
      const loc = stateConfigToLocation(state);
      const normalized = await normalizeLocation(loc, state.code);

      expect(normalized).toBeDefined();
      expect(normalized.state?.code).toBe(state.code);
      expect(normalized.category).toBe("State");
      expect(Number.isFinite(normalized.latitude)).toBe(true);
      expect(Number.isFinite(normalized.longitude)).toBe(true);
      expect(normalized.terrain).toBeDefined();
      expect(normalized.hydrology).toBeDefined();
      expect(normalized.provenance).toBeDefined();
      expect(normalized.provenance.sourceType).toBe("OFFICIAL");
    }
  });

  // Helper unit tests for infrastructure and provenance
  it("correctly categorizes OSM infrastructure into typed facilities", () => {
    const rawItems = [
      { id: "1", name: "Civil Hospital", type: "hospital", latitude: 26.1, longitude: 91.7 },
      { id: "2", name: "Fire & Rescue Station", type: "fire_station", latitude: 26.2, longitude: 91.8 },
      { id: "3", name: "Community Cyclone Shelter", type: "shelter", latitude: 26.3, longitude: 91.9 },
      { id: "4", name: "Municipal Water Tank", type: "drinking_water", latitude: 26.4, longitude: 92.0 },
      { id: "5", name: "Brahmaputra Bridge", type: "bridge", latitude: 26.5, longitude: 92.1 },
      { id: "6", name: "Guwahati Junction", type: "railway_station", latitude: 26.6, longitude: 92.2 },
    ];

    const categorized = categorizeInfrastructure(rawItems);
    expect(categorized.totalCount).toBe(6);
    expect(categorized.hospitals).toHaveLength(1);
    expect(categorized.emergencyFacilities).toHaveLength(1);
    expect(categorized.shelters).toHaveLength(1);
    expect(categorized.waterFacilities).toHaveLength(1);
    expect(categorized.bridges).toHaveLength(1);
    expect(categorized.rail).toHaveLength(1);
    expect(categorized.status).toBe("LIVE_OSM_SAMPLE");
  });

  it("builds typed provenance with required metadata", () => {
    const prov = buildProvenance(
      "CEEW 2021 Climate Vulnerability Index",
      "OFFICIAL",
      "HIGH",
      "Council on Energy, Environment and Water district climate vulnerability index",
      "https://www.ceew.in"
    );
    expect(prov.sourceName).toBe("CEEW 2021 Climate Vulnerability Index");
    expect(prov.sourceType).toBe("OFFICIAL");
    expect(prov.confidence).toBe("HIGH");
    expect(prov.provenanceLabel).toContain("Council on Energy");
    expect(prov.spatialResolution).toBeDefined();
  });
});
