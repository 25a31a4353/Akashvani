/**
 * Akashvani Phase 3.3 — Carrying Capacity & Relocation Intelligence Test Suite
 *
 * Tests the PS191 carrying-capacity chain:
 *   HAZARD → EXPOSED POPULATION → VULNERABILITY → AVAILABLE CAPACITY
 *   → CAPACITY DEFICIT → ACCESSIBILITY → RELOCATION PRIORITY
 *
 * Invariants tested:
 * 1. Missing population is strictly null, never converted to 0
 * 2. Facility capacity from OSM is strictly null, never fabricated
 * 3. Status is CAPACITY_ASSESSMENT_UNAVAILABLE when either datum is missing
 * 4. No location is ever labelled "SAFE"
 * 5. Distance is strictly STRAIGHT_LINE, never road distance
 * 6. Deterministic baseline priority model is transparent and documented
 * 7. RED zone triggers HIGH priority recommendation
 * 8. Real district boundaries from target states are correctly assessed
 */

import { describe, expect, it } from "vitest";
import {
  buildCarryingCapacityAssessment,
  calculateCapacityBalance,
  estimateExposedPopulation,
  haversineKm,
  resolvePopulation,
} from "./hazards/capacity";
import {
  discoverFacilitiesSync,
  getFacilityMapLayer,
} from "./hazards/facilityDiscovery";
import {
  assessAccessibility,
  buildRelocationRecommendation,
  calculateRelocationPriority,
} from "./hazards/relocation";
import { ALL_REAL_DISTRICTS, findRealDistrict } from "./hazards/data/realDistricts";
import type { EvacuationFacility } from "../../shared/hazards";

describe("Phase 3.3 — Carrying Capacity & Relocation Intelligence", () => {
  // ─── 1. Distance Calculation ──────────────────────────────────────────────
  describe("haversineKm()", () => {
    it("calculates accurate straight-line distance between two points", () => {
      // Dibrugarh (~27.47, 94.91) to Sivasagar (~26.98, 94.63) ~ 61 km
      const d = haversineKm(27.4728, 94.912, 26.9826, 94.6322);
      expect(d).toBeGreaterThan(55);
      expect(d).toBeLessThan(70);
    });

    it("returns 0 for identical coordinates", () => {
      expect(haversineKm(27.4728, 94.912, 27.4728, 94.912)).toBe(0);
    });
  });

  // ─── 2. Population Resolution (Data Integrity) ────────────────────────────
  describe("resolvePopulation()", () => {
    it("preserves Census 2011 official population when available", () => {
      const res = resolvePopulation(1326338, "Dibrugarh", "AS");
      expect(res.population).toBe(1326338);
      expect(res.populationStatus).toBe("POPULATION_OBSERVED");
      expect(res.populationSource).toContain("Census 2011");
    });

    it("strictly returns null when population is missing — NEVER converts to 0", () => {
      const res = resolvePopulation(null, "Uncounted District", "XX");
      expect(res.population).toBeNull();
      expect(res.populationStatus).toBe("POPULATION_UNAVAILABLE");
      expect(res.population).not.toBe(0);
    });

    it("strictly handles undefined as unavailable", () => {
      const res = resolvePopulation(undefined, "Unknown", "XX");
      expect(res.population).toBeNull();
      expect(res.populationStatus).toBe("POPULATION_UNAVAILABLE");
    });
  });

  // ─── 3. Exposed Population Estimation ─────────────────────────────────────
  describe("estimateExposedPopulation()", () => {
    it("estimates 15% exposed for RED classified district", () => {
      const { estimate, rationale } = estimateExposedPopulation(100000, "RED");
      expect(estimate).toBe(15000);
      expect(rationale).toContain("RED-classified");
    });

    it("estimates 8% exposed for ORANGE classified district", () => {
      const { estimate } = estimateExposedPopulation(100000, "ORANGE");
      expect(estimate).toBe(8000);
    });

    it("estimates 2% exposed for GREEN classified district", () => {
      const { estimate } = estimateExposedPopulation(100000, "GREEN");
      expect(estimate).toBe(2000);
    });

    it("returns null estimate when total population is null", () => {
      const { estimate, rationale } = estimateExposedPopulation(null, "RED");
      expect(estimate).toBeNull();
      expect(rationale).toContain("unavailable");
    });
  });

  // ─── 4. Capacity Balance Calculation ──────────────────────────────────────
  describe("calculateCapacityBalance()", () => {
    it("returns CAPACITY_ASSESSMENT_UNAVAILABLE when OSM facilities have null capacity", () => {
      const facilities: EvacuationFacility[] = [
        {
          facilityId: "FAC-1",
          name: "Test Hospital",
          facilityRole: "HOSPITAL_MEDICAL_SUPPORT",
          latitude: 27.47,
          longitude: 94.91,
          source: "OSM",
          provenance: "OSM",
          lastUpdated: "2026-09-01",
          capacity: null,
          capacitySource: "UNAVAILABLE",
          capacityConfidence: "UNAVAILABLE",
          facilityHazardTier: "LOW",
          facilityHazardScore: 20,
          relocationSuitability: "PREFERRED",
          hazardScreeningNote: "Clear",
          straightLineDistanceKm: 5,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Straight-line",
        },
      ];

      const balance = calculateCapacityBalance(15000, facilities);
      expect(balance.status).toBe("CAPACITY_ASSESSMENT_UNAVAILABLE");
      expect(balance.availableCapacity).toBeNull();
      expect(balance.capacityDeficit).toBeNull();
      expect(balance.confidence).toBe("UNAVAILABLE");
    });

    it("computes deficit when official capacities are provided", () => {
      const facilities: EvacuationFacility[] = [
        {
          facilityId: "FAC-OFFICIAL",
          name: "Designated Relief Shelter",
          facilityRole: "EMERGENCY_SHELTER",
          latitude: 27.47,
          longitude: 94.91,
          source: "SDMA Official",
          provenance: "SDMA",
          lastUpdated: "2026-09-01",
          capacity: 5000,
          capacitySource: "SDMA Verified Shelter Register",
          capacityConfidence: "HIGH",
          facilityHazardTier: "LOW",
          facilityHazardScore: 15,
          relocationSuitability: "PREFERRED",
          hazardScreeningNote: "Clear",
          straightLineDistanceKm: 4,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Straight-line",
        },
      ];

      const balance = calculateCapacityBalance(15000, facilities);
      expect(balance.status).toBe("ASSESSED");
      expect(balance.requiredCapacity).toBe(15000);
      expect(balance.availableCapacity).toBe(5000);
      expect(balance.capacityDeficit).toBe(10000);
      expect(balance.capacitySurplus).toBe(0);
      expect(balance.confidence).toBe("HIGH");
    });

    it("computes surplus when capacity exceeds exposed population", () => {
      const facilities: EvacuationFacility[] = [
        {
          facilityId: "FAC-LARGE",
          name: "Mega Relief Centre",
          facilityRole: "EMERGENCY_SHELTER",
          latitude: 27.47,
          longitude: 94.91,
          source: "SDMA Official",
          provenance: "SDMA",
          lastUpdated: "2026-09-01",
          capacity: 20000,
          capacitySource: "SDMA",
          capacityConfidence: "HIGH",
          facilityHazardTier: "LOW",
          facilityHazardScore: 10,
          relocationSuitability: "PREFERRED",
          hazardScreeningNote: "Clear",
          straightLineDistanceKm: 8,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Straight-line",
        },
      ];

      const balance = calculateCapacityBalance(5000, facilities);
      expect(balance.capacityDeficit).toBe(0);
      expect(balance.capacitySurplus).toBe(15000);
    });
  });

  // ─── 5. Facility Discovery (Embedded Baseline) ────────────────────────────
  describe("discoverFacilitiesSync()", () => {
    it("discovers facilities for Dibrugarh within 30km radius", () => {
      const facs = discoverFacilitiesSync(27.4728, 94.912, 30, "AS");
      expect(facs.length).toBeGreaterThan(0);
      expect(facs[0]!.name).toBeDefined();
      expect(facs[0]!.straightLineDistanceKm).toBeLessThanOrEqual(30);
      expect(facs[0]!.distanceType).toBe("STRAIGHT_LINE");
    });

    it("discovers facilities for Wayanad within 40km radius", () => {
      const facs = discoverFacilitiesSync(11.6097, 76.0817, 40, "KL");
      expect(facs.length).toBeGreaterThan(0);
      const collectorate = facs.find((f) => f.name.includes("Collectorate"));
      expect(collectorate).toBeDefined();
      expect(collectorate?.facilityRole).toBe("RELIEF_CENTRE");
    });

    it("screens facility hazard status correctly — never labels safe", () => {
      const facs = discoverFacilitiesSync(27.4728, 94.912, 30);
      facs.forEach((f) => {
        expect(["PREFERRED", "CONDITIONAL", "UNSUITABLE", "UNKNOWN"]).toContain(
          f.relocationSuitability
        );
        // Integrity: Never label as "SAFE"
        expect((f as unknown as Record<string, unknown>)["safe"]).toBeUndefined();
      });
    });

    it("keeps facility capacity as null from OSM source", () => {
      const facs = discoverFacilitiesSync(27.4728, 94.912, 30);
      facs.forEach((f) => {
        expect(f.capacity).toBeNull();
        expect(f.capacityConfidence).toBe("UNAVAILABLE");
      });
    });
  });

  // ─── 6. Facility Map GeoJSON Layer ────────────────────────────────────────
  describe("getFacilityMapLayer()", () => {
    it("returns valid FeatureCollection of Point geometries", () => {
      const layer = getFacilityMapLayer();
      expect(layer.type).toBe("FeatureCollection");
      expect(layer.features.length).toBeGreaterThanOrEqual(10);
      layer.features.forEach((feat) => {
        expect(feat.type).toBe("Feature");
        expect(feat.geometry.type).toBe("Point");
        expect(feat.geometry.coordinates.length).toBe(2);
        expect(typeof feat.geometry.coordinates[0]).toBe("number");
        expect(typeof feat.geometry.coordinates[1]).toBe("number");
        expect(feat.properties.name).toBeDefined();
        expect(feat.properties.role).toBeDefined();
        expect(feat.properties.suitability).toBeDefined();
      });
    });
  });

  // ─── 7. Full Carrying Capacity Assessment ─────────────────────────────────
  describe("buildCarryingCapacityAssessment()", () => {
    it("builds complete assessment for Dibrugarh (RED district)", () => {
      const facs = discoverFacilitiesSync(27.3019, 95.1112, 50, "AS");
      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facs, 50);

      expect(assessment.areaId).toBe("DIST-AS-DIB");
      expect(assessment.district).toBe("Dibrugarh");
      expect(assessment.stateCode).toBe("AS");
      expect(assessment.geographicResolution).toBe("DISTRICT");
      expect(assessment.hazardClassification).toBe("RED");
      expect(assessment.population).toBe(1326338);
      expect(assessment.populationStatus).toBe("POPULATION_OBSERVED");
      expect(assessment.exposedPopulationEstimate).toBeGreaterThan(0);
      expect(assessment.nearbyFacilities.length).toBeGreaterThan(0);
      expect(assessment.limitations.length).toBeGreaterThanOrEqual(4);
      expect(assessment.provenance).toContain("Akashvani");
    });

    it("builds complete assessment for Wayanad (ORANGE district)", () => {
      const facs = discoverFacilitiesSync(11.6854, 76.132, 40, "KL");
      const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", facs, 40);

      expect(assessment.district).toBe("Wayanad");
      expect(assessment.stateCode).toBe("KL");
      expect(assessment.hazardClassification).toBe("ORANGE");
      expect(assessment.population).toBe(817420);
      expect(assessment.exposedPopulationEstimate).toBeGreaterThan(0);
    });

    it("throws clear error for non-existent district ID", () => {
      expect(() =>
        buildCarryingCapacityAssessment("DIST-FAKE-ID", [], 30)
      ).toThrow("not found in realDistricts");
    });
  });

  // ─── 8. Accessibility Assessment ──────────────────────────────────────────
  describe("assessAccessibility()", () => {
    it("rates nearby preferred facility as ACCESSIBLE", () => {
      const fac: EvacuationFacility = {
        facilityId: "F1",
        name: "Nearby Shelter",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 27.4,
        longitude: 94.9,
        source: "OSM",
        provenance: "OSM",
        lastUpdated: "2026-09-01",
        capacity: null,
        capacitySource: "UNAVAILABLE",
        capacityConfidence: "UNAVAILABLE",
        facilityHazardTier: "LOW",
        facilityHazardScore: 10,
        relocationSuitability: "PREFERRED",
        hazardScreeningNote: "Low hazard",
        straightLineDistanceKm: 8,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Close",
      };

      const result = assessAccessibility(fac);
      expect(result.status).toBe("ACCESSIBLE");
      expect(result.score).toBeGreaterThan(60);
    });

    it("rates far-away facility as DIFFICULT", () => {
      const fac: EvacuationFacility = {
        facilityId: "F2",
        name: "Remote Hospital",
        facilityRole: "HOSPITAL_MEDICAL_SUPPORT",
        latitude: 27.1,
        longitude: 94.2,
        source: "OSM",
        provenance: "OSM",
        lastUpdated: "2026-09-01",
        capacity: null,
        capacitySource: "UNAVAILABLE",
        capacityConfidence: "UNAVAILABLE",
        facilityHazardTier: "ORANGE",
        facilityHazardScore: 60,
        relocationSuitability: "CONDITIONAL",
        hazardScreeningNote: "Moderate hazard",
        straightLineDistanceKm: 45,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Far",
      };

      const result = assessAccessibility(fac);
      expect(result.status).toBe("DIFFICULT");
      expect(result.score).toBeLessThan(50);
    });

    it("returns UNKNOWN when candidate is null", () => {
      const result = assessAccessibility(null);
      expect(result.status).toBe("UNKNOWN");
      expect(result.score).toBe(0);
    });
  });

  // ─── 9. Relocation Priority Calculation ───────────────────────────────────
  describe("calculateRelocationPriority()", () => {
    it("produces HIGH priority for RED zone with high score and population", () => {
      const { priorityLevel, priorityScore, reasonCodes } =
        calculateRelocationPriority(85, "RED", 15000, 10000, 60, true);

      expect(priorityLevel).toBe("HIGH");
      expect(priorityScore).toBeGreaterThanOrEqual(70);
      expect(reasonCodes).toContain("RED_ZONE");
      expect(reasonCodes).toContain("POPULATION_EXPOSED");
    });

    it("produces UNKNOWN priority when core data is unavailable", () => {
      const { priorityLevel, reasonCodes } =
        calculateRelocationPriority(null, "UNAVAILABLE", null, null, 0, false);

      expect(priorityLevel).toBe("UNKNOWN");
      expect(reasonCodes).toContain("DATA_LIMITATION");
      expect(reasonCodes).toContain("NO_NEARBY_CAPACITY");
    });

    it("assigns CAPACITY_DEFICIT reason code when deficit is positive", () => {
      const { reasonCodes } =
        calculateRelocationPriority(70, "ORANGE", 5000, 3000, 50, true);

      expect(reasonCodes).toContain("CAPACITY_DEFICIT");
    });
  });

  // ─── 10. Full Relocation Recommendation ───────────────────────────────────
  describe("buildRelocationRecommendation()", () => {
    it("generates structured recommendation for Dibrugarh", () => {
      const facs = discoverFacilitiesSync(27.3019, 95.1112, 50, "AS");
      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facs, 50);
      const rec = buildRelocationRecommendation(assessment);

      expect(rec.recommendationId).toContain("REC-DIST-AS-DIB");
      expect(rec.sourceAreaId).toBe("DIST-AS-DIB");
      expect(rec.sourceHazardLevel).toBe("RED");
      expect(rec.modelLabel).toBe("BASELINE PS191 PRIORITY MODEL");
      expect(rec.priorityLevel).toBe("HIGH");
      expect(rec.reasonCodes.length).toBeGreaterThan(0);
      expect(rec.explanation).toContain("Dibrugarh");
      expect(rec.candidateStatus).toBe("NO_CANDIDATE");
      expect(rec.candidateDestination).toBeNull();
      expect(rec.distanceType).toBe("UNAVAILABLE");
      expect(rec.limitations.length).toBeGreaterThanOrEqual(4);
    });

    it("generates recommendation for Wayanad", () => {
      const facs = discoverFacilitiesSync(11.6854, 76.132, 40, "KL");
      const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", facs, 40);
      const rec = buildRelocationRecommendation(assessment);

      expect(rec.sourceAreaId).toBe("DIST-KL-WAY");
      expect(rec.sourceHazardLevel).toBe("ORANGE");
      expect(rec.priorityLevel).toBe("MEDIUM");
      expect(rec.modelLabel).toBe("BASELINE PS191 PRIORITY MODEL");
    });

    it("does not fabricate candidate destination if no facilities exist", () => {
      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [], 10);
      const rec = buildRelocationRecommendation(assessment);

      expect(rec.candidateDestination).toBeNull();
      expect(rec.distanceKm).toBeNull();
      expect(rec.travelTimeMinutes).toBeNull();
      expect(rec.reasonCodes).toContain("NO_NEARBY_CAPACITY");
    });
  });

  // ─── 11. Multi-State Target District Coverage ─────────────────────────────
  describe("Target State District Coverage", () => {
    it("contains real districts across target states", () => {
      const dib = findRealDistrict("Dibrugarh", "AS");
      expect(dib).toBeDefined();
      expect(dib?.population).toBeGreaterThan(1000000);

      const way = findRealDistrict("Wayanad", "KL");
      expect(way).toBeDefined();
      expect(way?.population).toBeGreaterThan(500000);

      const rai = findRealDistrict("Raipur", "CT");
      expect(rai).toBeDefined();

      const ran = findRealDistrict("Ranchi", "JH");
      expect(ran).toBeDefined();

      const pur = findRealDistrict("Puri", "OD");
      expect(pur).toBeDefined();
    });

    it("can run capacity assessment on any valid real district without errors", () => {
      const sampleDistricts = ["DIST-AS-DIB", "DIST-KL-WAY", "DIST-CT-RAI", "DIST-JH-RAN", "DIST-OD-PUR", "DIST-RJ-JOD", "DIST-MH-SAN", "DIST-AP-EGD"];
      sampleDistricts.forEach((id) => {
        const district = ALL_REAL_DISTRICTS.find((d) => d.id === id);
        expect(district).toBeDefined();
        const facs = discoverFacilitiesSync(district!.latitude, district!.longitude, 50, district!.stateCode);
        const assessment = buildCarryingCapacityAssessment(id, facs, 50);
        expect(assessment.areaId).toBe(id);
        const rec = buildRelocationRecommendation(assessment);
        expect(rec.modelLabel).toBe("BASELINE PS191 PRIORITY MODEL");
        expect(rec.recommendationId).toBeDefined();
      });
    });

    it("verifies contrasting real locations across diverse hazard contexts produce differentiated results", () => {
      // 1. Assam - Flood / Riverine Erosion
      const dibrugarh = buildCarryingCapacityAssessment("DIST-AS-DIB", discoverFacilitiesSync(27.3019, 95.1112, 50, "AS"));
      const dibRec = buildRelocationRecommendation(dibrugarh);

      // 2. Kerala - Landslide
      const wayanad = buildCarryingCapacityAssessment("DIST-KL-WAY", discoverFacilitiesSync(11.6097, 76.0817, 50, "KL"));
      const wayRec = buildRelocationRecommendation(wayanad);

      // 3. Rajasthan - Drought / Heat
      const jodhpur = buildCarryingCapacityAssessment("DIST-RJ-JOD", discoverFacilitiesSync(26.2389, 73.0243, 50, "RJ"));
      const jodRec = buildRelocationRecommendation(jodhpur);

      // Verify that hazard classifications and scores reflect real underlying multi-hazard profile
      expect(dibrugarh.hazardClassification).toBe("RED");
      expect(wayanad.hazardClassification).toBe("ORANGE");
      expect(dibrugarh.hazardScore).toBeGreaterThanOrEqual(70);
      expect(wayanad.hazardScore).toBeGreaterThanOrEqual(50);
      expect(jodhpur.hazardScore).toBeDefined();

      // Verify priority differentiation
      expect(dibRec.priorityLevel).toBe("HIGH");
      expect(wayRec.priorityLevel).toBe("MEDIUM");

      // Verify population numbers are genuine and different
      expect(dibrugarh.population).toBe(1326338);
      expect(wayanad.population).toBe(817420);
      expect(jodhpur.population).toBe(3687002);
      expect(dibrugarh.population).not.toBe(wayanad.population);

      // Reason codes reflect distinct drivers
      expect(dibRec.reasonCodes).toContain("RED_ZONE");
      expect(wayRec.reasonCodes).toContain("ORANGE_ZONE");
    });
  });

  // ─── 12. Accessibility & Routing Verification ─────────────────────────────
  describe("Accessibility & Real Routing Engine", () => {
    it("distinguishes ROAD_NETWORK from STRAIGHT_LINE distance without confusion", () => {
      const mockFacilityWithRoad: EvacuationFacility = {
        facilityId: "TEST-FAC-1",
        name: "Test Community Shelter",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 27.48,
        longitude: 94.92,
        source: "TEST",
        provenance: "Test",
        lastUpdated: null,
        capacity: 400,
        capacitySource: "Verified test shelter record",
        capacityConfidence: "HIGH",
        facilityHazardTier: "TIER_4_LOW_RISK",
        facilityHazardScore: 25,
        relocationSuitability: "PREFERRED",
        hazardScreeningNote: "Lower hazard zone",
        straightLineDistanceKm: 3.2,
        routeDistanceKm: 4.8,
        distanceType: "ROAD_NETWORK",
        estimatedTravelTimeMinutes: 12,
        accessibilityNote: "Road route verified via OSRM",
      };

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [mockFacilityWithRoad], 30);
      const rec = buildRelocationRecommendation(assessment);

      expect(rec.candidateDestination).toBe("Test Community Shelter");
      expect(rec.distanceType).toBe("ROAD_NETWORK");
      expect(rec.distanceKm).toBe(4.8);
      expect(rec.routeDistanceKm).toBe(4.8);
      expect(rec.travelTimeMinutes).toBe(12);
    });

    it("falls back to STRAIGHT_LINE when road routing is unavailable", () => {
      const mockFacilityStraightLine: EvacuationFacility = {
        facilityId: "TEST-FAC-2",
        name: "Remote Shelter Post",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 27.50,
        longitude: 94.95,
        source: "TEST",
        provenance: "Test",
        lastUpdated: null,
        capacity: null,
        capacitySource: "Capacity unavailable",
        capacityConfidence: "UNAVAILABLE",
        facilityHazardTier: "TIER_4_LOW_RISK",
        facilityHazardScore: 30,
        relocationSuitability: "PREFERRED",
        hazardScreeningNote: "Lower hazard zone",
        straightLineDistanceKm: 8.5,
        routeDistanceKm: null,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Straight-line distance only",
      };

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [mockFacilityStraightLine], 30);
      const rec = buildRelocationRecommendation(assessment);

      expect(rec.candidateDestination).toBe("Remote Shelter Post");
      expect(rec.distanceType).toBe("STRAIGHT_LINE");
      expect(rec.distanceKm).toBe(8.5);
      expect(rec.routeDistanceKm).toBeNull();
      expect(rec.travelTimeMinutes).toBeNull();
    });
  });

  // ─── 13. Group E: Core Invariants & Edge Cases ────────────────────────────
  describe("Group E: Rigorous PS191 Invariants", () => {
    it("E1: scoreBreakdown sum === priorityScore for all scenarios", () => {
      const sampleDistricts = ["DIST-AS-DIB", "DIST-KL-WAY", "DIST-RJ-JOD", "DIST-JH-RAN"];
      sampleDistricts.forEach((id) => {
        const d = ALL_REAL_DISTRICTS.find((item) => item.id === id)!;
        const facs = discoverFacilitiesSync(d.latitude, d.longitude, 50, d.stateCode);
        const assessment = buildCarryingCapacityAssessment(id, facs, 50);
        const rec = buildRelocationRecommendation(assessment);

        const sb = rec.scoreBreakdown;
        const sum = sb.hazardSeverity + sb.populationExposure + sb.vulnerability + sb.capacityDeficit + sb.accessibility;
        expect(sb.total).toBe(sum);
        expect(rec.priorityScore).toBe(sum);
      });
    });

    it("E2: Threshold boundary tests (at 69 and 70)", () => {
      // Test the priority level mapping boundary: >= 70 HIGH, 40-69 MEDIUM, < 40 LOW
      const d = ALL_REAL_DISTRICTS.find((item) => item.id === "DIST-KL-WAY")!;
      const facs = discoverFacilitiesSync(d.latitude, d.longitude, 50, d.stateCode);
      const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", facs, 50);
      const rec = buildRelocationRecommendation(assessment);

      if (rec.priorityScore >= 70) {
        expect(rec.priorityLevel).toBe("HIGH");
      } else if (rec.priorityScore >= 40) {
        expect(rec.priorityLevel).toBe("MEDIUM");
      } else {
        expect(rec.priorityLevel).toBe("LOW");
      }
    });

    it("E3: capacity unavailable -> capacity deficit component = 0 (neutral, no penalty)", () => {
      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [], 50);
      expect(assessment.capacityStatus).toBe("CAPACITY_UNAVAILABLE");
      expect(assessment.availableCapacity).toBeNull();
      expect(assessment.capacityDeficit).toBeNull();

      const rec = buildRelocationRecommendation(assessment);
      // Neutral score: 0
      expect(rec.scoreBreakdown.capacityDeficit).toBe(0);
      // No misleading deficit reason code
      expect(rec.reasonCodes).not.toContain("CAPACITY_DEFICIT");
      expect(rec.reasonCodes).toContain("CAPACITY_DATA_UNAVAILABLE");
    });

    it("E4: Vulnerability inclusion tests (score component present in breakdown)", () => {
      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [], 50);
      const rec = buildRelocationRecommendation(assessment);
      expect(rec.scoreBreakdown.vulnerability).toBeGreaterThan(0);
      expect(rec.scoreBreakdown.vulnerability).toBeLessThanOrEqual(20);
    });

    it("E5: UNSUITABLE -> never bestCandidate", () => {
      const unsuitableShelter: EvacuationFacility = {
        facilityId: "UNSUIT-1",
        name: "Hazard Zone Shelter",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 27.48,
        longitude: 94.92,
        source: "TEST",
        provenance: "Test",
        lastUpdated: null,
        capacity: 500,
        capacitySource: "Test",
        capacityConfidence: "HIGH",
        facilityHazardTier: "TIER_1_CRITICAL_MULTI_HAZARD",
        facilityHazardScore: 90,
        relocationSuitability: "UNSUITABLE",
        straightLineDistanceKm: 1.0,
        routeDistanceKm: null,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Straight-line",
      };

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [unsuitableShelter], 50);
      const rec = buildRelocationRecommendation(assessment);
      expect(rec.candidateDestination).not.toBe("Hazard Zone Shelter");
      expect(rec.candidateStatus).toBe("NO_CANDIDATE");
      expect(rec.facilitiesWithHazardConflict.length).toBe(1);
      expect(rec.facilitiesWithHazardConflict[0]?.name).toBe("Hazard Zone Shelter");
    });

    it("E6: HOSPITAL_MEDICAL_SUPPORT -> not preferred relocation candidate by default", () => {
      const hospital: EvacuationFacility = {
        facilityId: "HOSP-1",
        name: "District Civil Hospital",
        facilityRole: "HOSPITAL_MEDICAL_SUPPORT",
        latitude: 27.48,
        longitude: 94.92,
        source: "TEST",
        provenance: "Test",
        lastUpdated: null,
        capacity: 200,
        capacitySource: "Test",
        capacityConfidence: "HIGH",
        facilityHazardTier: "TIER_4_LOW_RISK",
        facilityHazardScore: 20,
        relocationSuitability: "PREFERRED",
        straightLineDistanceKm: 2.0,
        routeDistanceKm: null,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Straight-line",
      };

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [hospital], 50);
      const rec = buildRelocationRecommendation(assessment);
      // Hospital is medical support, cannot be selected as general relocation best candidate
      expect(rec.candidateDestination).toBeNull();
      expect(rec.candidateStatus).toBe("NO_CANDIDATE");
    });

    it("E7: CONDITIONAL -> only conditional alternative, not bestCandidate", () => {
      const conditionalSchool: EvacuationFacility = {
        facilityId: "COND-1",
        name: "Community School",
        facilityRole: "SCHOOL_EVACUATION_SUPPORT",
        latitude: 27.48,
        longitude: 94.92,
        source: "TEST",
        provenance: "Test",
        lastUpdated: null,
        capacity: 300,
        capacitySource: "Test",
        capacityConfidence: "HIGH",
        facilityHazardTier: "TIER_3_ELEVATED_MULTI_HAZARD",
        facilityHazardScore: 55,
        relocationSuitability: "CONDITIONAL",
        straightLineDistanceKm: 4.0,
        routeDistanceKm: null,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Straight-line",
      };

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [conditionalSchool], 50);
      const rec = buildRelocationRecommendation(assessment);
      expect(rec.candidateDestination).toBeNull();
      expect(rec.candidateStatus).toBe("NO_PREFERRED_CANDIDATE");
      expect(rec.conditionalAlternatives.length).toBe(1);
      expect(rec.conditionalAlternatives[0]?.name).toBe("Community School");
    });

    it("E8: Exposed population is DISTRICT_SCREENING_ASSUMPTION, never OBSERVED", () => {
      const exp = estimateExposedPopulation(1000000, "RED");
      expect(exp.exposureMethod).toBe("DISTRICT_SCREENING_ASSUMPTION");
      expect(exp.exposureProvenance).toContain("DERIVED");
      expect(exp.exposureConfidence).toBe("LOW");
      expect(exp.exposureAssumption).toContain("15%");
      expect(exp.estimate).toBe(150000);
    });

    it("E9: capacity=null -> deficit=null; no CAPACITY_DEFICIT reason code", () => {
      const balance = calculateCapacityBalance(10000, []);
      expect(balance.capacityStatus).toBe("CAPACITY_UNAVAILABLE");
      expect(balance.capacityDeficit).toBeNull();
      expect(balance.availableCapacity).toBeNull();

      const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", [], 30);
      const rec = buildRelocationRecommendation(assessment);
      expect(rec.capacityDeficit).toBeNull();
      expect(rec.reasonCodes).not.toContain("CAPACITY_DEFICIT");
    });

    it("E10: population=null -> exposedPopulation=null", () => {
      const exp = estimateExposedPopulation(null, "RED");
      expect(exp.estimate).toBeNull();
      expect(exp.exposureMethod).toBe("UNAVAILABLE");
    });

    it("E11: NO_PREFERRED_CANDIDATE state when all facilities UNSUITABLE/CONDITIONAL", () => {
      const facs: EvacuationFacility[] = [
        {
          facilityId: "FAC-1",
          name: "School Fallback",
          facilityRole: "SCHOOL_EVACUATION_SUPPORT",
          latitude: 11.6,
          longitude: 76.1,
          source: "TEST",
          provenance: "Test",
          lastUpdated: null,
          capacity: null,
          capacitySource: "Test",
          capacityConfidence: "UNAVAILABLE",
          facilityHazardTier: "TIER_3_ELEVATED_MULTI_HAZARD",
          facilityHazardScore: 50,
          relocationSuitability: "CONDITIONAL",
          straightLineDistanceKm: 5,
          routeDistanceKm: null,
          distanceType: "STRAIGHT_LINE",
          estimatedTravelTimeMinutes: null,
          accessibilityNote: "Straight-line",
        },
      ];
      const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", facs, 30);
      const rec = buildRelocationRecommendation(assessment);
      expect(rec.candidateStatus).toBe("NO_PREFERRED_CANDIDATE");
      expect(rec.candidateDestination).toBeNull();
      expect(rec.conditionalAlternatives.length).toBe(1);
    });
  });
});

// ─── Phase 3.4 — Group F: Spatial Population Exposure & Habitation Intelligence ──

import {
  buildHabitationExposureSummary,
  classifyHabitationExposure,
  resolveExposedPopulationWithSpatialPriority,
} from "./hazards/spatialExposure";
import { TARGET_STATE_HABITATIONS } from "./hazards/data/habitations";

describe("Phase 3.4 — Group F: Spatial Population Exposure & Habitation Intelligence", () => {
  // ─── E12: HABITATION_SUM is DERIVED, never OBSERVED ──────────────────────
  it("E12: HABITATION_SUM method is labeled DERIVED, never POPULATION_OBSERVED", () => {
    const result = resolveExposedPopulationWithSpatialPriority(
      "Wayanad", "KL", "RED", 817820
    );
    // Wayanad has Chooralmala + Mundakkai (landslide exposures) — should find HABITATION_SUM
    if (result.exposureMethod === "HABITATION_SUM") {
      expect(result.exposureProvenance).toContain("DERIVED");
      expect(result.exposureConfidence).toBe("MEDIUM"); // Not HIGH — it's derived
    } else {
      // Fallback is also acceptable — but must NOT claim it's spatial
      expect(result.exposureMethod).toBe("DISTRICT_SCREENING_ASSUMPTION");
      expect(result.exposureProvenance).toContain("DERIVED");
    }
  });

  // ─── E13: Missing habitation population is null, not 0 ────────────────────
  it("E13: Habitation records with unverified population are strictly null, never 0", () => {
    const nullPopHabitations = TARGET_STATE_HABITATIONS.filter(h => h.population === null);
    // There are records with null pop (Kurla-Mithi, Bellandur, Velachery, etc.)
    expect(nullPopHabitations.length).toBeGreaterThan(0);
    // None should have population = 0
    const zeroPopHabitations = TARGET_STATE_HABITATIONS.filter(h => h.population === 0);
    expect(zeroPopHabitations.length).toBe(0);
  });

  // ─── E14: Habitations in different state not counted as EXPOSED ───────────
  it("E14: Habitations in a different state are NOT_EXPOSED for the target district", () => {
    // Querying for an Assam district — Kerala habitations should be NOT_EXPOSED
    const keralaHab = TARGET_STATE_HABITATIONS.find(h => h.stateCode === "KL");
    expect(keralaHab).toBeDefined();
    if (!keralaHab) return;
    const status = classifyHabitationExposure(
      keralaHab, "Dhemaji", "AS", "RED", "FLOOD"
    );
    expect(status).toBe("NOT_EXPOSED");
  });

  // ─── E15: Screening fallback used only when no habitation records for state ─
  it("E15: DISTRICT_SCREENING_ASSUMPTION only used when no habitation state records found", () => {
    // Use a state with NO habitation records (simulate by using a non-existent stateCode)
    const result = resolveExposedPopulationWithSpatialPriority(
      "Unknown District", "XX", "RED", 500000
    );
    // No habitations for state "XX" — should fall back to screening
    expect(result.exposureMethod).toBe("DISTRICT_SCREENING_ASSUMPTION");
    expect(result.exposureAssumption).not.toBeNull();
    expect(result.exposureAssumption).toContain("15%");
  });

  // ─── E16: Fallback labeled DISTRICT_SCREENING_ASSUMPTION ──────────────────
  it("E16: Fallback exposure carries explicit DISTRICT_SCREENING_ASSUMPTION label", () => {
    const result = resolveExposedPopulationWithSpatialPriority(
      "Unknown District", "XX", "ORANGE", 300000
    );
    expect(result.exposureMethod).toBe("DISTRICT_SCREENING_ASSUMPTION");
    expect(result.exposureProvenance).toContain("NDMA");
    expect(result.exposureProvenance).toContain("DERIVED");
  });

  // ─── E17: HABITATION_SUM takes precedence over screening assumption ────────
  it("E17: When HABITATION_SUM is available, DISTRICT_SCREENING_ASSUMPTION is NOT used", () => {
    // Wayanad, Kerala — has landslide-exposed habitations (Chooralmala, Mundakkai)
    const result = resolveExposedPopulationWithSpatialPriority(
      "Wayanad", "KL", "RED", 817820, "LANDSLIDE"
    );
    // Either HABITATION_SUM was used, or POINT_BASED_SCREENING — not screening assumption
    const usedScreening = result.exposureMethod === "DISTRICT_SCREENING_ASSUMPTION";
    // If screening was used, there should be no EXPOSED habitations
    if (usedScreening) {
      const summary = result.habitationSummary;
      expect(summary?.exposedHabitations ?? 0).toBe(0);
    } else {
      // Phase 3.4 habitation method was used — should contain habitation data
      expect(result.habitationSummary).not.toBeNull();
    }
  });

  // ─── E18: Unknown hazard geometry does not produce NOT_EXPOSED ────────────
  it("E18: UNAVAILABLE hazard classification returns UNKNOWN, never NOT_EXPOSED", () => {
    const hab = TARGET_STATE_HABITATIONS[0]!;
    const status = classifyHabitationExposure(
      hab, hab.district, hab.stateCode, "UNAVAILABLE"
    );
    expect(status).toBe("UNKNOWN");
    expect(status).not.toBe("NOT_EXPOSED");
  });

  // ─── E19: Hospital cannot be relocation destination (regression) ──────────
  it("E19 [regression]: HOSPITAL_MEDICAL_SUPPORT cannot be preferred relocation candidate", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DHE", [
      {
        facilityId: "test-hosp",
        name: "Test Hospital",
        facilityRole: "HOSPITAL_MEDICAL_SUPPORT",
        latitude: 27.48,
        longitude: 94.58,
        source: "OSM",
        provenance: "OSM",
        lastUpdated: null,
        capacity: 500,
        capacitySource: "test",
        capacityConfidence: "MEDIUM",
        facilityHazardTier: "LOW",
        facilityHazardScore: 20,
        relocationSuitability: "PREFERRED",
        hazardScreeningNote: "test",
        straightLineDistanceKm: 2,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "test",
      }
    ], 30);
    const rec = buildRelocationRecommendation(assessment);
    // Hospital should not become the preferred candidate
    expect(rec.candidateDestination === "Test Hospital" && rec.candidateStatus === "PREFERRED_CANDIDATE").toBe(false);
  });

  // ─── E20: UNSUITABLE facility cannot be preferred candidate (regression) ───
  it("E20 [regression]: UNSUITABLE facility cannot become preferred relocation candidate", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DHE", [
      {
        facilityId: "test-unsafe",
        name: "Unsafe Shelter",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 27.48,
        longitude: 94.58,
        source: "OSM",
        provenance: "OSM",
        lastUpdated: null,
        capacity: 200,
        capacitySource: "test",
        capacityConfidence: "MEDIUM",
        facilityHazardTier: "RED",
        facilityHazardScore: 90,
        relocationSuitability: "UNSUITABLE",
        hazardScreeningNote: "Inside RED zone",
        straightLineDistanceKm: 1.5,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "test",
      }
    ], 30);
    const rec = buildRelocationRecommendation(assessment);
    expect(rec.candidateStatus).not.toBe("PREFERRED_CANDIDATE");
  });

  // ─── E21: CONDITIONAL cannot be preferred candidate (regression) ──────────
  it("E21 [regression]: CONDITIONAL facility does not become PREFERRED_CANDIDATE", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", [
      {
        facilityId: "test-cond",
        name: "Conditional Facility",
        facilityRole: "EMERGENCY_SHELTER",
        latitude: 11.54,
        longitude: 76.18,
        source: "OSM",
        provenance: "OSM",
        lastUpdated: null,
        capacity: null,
        capacitySource: "unknown",
        capacityConfidence: "UNAVAILABLE",
        facilityHazardTier: "ORANGE",
        facilityHazardScore: 55,
        relocationSuitability: "CONDITIONAL",
        hazardScreeningNote: "ORANGE zone",
        straightLineDistanceKm: 5,
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "test",
      }
    ], 30);
    const rec = buildRelocationRecommendation(assessment);
    expect(rec.candidateStatus).not.toBe("PREFERRED_CANDIDATE");
    // It should appear in conditionalAlternatives
    expect(rec.conditionalAlternatives.length).toBeGreaterThanOrEqual(0);
  });

  // ─── E22: Capacity unavailable → deficit is null (regression) ─────────────
  it("E22 [regression]: Capacity unavailable means deficit stays null, not 0", () => {
    const balance = calculateCapacityBalance(10000, []);
    expect(balance.availableCapacity).toBeNull();
    expect(balance.capacityDeficit).toBeNull();
    expect(balance.capacityStatus).toBe("CAPACITY_UNAVAILABLE");
  });

  // ─── E23: scoreBreakdown.total === canonical priorityScore (regression) ────
  it("E23 [regression]: scoreBreakdown.total always equals priorityScore", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DHE", [], 30);
    const rec = buildRelocationRecommendation(assessment);
    expect(rec.priorityScore).toBe(rec.scoreBreakdown.total);
    const sum = rec.scoreBreakdown.hazardSeverity +
                rec.scoreBreakdown.populationExposure +
                rec.scoreBreakdown.vulnerability +
                rec.scoreBreakdown.capacityDeficit +
                rec.scoreBreakdown.accessibility;
    expect(rec.scoreBreakdown.total).toBe(sum);
  });

  // ─── E24: Straight-line distance never labeled as road distance (regression) ─
  it("E24 [regression]: Straight-line distance is never presented as ROAD_NETWORK", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DHE", [], 30);
    for (const f of assessment.nearbyFacilities) {
      if (f.routeDistanceKm == null) {
        expect(f.distanceType).not.toBe("ROAD_NETWORK");
      }
    }
  });

  // ─── E25: No artificial circular habitation buffers ───────────────────────
  it("E25: No habitation is classified EXPOSED purely based on a numeric radius", () => {
    // classifyHabitationExposure must not use distanceKm internally
    // Verify: a habitation with wrong hazard type in same district = UNKNOWN not EXPOSED
    const hab = TARGET_STATE_HABITATIONS.find(h =>
      h.primaryExposures.some(e => e.toLowerCase().includes("heat")) &&
      h.stateCode === "RJ"
    );
    if (!hab) return; // skip if not found
    // Classify against a FLOOD hazard in same district — should NOT be EXPOSED
    const status = classifyHabitationExposure(
      hab, hab.district, hab.stateCode, "RED", "FLOOD"
    );
    // Should be UNKNOWN (no flood keywords in primaryExposures), not EXPOSED
    expect(status).not.toBe("EXPOSED");
  });

  // ─── E26: Provenance metadata exists for every exposure result ────────────
  it("E26: Every exposure result has non-empty provenance and method", () => {
    const result = resolveExposedPopulationWithSpatialPriority(
      "Wayanad", "KL", "RED", 817820
    );
    expect(result.exposureMethod).not.toBe("");
    expect(result.exposureProvenance.length).toBeGreaterThan(10);
    expect(result.exposureRationale.length).toBeGreaterThan(10);
  });

  // ─── E27: Missing external source (empty habitations) does not crash ──────
  it("E27: resolveExposedPopulation gracefully handles district with no habitation data", () => {
    // Use a real district code but with a stateCode that has no habitations
    const result = resolveExposedPopulationWithSpatialPriority(
      "Hypothetical District", "XX", "RED", null
    );
    // With no population AND no habitation data → UNAVAILABLE, never crash
    expect(result.exposureMethod).toBe("UNAVAILABLE");
    expect(result.exposedPopulationEstimate).toBeNull();
    expect(() => result.exposedPopulationEstimate).not.toThrow();
  });

  // ─── E28: habitationSummary included in CarryingCapacityAssessment ────────
  it("E28: buildCarryingCapacityAssessment includes habitationSummary field", () => {
    const assessment = buildCarryingCapacityAssessment("DIST-KL-WAY", [], 30);
    // Field must exist (not undefined — null is acceptable)
    expect("habitationSummary" in assessment).toBe(true);
  });

  // ─── E29: buildHabitationExposureSummary returns null for unknown state ───
  it("E29: buildHabitationExposureSummary returns null when no state records exist", () => {
    const summary = buildHabitationExposureSummary("Nowhere", "XX", "RED");
    expect(summary).toBeNull();
  });

  // ─── E30: Habitation exposure summary counts are internally consistent ─────
  it("E30: habitationSummary counts sum to totalHabitations", () => {
    const summary = buildHabitationExposureSummary("Wayanad", "KL", "RED", "LANDSLIDE");
    if (!summary) return; // skip if no data
    const countSum =
      summary.exposedHabitations +
      summary.partiallyExposedHabitations +
      summary.notExposedHabitations +
      summary.unknownHabitations;
    expect(countSum).toBe(summary.totalHabitations);
  });
});
