import { describe, expect, it } from "vitest";
import { MAP_MAX_ZOOM, clampMapZoom } from "./DivaMap";
import { findNearestSafeHaven, generateZoneNavigationRoute } from "./zoneNavigationEngine";

describe("DivaMap zoom safety", () => {
  it("keeps map zoom within the supported raster tile range", () => {
    expect(MAP_MAX_ZOOM).toBe(18);
    expect(clampMapZoom(20)).toBe(18);
    expect(clampMapZoom(18)).toBe(18);
    expect(clampMapZoom(-1)).toBe(0);
  });
});

describe("Zone Navigation Engine (Red & Orange Zones to Nearest Safe Haven)", () => {
  it("computes exact road navigation for Wayanad Red Zone to nearest safe shelter", () => {
    const route = generateZoneNavigationRoute({
      name: "Chooralmala Settlement",
      latitude: 11.5375,
      longitude: 76.1689,
      classification: "RED",
      hazardType: "Catastrophic Debris Flow & Landslide",
    });

    expect(route.classification).toBe("RED");
    expect(route.destinationLabel).toContain("Meppadi");
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.travelTimeMinutes).toBeGreaterThan(0);
    expect(route.coordinates.length).toBeGreaterThan(2);
    expect(route.originCoords).toEqual([76.1689, 11.5375]);
    expect(route.isRoadRoute).toBe(true);
  });

  it("computes exact road navigation for Dibrugarh Red Zone to nearest safe shelter", () => {
    const route = generateZoneNavigationRoute({
      name: "Maijan Riverside Habitation",
      latitude: 27.4728,
      longitude: 94.9120,
      classification: "RED",
      hazardType: "Brahmaputra Bank Erosion & Inundation",
    });

    expect(route.classification).toBe("RED");
    expect(route.destinationLabel).toContain("Dikom");
    expect(route.distanceKm).toBeCloseTo(23.6, 1);
    expect(route.travelTimeMinutes).toBe(22);
    expect(route.coordinates.length).toBeGreaterThan(100); // 371 real OSRM road coordinates
  });

  it("computes road connectivity for Chamoli Joshimath Red Zone", () => {
    const route = generateZoneNavigationRoute({
      name: "Joshimath Subsidence Sector",
      latitude: 30.5558,
      longitude: 79.5642,
      classification: "RED",
      hazardType: "Ground Subsidence & Fissuring",
    });

    expect(route.destinationLabel).toContain("Gopeshwar");
    expect(route.distanceKm).toBe(57.8);
    expect(route.travelTimeMinutes).toBe(84);
    expect(route.coordinates.length).toBeGreaterThan(500); // 1688 real road points
  });

  it("computes road connectivity for Puri Orange Zone", () => {
    const route = generateZoneNavigationRoute({
      name: "Puri Coastal Buffer",
      latitude: 19.7902,
      longitude: 85.8274,
      classification: "ORANGE",
      hazardType: "Severe Coastal Surge Vulnerability",
    });

    expect(route.classification).toBe("ORANGE");
    expect(route.destinationLabel).toContain("Puri");
    expect(route.distanceKm).toBeGreaterThan(1);
    expect(route.travelTimeMinutes).toBeGreaterThan(0);
    expect(route.coordinates.length).toBeGreaterThan(2);
  });

  it("computes dynamic safe haven and realistic curved road connection for any arbitrary red or orange zone across India", () => {
    // Arbitrary coordinates in East Godavari, AP
    const route = generateZoneNavigationRoute({
      name: "Godavari Lowland Habitation",
      latitude: 16.9200,
      longitude: 82.2100,
      classification: "ORANGE",
      hazardType: "Riverine Flood Spill",
    });

    expect(route.destinationLabel).toBeDefined();
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.travelTimeMinutes).toBeGreaterThan(0);
    expect(route.coordinates.length).toBe(9); // 8 steps = 9 points
    expect(route.originCoords).toEqual([82.2100, 16.9200]);
  });

  it("filters out hospitals from safe haven candidates so medical facilities are not designated as mass shelters", () => {
    const facilities = [
      { name: "City General Hospital", lat: 12.01, lon: 76.01, role: "HOSPITAL_MEDICAL_SUPPORT", suitability: "PREFERRED" },
      { name: "Community Disaster Shelter", lat: 12.05, lon: 76.05, role: "EMERGENCY_SHELTER", suitability: "PREFERRED" },
    ];
    const haven = findNearestSafeHaven(12.0, 76.0, facilities);
    expect(haven.name).not.toBe("City General Hospital");
    expect(haven.role).not.toBe("HOSPITAL_MEDICAL_SUPPORT");
  });
});

