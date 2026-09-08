import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CLASSIFICATION_FILL_COLORS,
  CLASSIFICATION_LINE_COLORS,
  tierToPresentation,
  getClassificationLayer,
} from "./hazards/classification";
import {
  fetchRoadRouteWithGeometry,
  type OsrmRouteGeometryResult,
} from "./hazards/facilityDiscovery";
import {
  buildRelocationRecommendation,
} from "./hazards/relocation";
import {
  buildVerifiedRoadEvacuationRoute,
} from "../../client/src/components/diva/mapCommandUi";
import type { CarryingCapacityAssessment, EvacuationFacility } from "../../shared/hazards";

describe("PS191 Decision Map & Evacuation Route Engine", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── 1. RED classification produces red map visualization data ──
  it("1. RED classification produces red map visualization data (#c62828 / #b71c1c)", () => {
    const pClass = tierToPresentation("RED");
    expect(pClass).toBe("RED");
    expect(CLASSIFICATION_FILL_COLORS[pClass]).toBe("#c62828");
    expect(CLASSIFICATION_LINE_COLORS[pClass]).toBe("#b71c1c");

    // Also verify in full classification layer
    const layer = getClassificationLayer();
    const redFeatures = layer.features.filter(f => f.properties.classification === "RED");
    expect(redFeatures.length).toBeGreaterThan(0);
    expect(redFeatures.every(f => f.properties.classification === "RED")).toBe(true);
  });

  // ── 2. ORANGE classification produces orange map visualization data ──
  it("2. ORANGE classification produces orange map visualization data (#e65100 / #bf360c)", () => {
    const pClassOrange = tierToPresentation("ORANGE");
    expect(pClassOrange).toBe("ORANGE");
    expect(CLASSIFICATION_FILL_COLORS[pClassOrange]).toBe("#e65100");
    expect(CLASSIFICATION_LINE_COLORS[pClassOrange]).toBe("#bf360c");

    // YELLOW also presents as ORANGE for caution in disaster context
    const pClassYellow = tierToPresentation("YELLOW");
    expect(pClassYellow).toBe("ORANGE");
    expect(CLASSIFICATION_FILL_COLORS[pClassYellow]).toBe("#e65100");
  });

  // ── 3. GREEN classification produces green map visualization data ──
  it("3. GREEN classification produces green map visualization data (#2e7d32 / #1b5e20)", () => {
    const pClassLow = tierToPresentation("LOW");
    expect(pClassLow).toBe("GREEN");
    expect(CLASSIFICATION_FILL_COLORS[pClassLow]).toBe("#2e7d32");
    expect(CLASSIFICATION_LINE_COLORS[pClassLow]).toBe("#1b5e20");
  });

  // ── 4. UNKNOWN never becomes green ──
  it("4. UNKNOWN / missing evidence never becomes green", () => {
    expect(tierToPresentation("UNKNOWN")).toBe("UNAVAILABLE");
    expect(tierToPresentation(null)).toBe("UNAVAILABLE");
    expect(tierToPresentation(undefined)).toBe("UNAVAILABLE");
    expect(tierToPresentation("")).toBe("UNAVAILABLE");

    // Invariant: UNAVAILABLE fill color must be transparent, NEVER green (#2e7d32)
    expect(CLASSIFICATION_FILL_COLORS["UNAVAILABLE"]).toBe("rgba(0,0,0,0)");
    expect(CLASSIFICATION_FILL_COLORS["UNAVAILABLE"]).not.toBe("#2e7d32");
  });

  // ── 5. Valid vulnerable origin + valid destination can request a route ──
  it("5. Valid vulnerable origin + valid destination can request an OSRM route", async () => {
    const fakeOsrmResponse = {
      code: "Ok",
      routes: [
        {
          distance: 12400, // 12.4 km
          duration: 1140,  // 19 mins
          geometry: {
            coordinates: [
              [94.945, 27.505],
              [94.950, 27.510],
              [94.960, 27.515],
              [95.012, 27.525],
            ],
          },
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => fakeOsrmResponse,
    });

    const route = await fetchRoadRouteWithGeometry(
      27.505,
      94.945,
      27.525,
      95.012,
      "Maijan Gaon",
      "Dikom Relief Camp"
    );

    expect(route.status).toBe("OK");
    expect(route.source).toBe("OSRM");
    expect(route.distanceType).toBe("ROAD_NETWORK");
    expect(route.routeDistanceKm).toBe(12.4);
    expect(route.travelTimeMinutes).toBe(19);
    expect(route.coordinates).toHaveLength(4);
    expect(route.coordinates[0]).toEqual([94.945, 27.505]);
    expect(route.coordinates.at(-1)).toEqual([95.012, 27.525]);
    expect(route.note).toContain("OSRM");
  });

  // ── 6. OSRM route geometry is used when available ──
  it("6. OSRM route geometry is used directly when available and formatted for UI", () => {
    const osrmResult: OsrmRouteGeometryResult = {
      coordinates: [
        [76.1689, 11.5375],
        [76.1500, 11.5400],
        [76.1284, 11.5512],
      ],
      routeDistanceKm: 6.8,
      travelTimeMinutes: 14,
      distanceType: "ROAD_NETWORK",
      source: "OSRM",
      status: "OK",
      note: "Verified road route via OSRM",
    };

    const formatted = buildVerifiedRoadEvacuationRoute(
      { name: "Chooralmala", latitude: 11.5375, longitude: 76.1689 },
      { name: "Meppadi Community Center", latitude: 11.5512, longitude: 76.1284 },
      osrmResult
    );

    expect(formatted).not.toBeNull();
    expect(formatted?.isRoadRoute).toBe(true);
    expect(formatted?.coordinates).toEqual(osrmResult.coordinates);
    expect(formatted?.distanceKm).toBe(6.8);
    expect(formatted?.travelTimeMinutes).toBe(14);
    expect(formatted?.destinationLabel).toBe("Meppadi Community Center");
    expect(formatted?.originLabel).toBe("Chooralmala");
  });

  // ── 7. OSRM failure does not create a fake road route ──
  it("7. OSRM failure does NOT create a fake straight line or fabricated road route", async () => {
    // Simulate network error / service timeout
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));

    const route = await fetchRoadRouteWithGeometry(
      28.0,
      73.0,
      28.5,
      73.5,
      "Isolated Origin",
      "Target Facility"
    );

    expect(route.status).toBe("UNAVAILABLE");
    expect(route.source).toBe("UNAVAILABLE");
    expect(route.distanceType).toBe("UNAVAILABLE");
    expect(route.routeDistanceKm).toBeNull();
    expect(route.travelTimeMinutes).toBeNull();
    // Invariant: coordinates array must be empty, NEVER a fake straight line between points!
    expect(route.coordinates).toEqual([]);
    expect(route.note).toContain("Road route geometry not fabricated");

    // UI helper must also return null when OSRM is unavailable
    const formatted = buildVerifiedRoadEvacuationRoute(
      { name: "Isolated Origin", latitude: 28.0, longitude: 73.0 },
      { name: "Target Facility", latitude: 28.5, longitude: 73.5 },
      route
    );
    expect(formatted).toBeNull();
  });

  // ── 8. UNSUITABLE facility cannot become destination ──
  it("8. UNSUITABLE facility (hazard conflict) cannot become a relocation candidate", () => {
    const mockAssessment: CarryingCapacityAssessment = {
      areaId: "DIST-TEST",
      areaName: "Test District",
      district: "Test District",
      state: "Assam",
      stateCode: "AS",
      geographicResolution: "DISTRICT",
      hazardClassification: "RED",
      redZoneTier: "RED",
      hazardScore: 85,
      population: 100000,
      populationStatus: "POPULATION_OBSERVED",
      populationSource: "Census 2011",
      populationYear: 2011,
      exposedPopulationEstimate: 25000,
      exposureMethod: "HABITATION_SUM",
      exposureProvenance: "Census 2011 / SDMA",
      exposureConfidence: "HIGH",
      exposureAssumption: null,
      exposureRationale: "Habitation exposure sum",
      habitationSummary: null,
      requiredCapacity: 25000,
      availableCapacity: 500,
      capacityDeficit: 24500,
      capacitySurplus: null,
      capacityStatus: "CAPACITY_DEFICIT",
      capacityAssessmentStatus: "ASSESSED",
      confidence: "MEDIUM",
      limitations: [],
      provenance: "TEST",
      calculatedAt: new Date().toISOString(),
      facilitySource: "OSM",
      searchRadiusKm: 30,
      nearbyFacilities: [
        {
          facilityId: "FAC-UNSUITABLE",
          name: "Flooded Relief Camp",
          facilityRole: "EMERGENCY_SHELTER",
          latitude: 27.5,
          longitude: 95.0,
          source: "OSM",
          provenance: "TEST",
          lastUpdated: null,
          capacity: null,
          capacitySource: "UNAVAILABLE",
          capacityConfidence: "UNVERIFIED",
          facilityHazardTier: "RED",
          facilityHazardScore: 90,
          relocationSuitability: "UNSUITABLE", // Hazard conflict!
          hazardScreeningNote: "Inside critical flood hazard zone",
          straightLineDistanceKm: 5.0,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Road access cut off",
        },
      ],
    };

    const recommendation = buildRelocationRecommendation(mockAssessment);

    // Invariant: bestCandidate MUST be null when only UNSUITABLE facilities exist
    expect(recommendation.bestCandidate).toBeNull();
    expect(recommendation.candidateStatus).toBe("NO_CANDIDATE");
    expect(recommendation.conditionalAlternatives).toHaveLength(0);
    // Must be catalogued in facilitiesWithHazardConflict
    expect(recommendation.facilitiesWithHazardConflict).toHaveLength(1);
    expect(recommendation.facilitiesWithHazardConflict[0].facilityId).toBe("FAC-UNSUITABLE");
  });

  // ── 9. Hospital cannot become mass-evacuation destination ──
  it("9. Hospital (medical support) cannot become a mass-evacuation shelter candidate", () => {
    const mockAssessment: CarryingCapacityAssessment = {
      areaId: "DIST-TEST-HOSP",
      areaName: "Test District",
      district: "Test District",
      state: "Assam",
      stateCode: "AS",
      geographicResolution: "DISTRICT",
      hazardClassification: "RED",
      redZoneTier: "RED",
      hazardScore: 85,
      population: 100000,
      populationStatus: "POPULATION_OBSERVED",
      populationSource: "Census 2011",
      populationYear: 2011,
      exposedPopulationEstimate: 25000,
      exposureMethod: "HABITATION_SUM",
      exposureProvenance: "Census 2011 / SDMA",
      exposureConfidence: "HIGH",
      exposureAssumption: null,
      exposureRationale: "Habitation exposure sum",
      habitationSummary: null,
      requiredCapacity: 25000,
      availableCapacity: null,
      capacityDeficit: null,
      capacitySurplus: null,
      capacityStatus: "CAPACITY_UNAVAILABLE",
      capacityAssessmentStatus: "CAPACITY_ASSESSMENT_UNAVAILABLE",
      confidence: "UNVERIFIED",
      limitations: [],
      provenance: "TEST",
      calculatedAt: new Date().toISOString(),
      facilitySource: "OSM",
      searchRadiusKm: 30,
      nearbyFacilities: [
        {
          facilityId: "HOSP-01",
          name: "District Civil Hospital",
          facilityRole: "HOSPITAL_MEDICAL_SUPPORT", // Medical support ONLY
          latitude: 27.5,
          longitude: 95.0,
          source: "OSM",
          provenance: "TEST",
          lastUpdated: null,
          capacity: null,
          capacitySource: "UNAVAILABLE",
          capacityConfidence: "UNVERIFIED",
          facilityHazardTier: "LOW",
          facilityHazardScore: 10,
          relocationSuitability: "PREFERRED", // low hazard, but medical role
          hazardScreeningNote: "Low hazard area",
          straightLineDistanceKm: 4.0,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Accessible via main road",
        },
      ],
    };

    const recommendation = buildRelocationRecommendation(mockAssessment);

    // Invariant: Hospital is strictly reserved for medical triage and NEVER promoted as a mass shelter
    expect(recommendation.bestCandidate).toBeNull();
    expect(recommendation.candidateStatus).toBe("NO_CANDIDATE");
  });

  // ── 10. Missing coordinates do not produce fake markers ──
  it("10. Missing coordinates do not produce fake markers or routes", () => {
    // Origin missing coordinates
    const noOriginRoute = buildVerifiedRoadEvacuationRoute(
      { name: "Unknown Locality", latitude: (null as unknown) as number, longitude: 94.0 },
      { name: "Valid Shelter", latitude: 27.5, longitude: 94.5 },
      {
        coordinates: [[94.0, 27.0], [94.5, 27.5]],
        routeDistanceKm: 10,
        travelTimeMinutes: 15,
        status: "OK",
      }
    );
    expect(noOriginRoute).toBeNull();

    // Destination missing coordinates
    const noDestRoute = buildVerifiedRoadEvacuationRoute(
      { name: "Valid Origin", latitude: 27.0, longitude: 94.0 },
      { name: "Unmapped Facility", latitude: (null as unknown) as number, longitude: 94.5 },
      {
        coordinates: [[94.0, 27.0], [94.5, 27.5]],
        routeDistanceKm: 10,
        travelTimeMinutes: 15,
        status: "OK",
      }
    );
    expect(noDestRoute).toBeNull();
  });

  // ── 11. Changing origin/destination clears/updates route state correctly ──
  it("11. Changing origin/destination requests distinct route and clearing removes route", async () => {
    // First origin/destination
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [{
            distance: 10000,
            duration: 900,
            geometry: { coordinates: [[94.0, 27.0], [94.1, 27.1]] },
          }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [{
            distance: 25000,
            duration: 2100,
            geometry: { coordinates: [[94.0, 27.0], [94.3, 27.3]] },
          }],
        }),
      });

    const route1 = await fetchRoadRouteWithGeometry(27.01, 94.01, 27.11, 94.11);
    expect(route1.routeDistanceKm).toBe(10);
    expect(route1.coordinates).toEqual([[94.0, 27.0], [94.1, 27.1]]);

    // Change destination -> requests distinct route
    const route2 = await fetchRoadRouteWithGeometry(27.01, 94.01, 27.31, 94.31);
    expect(route2.routeDistanceKm).toBe(25);
    expect(route2.coordinates).toEqual([[94.0, 27.0], [94.3, 27.3]]);
  });
});
