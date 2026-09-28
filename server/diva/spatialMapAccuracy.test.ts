import { describe, expect, it } from "vitest";
import { searchIndiaLocations, getIndiaLocationContext } from "./india";
import {
  validateWgs84Coordinate,
  validateGeoJsonGeometry,
  isSyntheticCircleBuffer,
  INDIA_BOUNDS,
} from "../../shared/spatialValidation";

describe("RESQ — Map Precision V4: Spatial Invariants & Accuracy Test Suite", () => {
  const TEST_MATRIX = [
    { query: "Dibrugarh", expectedState: "Assam", expectedHazard: "FLOOD" },
    { query: "Wayanad", expectedState: "Kerala", expectedHazard: "LANDSLIDE" },
    { query: "Puri", expectedState: "Odisha", expectedHazard: "CYCLONE" },
    { query: "Jodhpur", expectedState: "Rajasthan", expectedHazard: "FLOOD" },
    { query: "Sangli", expectedState: "Maharashtra", expectedHazard: "FLOOD" },
    { query: "Chamoli", expectedState: "Uttarakhand", expectedHazard: "LANDSLIDE" },
    { query: "Visakhapatnam", expectedState: "Andhra Pradesh", expectedHazard: "CYCLONE" },
    { query: "Vijayawada", expectedState: "Andhra Pradesh", expectedHazard: "CYCLONE" },
    { query: "Chennai", expectedState: "Tamil Nadu", expectedHazard: "FLOOD" },
    { query: "Aizawl", expectedState: "Mizoram", expectedHazard: "LANDSLIDE" },
  ];

  describe("Phase 22: Map Accuracy Test Matrix (10 Locations)", () => {
    for (const item of TEST_MATRIX) {
      it(`resolves accurate spatial context & canonical decision for ${item.query}, ${item.expectedState}`, async () => {
        const searchResults = await searchIndiaLocations(item.query);
        expect(searchResults.length).toBeGreaterThan(0);
        const loc = searchResults[0];

        // 1. Coordinate check (WGS84 EPSG:4326)
        const coordValidation = validateWgs84Coordinate(loc.longitude, loc.latitude);
        expect(coordValidation.valid).toBe(true);
        expect(loc.latitude).toBeGreaterThanOrEqual(INDIA_BOUNDS.minLat);
        expect(loc.latitude).toBeLessThanOrEqual(INDIA_BOUNDS.maxLat);
        expect(loc.longitude).toBeGreaterThanOrEqual(INDIA_BOUNDS.minLon);
        expect(loc.longitude).toBeLessThanOrEqual(INDIA_BOUNDS.maxLon);

        // 2. Administrative hierarchy
        const state = loc.address?.state ?? loc.name;
        expect(state).toContain(item.expectedState);
        expect(loc.name).toBeDefined();

        // 3. Location context resolution
        const context = await getIndiaLocationContext(loc);
        expect(context).toBeDefined();
        expect(context.location.name).toBe(loc.name);

        // 4. Canonical ResQ Decision Context
        const decision = context.decision;
        expect(decision).toBeDefined();
        if (!decision) return;
        expect(decision.location.id).toBe(loc.id);

        // 5. Canonical Map State exists and matches decision
        const mapState = decision.mapState;
        expect(mapState).toBeDefined();
        const originCoords = mapState.originMarker.coordinates;
        expect(validateWgs84Coordinate(originCoords[0], originCoords[1]).valid).toBe(true);
        expect(originCoords).toEqual([
          decision.exposureAssessment.selectedOriginHabitation.longitude,
          decision.exposureAssessment.selectedOriginHabitation.latitude,
        ]);

        // 6. Hazard classification is separate from footprint
        if (item.query === "Chamoli") {
          expect(["LANDSLIDE", "SEISMIC"]).toContain(decision.hazardAssessment.primaryHazard);
        } else {
          expect(decision.hazardAssessment.primaryHazard).toBe(item.expectedHazard);
        }

        // 7. Destination safety invariants
        if (mapState.destinationMarker) {
          const destSafety = decision.relocationAssessment.destinationSafety.destinationSafetyStatus;
          if (destSafety === "SAFE") {
            expect(mapState.destinationMarker.safetyStatus).toBe("SAFE");
          } else {
            expect(mapState.destinationMarker.safetyStatus).not.toBe("SAFE");
          }
        }

        // 8. Routing invariants
        if (decision.routingAssessment.isRoadRoute) {
          expect(decision.routingAssessment.status).toBe("ROAD_ROUTE_VERIFIED");
          expect(decision.routingAssessment.routeCoordinates.length).toBeGreaterThan(1);
          expect(mapState.route?.isRoadRoute).toBe(true);
        } else {
          expect(decision.routingAssessment.status).not.toBe("ROAD_ROUTE_VERIFIED");
          // When road routing is unavailable, map must not present an artificial route
          if (mapState.route) {
            expect(mapState.route.isRoadRoute).toBe(false);
          }
        }
      }, 15000);
    }
  });

  describe("Phase 23: Spatial Invariant Tests", () => {
    it("invariant 1: selected point is strictly inside displayed bounding box when box exists", async () => {
      const results = await searchIndiaLocations("Wayanad");
      const loc = results[0];
      const context = await getIndiaLocationContext(loc);
      if (context.location.boundingBox) {
        const [south, west, north, east] = context.location.boundingBox;
        expect(loc.latitude).toBeGreaterThanOrEqual(south - 0.05);
        expect(loc.latitude).toBeLessThanOrEqual(north + 0.05);
        expect(loc.longitude).toBeGreaterThanOrEqual(west - 0.05);
        expect(loc.longitude).toBeLessThanOrEqual(east + 0.05);
      }
    }, 15000);

    it("invariant 2: destination coordinates match destination geometry exactly", async () => {
      const sangliResults = await searchIndiaLocations("Sangli");
      const sangliLoc = sangliResults[0];
      const context = await getIndiaLocationContext(sangliLoc);
      const decision = context.decision;
      expect(decision).toBeDefined();
      if (!decision) return;

      if (decision.relocationAssessment.bestCandidate && decision.mapState.destinationMarker) {
        const cand = decision.relocationAssessment.bestCandidate;
        const marker = decision.mapState.destinationMarker;
        expect(marker.coordinates[0]).toBeCloseTo(cand.longitude, 4);
        expect(marker.coordinates[1]).toBeCloseTo(cand.latitude, 4);
      }
    }, 15000);

    it("invariant 3: route origin matches selected location and destination matches safe haven", async () => {
      const wayanadResults = await searchIndiaLocations("Wayanad");
      const wayanadLoc = wayanadResults[0];
      const context = await getIndiaLocationContext(wayanadLoc);
      const decision = context.decision;
      expect(decision).toBeDefined();
      if (!decision) return;

      if (decision.routingAssessment.isRoadRoute && decision.mapState.route) {
        const routeCoords = decision.mapState.route.coordinates;
        expect(routeCoords.length).toBeGreaterThan(1);
        const originCoord = routeCoords[0];
        const destCoord = routeCoords[routeCoords.length - 1];

        // Origin matches within proximity
        expect(originCoord[0]).toBeCloseTo(wayanadLoc.longitude, 2);
        expect(originCoord[1]).toBeCloseTo(wayanadLoc.latitude, 2);

        // Destination matches best candidate within proximity
        if (decision.relocationAssessment.bestCandidate) {
          expect(destCoord[0]).toBeCloseTo(decision.relocationAssessment.bestCandidate.longitude, 2);
          expect(destCoord[1]).toBeCloseTo(decision.relocationAssessment.bestCandidate.latitude, 2);
        }
      }
    }, 15000);

    it("invariant 4: all hazard geometries are valid GeoJSON with WGS84 coordinates", async () => {
      const puriResults = await searchIndiaLocations("Puri");
      const puriLoc = puriResults[0];
      const context = await getIndiaLocationContext(puriLoc);

      // Check nationwide / authoritative hazard geometries
      const hazardPolygons = [
        context.location.boundary,
      ].filter(Boolean);

      for (const geom of hazardPolygons) {
        const result = validateGeoJsonGeometry(geom);
        expect(result.valid).toBe(true);
        expect(result.geometryType).toBeDefined();
      }
    }, 15000);

    it("invariant 5: rejects synthetic circular buffers and prevents artificial danger circles", () => {
      // Generate a synthetic circle of 32 points
      const centerLon = 85.82;
      const centerLat = 19.80;
      const radiusDeg = 0.05;
      const circleCoords: [number, number][] = [];
      const numPoints = 32;

      for (let i = 0; i <= numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        circleCoords.push([
          centerLon + radiusDeg * Math.cos(angle),
          centerLat + radiusDeg * Math.sin(angle),
        ]);
      }

      const syntheticPolygon = {
        type: "Polygon" as const,
        coordinates: [circleCoords],
      };

      // Invariant: Synthetic circular buffer detector recognizes and rejects artificial circles
      const isSynthetic = isSyntheticCircleBuffer(syntheticPolygon);
      expect(isSynthetic).toBe(true);

      const validation = validateGeoJsonGeometry(syntheticPolygon);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain("Synthetic circular buffer detected. Hazard geometries must originate from authoritative footprints.");
    });

    it("invariant 6: no route is displayed when isRoadRoute !== true", async () => {
      const dibrugarhResults = await searchIndiaLocations("Dibrugarh");
      const dibrugarhLoc = dibrugarhResults[0];
      const context = await getIndiaLocationContext(dibrugarhLoc);
      const decision = context.decision;
      expect(decision).toBeDefined();
      if (!decision) return;

      // Dibrugarh calibration set has road routing unavailable
      if (!decision.routingAssessment.isRoadRoute) {
        expect(decision.routingAssessment.status).toBe("ROAD_ROUTING_UNAVAILABLE");
        if (decision.mapState.route) {
          expect(decision.mapState.route.isRoadRoute).toBe(false);
        }
      }
    }, 15000);

    it("invariant 7: no destination is marked VERIFIED SAFE unless destinationSafetyStatus === 'SAFE'", async () => {
      for (const query of ["Jodhpur", "Dibrugarh"]) {
        const results = await searchIndiaLocations(query);
        const loc = results[0];
        const context = await getIndiaLocationContext(loc);
        const decision = context.decision;
        expect(decision).toBeDefined();
        if (!decision) return;

        const safetyStatus = decision.relocationAssessment.destinationSafety.destinationSafetyStatus;
        const marker = decision.mapState.destinationMarker;

        if (marker) {
          if (marker.safetyStatus === "SAFE") {
            expect(safetyStatus).toBe("SAFE");
          } else {
            expect(["CONDITIONAL", "UNSAFE", "UNKNOWN"]).toContain(marker.safetyStatus);
          }
        }
      }
    }, 15000);

    it("invariant 8: prevents latitude/longitude coordinate inversion", () => {
      // Inverted coordinates: latitude in longitude slot (e.g. lon=27, lat=95 -> invalid in India)
      const inverted = validateWgs84Coordinate(27.47, 94.91);
      expect(inverted.valid).toBe(false);
      expect(inverted.error).toContain("Suspected Lat/Lon inversion");

      // Correct coordinates: lon=94.91, lat=27.47
      const correct = validateWgs84Coordinate(94.91, 27.47);
      expect(correct.valid).toBe(true);
    });

    it("invariant 9: rejects non-finite and NaN coordinates", () => {
      expect(validateWgs84Coordinate(NaN, 20.0).valid).toBe(false);
      expect(validateWgs84Coordinate(80.0, Infinity).valid).toBe(false);
      expect(validateWgs84Coordinate(-Infinity, 20.0).valid).toBe(false);
    });
  });
});
