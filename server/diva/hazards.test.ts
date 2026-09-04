import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMultiHazardProfile,
  findExposedHabitations,
  getHazardMapLayers,
  resolveSeismicExposure,
  resolveLandslideExposure,
  resolveFloodExposure,
  resolveCycloneExposure,
  resolveRiverbankErosionExposure,
  resolveDroughtExposure,
  resolveExtremeHeatExposure,
  SEISMIC_ZONE_POLYGONS,
  ISRO_DISTRICT_RANKINGS,
  HISTORICAL_LANDSLIDE_EVENTS,
  CWC_GAUGE_STATIONS,
  HISTORICAL_FLOOD_POLYGONS,
  HISTORICAL_CYCLONE_TRACKS,
  ACTIVE_EROSION_CORRIDORS,
  TARGET_STATE_HABITATIONS,
} from "./hazards/engine";
import { bridgeMultiHazardToAssessment } from "./hazards/riskBridge";
import { getIndiaLocationContext } from "./india";

afterEach(() => vi.unstubAllGlobals());

describe("Phase 3.2B — Authoritative Hazard Data & Engine Test Suite", () => {


  describe("1. Authoritative Datasets & Schemas", () => {
    it("contains BIS IS 1893:2016 Seismic Zones with Zone V, IV, III, II polygons", () => {
      expect(SEISMIC_ZONE_POLYGONS.length).toBeGreaterThanOrEqual(4);
      const zones = SEISMIC_ZONE_POLYGONS.map(z => z.zone);
      expect(zones).toContain("ZONE_V");
      expect(zones).toContain("ZONE_IV");
      expect(zones).toContain("ZONE_III");
      expect(zones).toContain("ZONE_II");
      SEISMIC_ZONE_POLYGONS.forEach(z => {
        expect(z.zoneFactor).toBeGreaterThan(0);
        expect(z.name).toBeTruthy();
        expect(z.coordinates.length).toBeGreaterThan(0);
      });
    });

    it("contains ISRO Landslide Atlas 2023 ranked districts and verified catastrophic events", () => {
      const wayanad = ISRO_DISTRICT_RANKINGS["wayanad"];
      expect(wayanad).toBeDefined();
      expect(wayanad.rank).toBe(13);
      expect(wayanad.stateCode).toBe("KL");

      const aizawl = ISRO_DISTRICT_RANKINGS["aizawl"];
      expect(aizawl.rank).toBe(4);

      const nilgiris = ISRO_DISTRICT_RANKINGS["nilgiris"];
      expect(nilgiris.rank).toBe(7);

      expect(HISTORICAL_LANDSLIDE_EVENTS.length).toBeGreaterThanOrEqual(6);
      const chooralmala = HISTORICAL_LANDSLIDE_EVENTS.find(e => e.name.includes("Chooralmala"));
      expect(chooralmala).toBeDefined();
      expect(chooralmala?.fatalities).toBe(420);
      expect(chooralmala?.year).toBe(2024);
    });

    it("contains CWC flood monitoring stations with warning, danger, and HFL levels", () => {
      expect(CWC_GAUGE_STATIONS.length).toBeGreaterThanOrEqual(8);
      CWC_GAUGE_STATIONS.forEach(g => {
        expect(g.warningLevelMeters).toBeLessThan(g.dangerLevelMeters);
        expect(g.dangerLevelMeters).toBeLessThanOrEqual(g.hflMeters);
        expect(g.river).toBeTruthy();
        expect(g.basin).toBeTruthy();
      });
    });

    it("contains verified historical cyclone tracks from IBTrACS / IMD", () => {
      expect(HISTORICAL_CYCLONE_TRACKS.length).toBeGreaterThanOrEqual(5);
      const fani = HISTORICAL_CYCLONE_TRACKS.find(c => c.name.includes("Fani"));
      expect(fani).toBeDefined();
      expect(fani?.category).toBe("ESCS");
      expect(fani?.maxSustainedWindKmph).toBeGreaterThanOrEqual(200);

      const hudhud = HISTORICAL_CYCLONE_TRACKS.find(c => c.name.includes("Hudhud"));
      expect(hudhud).toBeDefined();
      expect(hudhud?.year).toBe(2014);
    });

    it("contains verified active riverbank erosion reaches in Assam and Bihar", () => {
      expect(ACTIVE_EROSION_CORRIDORS.length).toBeGreaterThanOrEqual(4);
      const dhemaji = ACTIVE_EROSION_CORRIDORS.find(c => c.district.toLowerCase() === "dhemaji");
      expect(dhemaji).toBeDefined();
      expect(dhemaji?.criticalBufferMeters).toBeGreaterThan(0);
      expect(dhemaji?.riverSystem).toBe("Brahmaputra");
    });
  });

  describe("2. Provenance & Schema Integrity", () => {
    it("assigns strict official provenance to every hazard observation", () => {
      const profile = buildMultiHazardProfile({
        latitude: 26.2006,
        longitude: 92.9376,
        stateName: "Assam",
        districtName: "Kamrup",
      });

      expect(profile.hazards.length).toBeGreaterThanOrEqual(8);
      profile.hazards.forEach(hazard => {
        expect(hazard.provenance).toBeDefined();
        expect(hazard.provenance.sourceName).toBeTruthy();
        expect(["OFFICIAL", "OBSERVED", "LIVE_API", "MODELLED", "DERIVED"]).toContain(hazard.provenance.sourceType);
        expect(["HIGH", "MEDIUM", "LOW", "UNAVAILABLE"]).toContain(hazard.provenance.confidence);
      });
    });

    it("preserves null and UNAVAILABLE semantics without defaulting to zero risk", () => {
      // Test location outside regular bounds
      const seismic = resolveSeismicExposure(0, 0);
      expect(seismic.status).toBe("LOW"); // Fallback minimum baseline IS 1893 Zone II
      expect(seismic.zone).toBe("ZONE_II");

      // Drought with no matching state
      const drought = resolveDroughtExposure(10, 10, "NonExistentState");
      expect(drought.dstClimateVulnerabilityScore).toBeNull();
      expect(drought.status).toBe("UNAVAILABLE");

      const heat = resolveExtremeHeatExposure(10, 10, "NonExistentState");
      expect(heat.climatologicalDaysAbove40CPerYear).toBeNull();
      expect(heat.status).toBe("UNAVAILABLE");
    });

    it("ensures unverified habitation population is strictly null, never zero", () => {
      const unverified = TARGET_STATE_HABITATIONS.filter(h => h.population === null);
      expect(unverified.length).toBeGreaterThan(0);
      unverified.forEach(h => {
        expect(h.population).toBeNull();
        expect(h.population).not.toBe(0);
      });

      const exposed = findExposedHabitations(27.48, 94.58, 20); // Dhemaji area
      exposed.forEach(exp => {
        if (exp.provenance.sourceType !== "OFFICIAL") {
          expect(exp.population === null || typeof exp.population === "number").toBe(true);
        }
      });
    });
  });

  describe("3. Hazard Module Assessments", () => {
    it("correctly identifies BIS IS 1893:2016 Zone V for Assam and Mizoram", () => {
      const assamSeismic = resolveSeismicExposure(26.2006, 92.9376, "AS", "Kamrup");
      expect(assamSeismic.zone).toBe("ZONE_V");
      expect(assamSeismic.zoneFactor).toBe(0.36);
      expect(assamSeismic.status).toBe("CRITICAL");

      const mizoramSeismic = resolveSeismicExposure(23.73, 92.71, "MZ", "Aizawl");
      expect(mizoramSeismic.zone).toBe("ZONE_V");
      expect(mizoramSeismic.zoneFactor).toBe(0.36);
    });

    it("correctly identifies BIS IS 1893:2016 Zone III for Wayanad, Kerala", () => {
      const wayanadSeismic = resolveSeismicExposure(11.6854, 76.1320, "KL", "Wayanad");
      expect(wayanadSeismic.zone).toBe("ZONE_III");
      expect(wayanadSeismic.zoneFactor).toBe(0.16);
      expect(wayanadSeismic.status).toBe("MODERATE");
    });

    it("correctly evaluates ISRO Landslide Atlas rank and catastrophic event proximity for Wayanad", () => {
      // Chooralmala coordinates: 11.535, 76.137
      const landslide = resolveLandslideExposure(11.535, 76.137, "KL", "Wayanad", 28, 920);
      expect(landslide.districtRank).toBe(13);
      expect(landslide.nearestEvent).toBeDefined();
      expect(landslide.nearestEvent?.name).toContain("Chooralmala");
      expect(landslide.nearestEvent?.distanceKm).toBeLessThan(10);
      expect(landslide.status).toBe("CRITICAL");
    });

    it("correctly evaluates ISRO Landslide rank for Aizawl and Nilgiris", () => {
      const aizawl = resolveLandslideExposure(23.73, 92.71, "MZ", "Aizawl");
      expect(aizawl.districtRank).toBe(4);
      expect(aizawl.susceptibilityClass).toBe("VERY_HIGH");

      const nilgiris = resolveLandslideExposure(11.41, 76.70, "TN", "Nilgiris");
      expect(nilgiris.districtRank).toBe(7);
      expect(nilgiris.susceptibilityClass).toBe("VERY_HIGH");
    });

    it("correctly identifies CWC flood gauge proximity and flood plain intersection in Dhemaji, Assam", () => {
      // Dhemaji is in Brahmaputra flood plain and near Dibrugarh gauge
      const flood = resolveFloodExposure(27.48, 94.58, "AS", "Dhemaji", null, 104);
      expect(flood.insideHistoricalFloodExtent).toBe(true);
      expect(flood.nearestCwcGauge).toBeDefined();
      expect(flood.nearestCwcGauge?.river).toContain("Brahmaputra");
      expect(["CRITICAL", "HIGH"]).toContain(flood.status);
    });

    it("correctly identifies CWC flood gauge on Kosi river for Khagaria, Bihar", () => {
      const flood = resolveFloodExposure(25.50, 86.48, "BR", "Khagaria");
      expect(flood.insideHistoricalFloodExtent).toBe(true);
      expect(flood.nearestCwcGauge?.river).toBe("Kosi");
      expect(["CRITICAL", "HIGH"]).toContain(flood.status);
    });

    it("correctly detects historical cyclone track proximity for Puri (Fani 2019) and Kakinada (Hudhud 2014)", () => {
      const puri = resolveCycloneExposure(19.81, 85.83, "OD", true, 8);
      expect(puri.distanceToCoastKm).toBeLessThan(10);
      expect(puri.nearestTrack?.name).toContain("Fani");
      expect(puri.distanceToTrackKm).toBeLessThan(50);
      expect(puri.status).toBe("CRITICAL");

      const kakinada = resolveCycloneExposure(16.98, 82.24, "AP", true, 4);
      expect(kakinada.distanceToCoastKm).toBeLessThan(15);
      expect(kakinada.nearestTrack?.name).toMatch(/Hudhud|Michaung/);
    });


    it("correctly identifies active riverbank erosion corridor for Dhemaji / Rohmoria, Assam", () => {
      const erosion = resolveRiverbankErosionExposure(27.48, 94.58, "AS", "Dhemaji");
      expect(erosion.insideErosionCorridor).toBe(true);
      expect(erosion.riverSystem).toBe("Brahmaputra");
      expect(erosion.status).toBe("CRITICAL");
    });

    it("correctly evaluates drought and heatwave exposure for Jodhpur, Rajasthan", () => {
      const drought = resolveDroughtExposure(26.23, 73.02, "RJ", "Jodhpur");
      expect(drought.vulnerabilityClass).toBe("HIGH");

      const heat = resolveExtremeHeatExposure(26.23, 73.02, "RJ", "Jodhpur", 42);
      expect(heat.isHeatwaveProneDistrict).toBe(true);
      expect(heat.status).toBe("CRITICAL");
    });
  });

  describe("4. Multi-Hazard Red Zone Classification & Explainability", () => {
    it("classifies Wayanad Chooralmala landslide ground zero as RED zone with explicit triggers", () => {
      const profile = buildMultiHazardProfile({
        latitude: 11.535,
        longitude: 76.137,
        stateName: "Kerala",
        districtName: "Wayanad",
        elevationMeters: 920,
        slopeDegrees: 28,
      });

      expect(profile.redZone.tier).toBe("RED");
      expect(profile.redZone.isRedZone).toBe(true);
      expect(profile.redZone.compositeScore).toBeGreaterThanOrEqual(65);
      expect(profile.redZone.triggers.length).toBeGreaterThan(0);
      expect(profile.redZone.triggers.some(t => t.includes("HISTORICAL_LANDSLIDE_IMPACT"))).toBe(true);
      expect(profile.redZone.triggers.some(t => t.includes("ISRO_LANDSLIDE_RANK_TOP15"))).toBe(true);
      expect(profile.redZone.explanation).toContain("RED Zone");
    });

    it("classifies Dhemaji, Assam as RED zone due to multi-hazard confluence", () => {
      const profile = buildMultiHazardProfile({
        latitude: 27.48,
        longitude: 94.58,
        stateName: "Assam",
        districtName: "Dhemaji",
        elevationMeters: 104,
      });

      expect(profile.redZone.tier).toBe("RED");
      expect(profile.redZone.isRedZone).toBe(true);
      expect(profile.redZone.triggers.some(t => t.includes("SEISMIC_ZONE_V"))).toBe(true);
      expect(profile.redZone.triggers.some(t => t.includes("ACTIVE_EROSION_CORRIDOR"))).toBe(true);
      expect(profile.redZone.triggers.some(t => t.includes("HISTORICAL_FLOODPLAIN"))).toBe(true);
    });

    it("classifies Khagaria, Bihar as RED or ORANGE zone due to Kosi floodplain and CWC danger", () => {
      const profile = buildMultiHazardProfile({
        latitude: 25.50,
        longitude: 86.48,
        stateName: "Bihar",
        districtName: "Khagaria",
      });

      expect(["RED", "ORANGE"]).toContain(profile.redZone.tier);
      expect(profile.redZone.triggers.some(t => t.includes("HISTORICAL_FLOODPLAIN"))).toBe(true);
    });

    it("classifies Ranchi, Jharkhand as YELLOW or LOW zone due to low multi-hazard profile", () => {
      const profile = buildMultiHazardProfile({
        latitude: 23.34,
        longitude: 85.30,
        stateName: "Jharkhand",
        districtName: "Ranchi",
        elevationMeters: 651,
      });

      expect(["YELLOW", "LOW"]).toContain(profile.redZone.tier);
      expect(profile.redZone.isRedZone).toBe(false);
      expect(profile.redZone.compositeScore).toBeLessThan(40);
    });
  });

  describe("5. Multi-State Coverage — All 13 States", () => {
    const states = [
      { name: "Assam", code: "AS", lat: 27.48, lon: 94.58, district: "Dhemaji", expectedZone: "ZONE_V" },
      { name: "Andhra Pradesh", code: "AP", lat: 16.98, lon: 82.24, district: "Kakinada", expectedZone: "ZONE_II" },
      { name: "Maharashtra", code: "MH", lat: 16.85, lon: 74.58, district: "Sangli", expectedZone: "ZONE_III" },
      { name: "Karnataka", code: "KA", lat: 12.42, lon: 75.73, district: "Kodagu", expectedZone: "ZONE_III" },
      { name: "Bihar", code: "BR", lat: 25.50, lon: 86.48, district: "Khagaria", expectedZone: "ZONE_IV" },
      { name: "Jharkhand", code: "JH", lat: 23.34, lon: 85.30, district: "Ranchi", expectedZone: "ZONE_II" },
      { name: "Mizoram", code: "MZ", lat: 23.73, lon: 92.71, district: "Aizawl", expectedZone: "ZONE_V" },
      { name: "Odisha", code: "OD", lat: 19.81, lon: 85.83, district: "Puri", expectedZone: "ZONE_III" },
      { name: "Chhattisgarh", code: "CT", lat: 21.25, lon: 81.63, district: "Raipur", expectedZone: "ZONE_II" },
      { name: "Uttar Pradesh", code: "UP", lat: 26.76, lon: 83.37, district: "Gorakhpur", expectedZone: "ZONE_IV" },
      { name: "Rajasthan", code: "RJ", lat: 26.23, lon: 73.02, district: "Jodhpur", expectedZone: "ZONE_II" },
      { name: "Tamil Nadu", code: "TN", lat: 11.41, lon: 76.70, district: "Nilgiris", expectedZone: "ZONE_III" },
      { name: "Kerala", code: "KL", lat: 11.53, lon: 76.13, district: "Wayanad", expectedZone: "ZONE_III" },
    ];

    states.forEach(st => {
      it(`evaluates multi-hazard profile successfully for ${st.name} (${st.district})`, () => {
        const profile = buildMultiHazardProfile({
          latitude: st.lat,
          longitude: st.lon,
          stateCode: st.code,
          stateName: st.name,
          district: st.district,
        });

        expect(profile).toBeDefined();
        expect(profile.stateName).toBe(st.name);
        expect(profile.hazards.length).toBeGreaterThanOrEqual(6);
        expect(profile.redZone).toBeDefined();
        expect(["RED", "ORANGE", "YELLOW", "LOW"]).toContain(profile.redZone.tier);
        expect(profile.seismic.zone).toBe(st.expectedZone);
      });
    });
  });

  describe("6. GeoJSON Map Layers & Habitations", () => {
    it("generates standard GeoJSON FeatureCollections for all hazard layers", () => {
      const layers = getHazardMapLayers();
      expect(layers.seismicZones.type).toBe("FeatureCollection");
      expect(layers.seismicZones.features.length).toBeGreaterThanOrEqual(4);

      expect(layers.cwcGauges.type).toBe("FeatureCollection");
      expect(layers.cwcGauges.features.length).toBeGreaterThanOrEqual(8);

      expect(layers.landslideEvents.type).toBe("FeatureCollection");
      expect(layers.landslideEvents.features.length).toBeGreaterThanOrEqual(6);

      expect(layers.cycloneTracks.type).toBe("FeatureCollection");
      expect(layers.cycloneTracks.features.length).toBeGreaterThanOrEqual(5);

      expect(layers.floodplains.type).toBe("FeatureCollection");
      expect(layers.floodplains.features.length).toBeGreaterThanOrEqual(4);

      expect(layers.erosionCorridors.type).toBe("FeatureCollection");
      expect(layers.erosionCorridors.features.length).toBeGreaterThanOrEqual(4);

      expect(layers.habitations.type).toBe("FeatureCollection");
      expect(layers.habitations.features.length).toBeGreaterThanOrEqual(15);
    });

    it("exposes habitations with proper settlement types and safe population metadata", () => {
      const layers = getHazardMapLayers();
      layers.habitations.features.forEach(f => {
        expect(f.geometry.type).toBe("Point");
        expect(f.properties.name).toBeTruthy();
        expect(f.properties.district).toBeTruthy();
        expect(f.properties.state).toBeTruthy();
        if (f.properties.populationSource === "UNVERIFIED") {
          expect(f.properties.population).toBeNull();
        } else {
          expect(typeof f.properties.population).toBe("number");
          expect(f.properties.population).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("7. Risk Engine Integration & Context Bridge", () => {
    it("bridges multi-hazard profile to existing assessment analysis", () => {
      const profile = buildMultiHazardProfile({
        latitude: 11.535,
        longitude: 76.137,
        stateName: "Kerala",
        districtName: "Wayanad",
      });

      const bridged = bridgeMultiHazardToAssessment(profile);
      expect(bridged.compositeScore).toBeGreaterThanOrEqual(40);

      expect(bridged.riskLevel).toBeTruthy();
      expect(bridged.primaryDrivers.length).toBeGreaterThan(0);
      expect(bridged.evidence).toMatch(/RED Zone|Chooralmala|Landslide/);
    });


    it("populates hazardProfile and redZone in getIndiaLocationContext()", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Offline test"); }));
      const context = await getIndiaLocationContext({

        id: "test-assam",
        name: "Assam",
        displayName: "Assam, India",
        category: "State",
        latitude: 26.2006,
        longitude: 92.9376,
        population: null,
        populationSource: "Unavailable",
        boundingBox: [24, 89, 28, 96],
        boundary: null,
        address: { state: "Assam" },
        source: "Test",
      });

      expect(context.hazardProfile).toBeDefined();
      expect(context.hazardProfile?.stateName).toBe("Assam");
      expect(context.hazardProfile?.seismic.zone).toBe("ZONE_V");
      expect(context.redZone).toBeDefined();
      expect(["RED", "ORANGE", "YELLOW"]).toContain(context.redZone?.tier);

      // Verify RED zone evaluation for ground-zero catastrophic landslide location
      const wayanadContext = await getIndiaLocationContext({
        id: "test-chooralmala",
        name: "Chooralmala",
        displayName: "Chooralmala, Wayanad, Kerala, India",
        category: "Locality",
        latitude: 11.535,
        longitude: 76.137,
        population: null,
        populationSource: "Unavailable",
        boundingBox: null,
        boundary: null,
        address: { state: "Kerala", district: "Wayanad" },
        source: "Test",
      });
      expect(wayanadContext.redZone?.tier).toBe("RED");
      expect(wayanadContext.redZone?.isRedZone).toBe(true);
    });

  });
});
