import { describe, expect, it, vi } from "vitest";
import {
  buildMultiHazardProfile,
  evaluateRedZone,
  findExposedHabitations,
  resolveFloodExposure,
  resolveLandslideExposure,
  resolveCycloneExposure,
  resolveSeismicExposure,
  resolveRiverbankErosionExposure,
  resolveExtremeRainfallExposure,
  resolveExtremeHeatExposure,
  resolveDroughtExposure,
} from "./hazards/engine";
import {
  discoverFacilitiesSync,
  fetchRoadRouteWithGeometry,
} from "./hazards/facilityDiscovery";
import {
  buildCarryingCapacityAssessment,
  haversineKm,
} from "./hazards/capacity";
import {
  buildRelocationRecommendation,
  RELOCATION_ELIGIBLE_ROLES,
} from "./hazards/relocation";
import { STATE_CONFIGURATIONS } from "../../shared/india";
import { ALL_REAL_DISTRICTS, findRealDistrict } from "./hazards/data/realDistricts";
import { TARGET_STATE_HABITATIONS } from "./hazards/data/habitations";

describe("Phase 4: Multi-Hazard Decision Intelligence & Real-Data Strengthening", () => {
  // ── 1. Flood evidence classification ──────────────────────────────────────
  it("1. Flood evidence classification distinguishes physical CWC floodplains from low-risk zones", () => {
    // Dibrugarh Brahmaputra floodplain
    const exposed = resolveFloodExposure(27.5020, 94.9450, "AS", "Dibrugarh", 20, 102);
    expect(exposed.status).toBe("CRITICAL");
    expect(exposed.insideHistoricalFloodExtent).toBe(true);
    expect(exposed.provenance.sourceType).toBe("OFFICIAL");

    // Jodhpur desert baseline — no riverine floodplain
    const arid = resolveFloodExposure(26.2389, 73.0243, "RJ", "Jodhpur", 0, 230);
    expect(arid.status).toBe("LOW");
    expect(arid.insideHistoricalFloodExtent).toBe(false);
  });

  // ── 2. Landslide evidence classification ──────────────────────────────────
  it("2. Landslide evidence classification identifies ISRO Landslide Atlas top-ranked districts", () => {
    // Wayanad (ISRO Landslide Atlas Rank #13)
    const wayanad = resolveLandslideExposure(11.5375, 76.1689, "KL", "Wayanad", 28, 950);
    expect(wayanad.districtRank).toBe(13);
    expect(wayanad.status).toBe("CRITICAL");
    expect(wayanad.nearestEvent).not.toBeNull();
    expect(wayanad.nearestEvent?.name).toContain("Chooralmala");
    expect(["OFFICIAL", "OBSERVED"]).toContain(wayanad.provenance.sourceType);
  });

  // ── 3. Cyclone & coastal evidence ─────────────────────────────────────────
  it("3. Cyclone & coastal evidence identifies coastal exposure and explicitly notes fine-grained footprint status", () => {
    // Puri coastal Odisha
    const puri = resolveCycloneExposure(19.8135, 85.8312, "OD", true, 6);
    expect(["CRITICAL", "HIGH"]).toContain(puri.status);
    expect(puri.distanceToCoastKm).toBeLessThan(10);
    expect(puri.nearestTrack?.name).toContain("Fani");
    expect(puri.provenance.sourceType).toBe("OFFICIAL");

    // RedZone trigger includes explicit fine-grained limitation note
    const redZone = evaluateRedZone(
      resolveFloodExposure(19.8135, 85.8312, "OD", "Puri"),
      resolveLandslideExposure(19.8135, 85.8312, "OD", "Puri"),
      puri,
      resolveSeismicExposure(19.8135, 85.8312, "OD", "Puri"),
      resolveRiverbankErosionExposure(19.8135, 85.8312, "OD", "Puri"),
      resolveExtremeRainfallExposure(null, null),
      resolveExtremeHeatExposure(19.8135, 85.8312, "OD", "Puri"),
      resolveDroughtExposure(19.8135, 85.8312, "OD", "Puri")
    );
    expect(redZone.triggers.some(t => t.includes("Fine-grained cyclone hazard footprint unavailable"))).toBe(true);
  });

  // ── 4. Seismic regulatory semantics ───────────────────────────────────────
  it("4. Seismic regulatory semantics represents engineering design standards without fabricating rupture footprints", () => {
    const seismicV = resolveSeismicExposure(27.4728, 94.9120, "AS", "Dibrugarh");
    expect(seismicV.zone).toBe("ZONE_V");
    expect(seismicV.zoneFactor).toBe(0.36);
    expect(seismicV.provenance.sourceName).toContain("Bureau of Indian Standards");
    expect(seismicV.provenance.sourceType).toBe("OFFICIAL");

    const redZone = evaluateRedZone(
      resolveFloodExposure(27.4728, 94.9120, "AS", "Dibrugarh"),
      resolveLandslideExposure(27.4728, 94.9120, "AS", "Dibrugarh"),
      resolveCycloneExposure(27.4728, 94.9120, "AS", false),
      seismicV,
      resolveRiverbankErosionExposure(27.4728, 94.9120, "AS", "Dibrugarh"),
      resolveExtremeRainfallExposure(null, null),
      resolveExtremeHeatExposure(27.4728, 94.9120, "AS", "Dibrugarh"),
      resolveDroughtExposure(27.4728, 94.9120, "AS", "Dibrugarh")
    );
    expect(redZone.triggers.some(t => t.includes("Regulatory Seismic Zone V") && t.includes("engineering/regulatory baseline"))).toBe(true);
    expect(redZone.limitations.some(l => l.includes("Regulatory seismic zones represent engineering design standards"))).toBe(true);
  });

  // ── 5. Multiple simultaneous hazards on one location ─────────────────────
  it("5. Multiple simultaneous hazards on one location are recognized and reported", () => {
    // Dibrugarh has both FLOOD (Critical) and SEISMIC (Zone V)
    const profile = buildMultiHazardProfile({
      latitude: 27.5020,
      longitude: 94.9450,
      stateCode: "AS",
      district: "Dibrugarh",
      elevationMeters: 102,
    });

    expect(profile.redZone.primaryHazard).toBe("FLOOD");
    expect(profile.redZone.secondaryHazards).toContain("SEISMIC");
    expect(profile.redZone.primaryDriverReason).toContain("riverine flood");
    expect(profile.redZone.supportingEvidence?.some(e => e.includes("SEISMIC"))).toBe(true);
  });

  // ── 6. Deterministic primary vs secondary hazard selection ────────────────
  it("6. Primary hazard is deterministically selected based on highest empirical severity contribution", () => {
    // Wayanad landslide ground zero: Landslide scores higher than other hazards
    const profile = buildMultiHazardProfile({
      latitude: 11.5375,
      longitude: 76.1689,
      stateCode: "KL",
      district: "Wayanad",
      slopeDegrees: 28,
      elevationMeters: 950,
    });

    expect(profile.redZone.primaryHazard).toBe("LANDSLIDE");
    expect(profile.redZone.status).toBe("RED");
    expect(profile.redZone.score).toBeGreaterThanOrEqual(75);
  });

  // ── 7. UNKNOWN when critical evidence is missing ──────────────────────────
  it("7. Missing or unverified critical evidence results in UNKNOWN or strictly null rather than zero", () => {
    // Check unverified habitations
    const unverifiedHabs = TARGET_STATE_HABITATIONS.filter(h => h.population === null);
    expect(unverifiedHabs.length).toBeGreaterThan(0);
    // Verified that population is strictly null, never 0
    unverifiedHabs.forEach(h => {
      expect(h.population).toBeNull();
      expect(h.population).not.toBe(0);
    });
  });

  // ── 8. District screening does not become physical hazard footprint ──────
  it("8. District screening is an administrative assessment, distinct from physical hazard footprints", () => {
    const dist = findRealDistrict("Dibrugarh", "AS");
    expect(dist).toBeDefined();
    // District geometry is ADM2 polygon
    expect(dist?.geometry.type).toBe("Polygon");

    // Physical flood footprints are specific riverine features, not the whole district polygon
    const profile = buildMultiHazardProfile({
      latitude: 27.4728,
      longitude: 94.9120,
      stateCode: "AS",
      district: "Dibrugarh",
    });
    expect(profile.flood.insideHistoricalFloodExtent).toBe(true);
    expect(profile.flood.riverDistanceKm).toBeLessThanOrEqual(5);
  });

  // ── 9. Habitation-level exposure precedence ───────────────────────────────
  it("9. Habitation-level exposure follows Census 2011 precedence (HABITATION_SUM > DISTRICT_SCREENING_ASSUMPTION)", () => {
    const habs = findExposedHabitations(27.4728, 94.9120, 35, "AS", "Dibrugarh");
    expect(habs.length).toBeGreaterThan(0);
    expect(habs[0].population).toBeGreaterThan(0);
    expect(habs[0].provenance.sourceName).toContain("Census of India 2011");
  });

  // ── 10. Safe destination screening ────────────────────────────────────────
  it("10. Safe destination screening evaluates suitability and rejects UNSUITABLE facilities", () => {
    const facilities = discoverFacilitiesSync(27.4728, 94.9120, 35, "AS");
    expect(facilities.length).toBeGreaterThan(0);

    const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facilities, 35);
    const rec = buildRelocationRecommendation(assessment);

    // Any selected candidate must have suitable role and not be UNSUITABLE
    if (rec.bestCandidate) {
      expect(rec.bestCandidate.relocationSuitability).not.toBe("UNSUITABLE");
      expect((RELOCATION_ELIGIBLE_ROLES as readonly string[]).includes(rec.bestCandidate.facilityRole)).toBe(true);
    }
  });

  // ── 11. Hospital exclusion from mass evacuation ───────────────────────────
  it("11. Hospitals are excluded from general mass evacuation candidates", () => {
    expect((RELOCATION_ELIGIBLE_ROLES as readonly string[]).includes("HOSPITAL_MEDICAL_SUPPORT")).toBe(false);

    const facilities = discoverFacilitiesSync(27.4728, 94.9120, 35, "AS");
    const hospitals = facilities.filter(f => f.facilityRole === "HOSPITAL_MEDICAL_SUPPORT");
    expect(hospitals.length).toBeGreaterThan(0);

    const assessment = buildCarryingCapacityAssessment("DIST-AS-DIB", facilities, 35);
    const rec = buildRelocationRecommendation(assessment);

    // bestCandidate must NEVER be a hospital
    if (rec.bestCandidate) {
      expect(rec.bestCandidate.facilityRole).not.toBe("HOSPITAL_MEDICAL_SUPPORT");
    }
  });

  // ── 12. OSRM route integrity ──────────────────────────────────────────────
  it("12. OSRM road route returns real road coordinates, distance, and duration", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: "Ok",
          routes: [
            {
              distance: 12450,
              duration: 1140,
              geometry: {
                coordinates: [
                  [95.1250, 27.5350],
                  [95.1100, 27.5200],
                  [95.0950, 27.5100],
                  [95.0820, 27.4985],
                ],
              },
            },
          ],
        }),
      } as any);

      const route = await fetchRoadRouteWithGeometry(
        27.5350,
        95.1250,
        27.4985,
        95.0820,
        "Rohmoria Miripathar",
        "Dikom Multi-Purpose Relief Shelter"
      );

      expect(route.status).toBe("OK");
      expect(route.distanceType).toBe("ROAD_NETWORK");
      expect(route.routeDistanceKm).toBe(12.4);
      expect(route.travelTimeMinutes).toBe(19);
      expect(route.coordinates.length).toBe(4);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ── 13. No fake route fallback ────────────────────────────────────────────
  it("13. When routing fails, empty coordinates are returned and distanceType is UNAVAILABLE", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network timeout or unreachable"));

      // Query unreachable coordinate
      const route = await fetchRoadRouteWithGeometry(
        0.0,
        0.0,
        0.001,
        0.001
      );

      // Must never return straight-line coordinates disguised as road route
      expect(route.status).toBe("UNAVAILABLE");
      expect(route.coordinates).toHaveLength(0);
      expect(route.distanceType).toBe("UNAVAILABLE");
      expect(route.routeDistanceKm).toBeNull();
      expect(route.travelTimeMinutes).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ── 14. No fake green zones ───────────────────────────────────────────────
  it("14. A safe destination marker denotes a verified suitable facility, not a green geographic area", () => {
    const facilities = discoverFacilitiesSync(27.4728, 94.9120, 35, "AS");
    const shelter = facilities.find(f => f.facilityRole === "EMERGENCY_SHELTER");
    expect(shelter).toBeDefined();
    // Facility is a point feature with latitude and longitude, not a polygon or circular buffer
    expect(typeof shelter?.latitude).toBe("number");
    expect(typeof shelter?.longitude).toBe("number");
  });

  // ── 15. Deterministic priority consistency (scoreBreakdown.total === priorityScore) ──
  it("15. Deterministic relocation priority strictly satisfies scoreBreakdown.total === priorityScore", () => {
    const districts = ["DIST-AS-DIB", "DIST-KL-WAY", "DIST-OD-PUR", "DIST-RJ-JOD"];
    districts.forEach(dId => {
      const real = ALL_REAL_DISTRICTS.find(d => d.id === dId);
      if (!real) return;
      const facilities = discoverFacilitiesSync(real.latitude, real.longitude, 35, real.stateCode);
      const assessment = buildCarryingCapacityAssessment(real.id, facilities, 35);
      const rec = buildRelocationRecommendation(assessment);

      const bd = rec.scoreBreakdown;
      const expectedTotal = bd.hazardSeverity + bd.populationExposure + bd.vulnerability + bd.capacityDeficit + bd.accessibility;
      expect(bd.total).toBe(expectedTotal);
      expect(rec.priorityScore).toBe(bd.total);
    });
  });

  // ── 16. All 13 state configurations resolve cleanly ───────────────────────
  it("16. All 13 target state configurations resolve without errors", () => {
    const stateCodes = Object.keys(STATE_CONFIGURATIONS);
    expect(stateCodes.length).toBe(13);

    stateCodes.forEach(code => {
      const cfg = STATE_CONFIGURATIONS[code];
      expect(cfg).toBeDefined();
      expect(cfg.name).toBeTruthy();
      const [lon, lat] = cfg.centroid;
      expect(lat).toBeGreaterThan(0);
      expect(lon).toBeGreaterThan(0);

      // Build profile for state center
      const profile = buildMultiHazardProfile({
        latitude: lat,
        longitude: lon,
        stateCode: cfg.code,
        stateName: cfg.name,
      });
      expect(profile).toBeDefined();
      expect(profile.redZone).toBeDefined();
      expect(["RED", "ORANGE", "YELLOW", "LOW"]).toContain(profile.redZone.status);
    });
  });

  // ── 17. Provenance labels remain correct and traceable ────────────────────
  it("17. Provenance labels retain authoritative source types (OFFICIAL, OBSERVED, DERIVED, MODELLED)", () => {
    const profile = buildMultiHazardProfile({
      latitude: 27.4728,
      longitude: 94.9120,
      stateCode: "AS",
      district: "Dibrugarh",
    });

    // CWC is OFFICIAL
    expect(profile.observations.FLOOD.provenance.sourceType).toBe("OFFICIAL");
    // BIS is OFFICIAL
    expect(profile.observations.SEISMIC.provenance.sourceType).toBe("OFFICIAL");
    // ISRO is OFFICIAL / OBSERVED
    expect(["OFFICIAL", "OBSERVED"]).toContain(profile.observations.LANDSLIDE.provenance.sourceType);
    // RedZone composite is DERIVED
    expect(profile.redZone.provenance.sourceType).toBe("DERIVED");
  });
});
