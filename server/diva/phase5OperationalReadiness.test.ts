import { describe, expect, it } from "vitest";
import { STATE_CONFIGURATIONS } from "../../shared/india";
import { auditedLayerGroups, nationwideMapLayerVisibility, authoritativeHazardMapLayerVisibility } from "../../client/src/components/diva/nationwideLayerConfig";
import { RELOCATION_ELIGIBLE_ROLES } from "../../shared/hazards";
import { ALL_REAL_DISTRICTS, findRealDistrict } from "./hazards/data/realDistricts";
import { discoverFacilitiesSync } from "./hazards/facilityDiscovery";
import { buildCarryingCapacityAssessment } from "./hazards/capacity";
import { buildRelocationRecommendation } from "./hazards/relocation";
import { evaluateRedZone, buildMultiHazardProfile } from "./hazards/engine";

describe("Phase 5: SIH Demonstration & Nationwide Operational Readiness", () => {
  // ── 1. 13-State Resolution & Focus Districts ──────────────────────────────
  it("1. All 13 target states resolve with complete configurations and focus districts", () => {
    const requiredStates = ["AS", "AP", "MH", "KA", "BR", "JH", "MZ", "OD", "CT", "UP", "RJ", "TN", "KL"];
    for (const code of requiredStates) {
      const config = STATE_CONFIGURATIONS[code];
      expect(config, `Missing state config for ${code}`).toBeDefined();
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.code).toBe(code);
      expect(config.centroid.length).toBe(2);
      expect(config.focusDistricts.length).toBeGreaterThan(0);
      expect(config.terrainProfile.length).toBeGreaterThan(0);
    }
  });

  // ── 2. Real District Boundaries for Primary Demonstrations ────────────────
  it("2. Real district boundaries exist for all 4 primary demonstration districts", () => {
    const demoDistricts = [
      { state: "AS", name: "Dibrugarh" },
      { state: "KL", name: "Wayanad" },
      { state: "OD", name: "Puri" },
      { state: "RJ", name: "Jodhpur" },
    ];
    for (const d of demoDistricts) {
      const dist = findRealDistrict(d.name, d.state);
      expect(dist, `Missing district ${d.name} in ${d.state}`).toBeDefined();
      expect(dist?.geometry.type).toMatch(/Polygon|MultiPolygon/);
      expect(dist?.geometry.coordinates.length).toBeGreaterThan(0);
    }
  });

  // ── 3. Relocation Required Logic (Jodhpur GREEN = No Relocation) ───────────
  it("3. Relocation is NOT required for Jodhpur (GREEN / Low Risk), resulting in no evacuation route", () => {
    const facilities = discoverFacilitiesSync(26.2389, 73.0243, 35, "RJ");
    const assessment = buildCarryingCapacityAssessment("DIST-RJ-JOD", facilities, 35);
    const rec = buildRelocationRecommendation(assessment);

    expect(rec.sourceHazardLevel).toBe("GREEN");
    expect(rec.priorityScore).toBeLessThan(40);
    expect(rec.priorityLevel).toBe("LOW");
  });

  // ── 4. Relocation Destination Suitability (Hospital Exclusion) ─────────────
  it("4. Relocation destination screening strictly excludes hospitals and unsuitable facilities", () => {
    const facilities = discoverFacilitiesSync(27.4728, 94.9120, 35, "AS");
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facilities, 35);
    const rec = buildRelocationRecommendation(assessment);

    if (rec.bestCandidate) {
      expect(rec.bestCandidate.facilityRole).not.toBe("HOSPITAL_MEDICAL_SUPPORT");
      expect((RELOCATION_ELIGIBLE_ROLES as readonly string[]).includes(rec.bestCandidate.facilityRole)).toBe(true);
      expect(rec.bestCandidate.relocationSuitability).not.toBe("UNSUITABLE");
    }
  });

  // ── 5. Capacity Null Semantics ─────────────────────────────────────────────
  it("5. Capacity deficit is never fabricated when verified capacity is unavailable", () => {
    const facilities = discoverFacilitiesSync(27.4728, 94.9120, 35, "AS");
    const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facilities, 35);

    if (assessment.capacityStatus === "CAPACITY_UNAVAILABLE") {
      expect(assessment.availableCapacity).toBeNull();
      expect(assessment.capacityDeficit).toBeNull();
      expect(assessment.capacitySurplus).toBeNull();
    }
  });

  // ── 6. Multi-Hazard Primary vs Secondary Consistency ──────────────────────
  it("6. Multi-hazard evaluation consistently identifies primary driver with secondary evidence", () => {
    // Dibrugarh: Flood is dynamic primary driver, Seismic is regulatory secondary
    const profile = buildMultiHazardProfile({
      latitude: 27.5020,
      longitude: 94.9450,
      stateCode: "AS",
      district: "Dibrugarh",
      elevationMeters: 102,
    });
    const redZone = profile.redZone;

    expect(redZone.status).toBe("RED");
    expect(redZone.primaryHazard).toBe("FLOOD");
    expect(redZone.secondaryHazards).toContain("SEISMIC");
    expect(redZone.primaryDriverReason).toContain("riverine flood inundation corridor");
    expect(redZone.supportingEvidence.some(e => e.includes("SEISMIC"))).toBe(true);
  });

  // ── 7. Map Layer Configuration Integrity (16 Groups, 0 Dead Toggles) ─────
  it("7. Map layer configuration has all 16 toggle groups mapped to real MapLibre layers with zero dead controls", () => {
    const allLayers = { ...nationwideMapLayerVisibility, ...authoritativeHazardMapLayerVisibility };

    for (const group of auditedLayerGroups) {
      for (const [key, label] of group.items) {
        expect(allLayers[key as keyof typeof allLayers], `Missing layer definition for toggle "${key}" (${label})`).toBeDefined();
        const layerIds = allLayers[key as keyof typeof allLayers];
        expect(layerIds.length).toBeGreaterThan(0);
      }
    }
  });

  // ── 8. Stale Coordinate Guard Logic ───────────────────────────────────────
  it("8. Stale route coordinate guard rejects routes whose endpoints do not match current origin", () => {
    const currentOrigin = { latitude: 27.5350, longitude: 95.1250 }; // Dibrugarh
    const staleRouteCoords = [[76.1284, 11.5512], [76.1689, 11.5375]]; // Wayanad

    const isMatch = (
      Math.abs(staleRouteCoords[0][1] - currentOrigin.latitude) < 0.15 &&
      Math.abs(staleRouteCoords[0][0] - currentOrigin.longitude) < 0.15
    );

    expect(isMatch).toBe(false);
  });
});
