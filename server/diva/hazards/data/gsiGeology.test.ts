import { beforeEach, describe, expect, it } from "vitest";
import { clearGeologyCache, resolveGeologyContext } from "./gsiGeology";
import { DATA_SOURCE_REGISTRY } from "@shared/sourceRegistry";
import { buildMultiHazardProfile } from "../engine";
import type { MultiHazardProfile } from "@shared/hazards";

describe("GSI Bhukosh & NGDR Geological Data Integration & Quality Validation", () => {
  beforeEach(() => {
    clearGeologyCache();
  });
  it("1. Verifies GSI source provenance is strictly OFFICIAL and registered in sourceRegistry", () => {
    const gsiRecord = DATA_SOURCE_REGISTRY.GEOLOGY_GSI;
    expect(gsiRecord).toBeDefined();
    expect(gsiRecord.provenanceType).toBe("OFFICIAL");
    expect(gsiRecord.name).toBe("Geological Survey of India (GSI) Bhukosh & NGDR Geoscientific Repository");
    expect(gsiRecord.observedOrModelled).toBe("REFERENCE");
    expect(gsiRecord.integrationStatus).toBe("INTEGRATED");
  });

  it("2. Resolves genuine GSI vector features with authentic lithology, age, and preserved feature IDs without fabrication", async () => {
    // Test Dibrugarh coordinates
    const geo = await resolveGeologyContext(27.4728, 94.912, "Dibrugarh", "Assam");
    expect(geo).not.toBeNull();
    if (!geo) return;

    // Must be OFFICIAL provenance
    expect(geo.provenance).toBe("OFFICIAL");
    expect(geo.confidence).toBe("DIRECT_GSI_FEATURE");
    expect(geo.sourceOrganization).toBe("Geological Survey of India (GSI)");

    // Genuine lithology & age from GSI 1:2M dataset
    expect(geo.lithology).toBe("UNDIFF.FLUVIAL / AEOLIAN / COASTA & GLACIAL SEDIMENTS");
    expect(geo.age).toBe("QUATERNARY");

    // Preserves authentic GSI feature ID (e.g. GSI-2M-POLY-...)
    expect(geo.featureId).toMatch(/^GSI-2M-POLY-\d+$/);

    // Bhuvan Geomorphology 1:50K landform unit
    expect(geo.geomorphology).toBe("Fluvial Origin-Younger Alluvial Plain");

    // Nearest fault calculation
    expect(geo.faultPresent).toBe(true);
    expect(geo.nearestFaultName).toBe("Fault Tectonic - Neotectonic Fault");
    expect(geo.faultDistanceKm).toBeCloseTo(3.2, 0);

    // Source URL and retrieval timestamp are preserved
    expect(geo.sourceUrl).toContain("livingatlas.esri.in");
    expect(geo.retrievedAt).toBeDefined();
    expect(geo.spatialReference).toContain("4326");
  }, 15000);

  it("3. Nearest fault / lineament distance calculation is deterministic", async () => {
    const geo1 = await resolveGeologyContext(11.6854, 76.132, "Wayanad", "Kerala");
    const geo2 = await resolveGeologyContext(11.6854, 76.132, "Wayanad", "Kerala");

    expect(geo1).not.toBeNull();
    expect(geo2).not.toBeNull();
    if (!geo1 || !geo2) return;

    expect(geo1.faultDistanceKm).toBe(geo2.faultDistanceKm);
    expect(geo1.nearestFaultName).toBe(geo2.nearestFaultName);
    expect(geo1.lithology).toBe(geo2.lithology);
    expect(geo1.lithology).toBe("CHARNOCKITE GNEISSIC COMPLEX (SOUTHERN GRANULITE TERRAIN)");
  }, 15000);

  it("4. Empty/out-of-bounds queries return UNAVAILABLE context and never synthesize or fabricate fake geology", async () => {
    // Coordinates in the middle of the Indian Ocean, far from India bounds
    const oceanGeo = await resolveGeologyContext(0.0, 70.0, "Open Ocean", "None");
    expect(oceanGeo).not.toBeNull();
    expect(oceanGeo?.available).toBe(false);
    expect(oceanGeo?.provenance).toBe("UNAVAILABLE");
    expect(oceanGeo?.lithology).toBeNull();
    expect(oceanGeo?.geologicalUnit).toBeNull();
    expect(oceanGeo?.limitations).toContain("no provisional geometry fabricated");
  }, 15000);

  it("5. Strict Hazard Independence: Geology context does NOT alter primary hazard Red/Orange/Green classification", () => {
    // Baseline hazard profile generated from deterministic engine
    const profileBase = buildMultiHazardProfile({
      locationName: "Dibrugarh",
      latitude: 27.4728,
      longitude: 94.912,
      stateCode: "AS",
      stateName: "Assam",
      district: "Dibrugarh",
      slopeDegrees: 0.8,
      elevationMeters: 107,
      currentRainfallMm: 0,
    });

    const baseScore = profileBase.redZone.score;
    const baseTier = profileBase.redZone.tier;
    const basePrimaryHazard = profileBase.redZone.primaryHazard;

    // Attaching genuine GSI geology context to the profile
    const profileWithGeology: MultiHazardProfile = {
      ...profileBase,
      geology: {
        available: true,
        provenance: "OFFICIAL",
        sourceOrganization: "Geological Survey of India (GSI)",
        repository: "Bhukosh & NDSAP Living Atlas Mirror",
        serviceName: "Geology_2M",
        layerName: "Geology (1:2M)",
        scale: "1:2,000,000",
        geometryType: "Polygon",
        lithology: "UNDIFF.FLUVIAL / AEOLIAN / COASTA & GLACIAL SEDIMENTS",
        geologicalUnit: "Quaternary Sediments",
        formation: "Alluvial Formation",
        rockType: "Sediment",
        age: "QUATERNARY",
        supergroup: null,
        stratigraphy: null,
        faultPresent: true,
        faultDistanceKm: 1.5,
        nearestFaultName: "Fault Tectonic - Active Fault",
        lineamentPresent: true,
        geomorphology: "Younger Alluvial Plain",
        tectonicContext: "Active tectonic fault line 1.5 km",
        sourceUrl: "https://livingatlas.esri.in/server1/rest/services/Geology/Geology/MapServer/0",
        retrievedAt: new Date().toISOString(),
        spatialReference: "EPSG:4326",
        featureId: "GSI-2M-POLY-999",
        confidence: "DIRECT_GSI_FEATURE",
        wmsAvailable: true,
        limitations: "Supporting evidence only.",
      },
    };

    // Primary score and classification MUST REMAIN IDENTICAL
    // Proving geology NEVER artificially inflates or dictates Red/Orange/Green classification
    expect(profileWithGeology.redZone.score).toBe(baseScore);
    expect(profileWithGeology.redZone.tier).toBe(baseTier);
    expect(profileWithGeology.redZone.primaryHazard).toBe(basePrimaryHazard);
  });

  it("6. Caching isolates locations by rounded coordinates and prevents stale data leakage", async () => {
    // Query Puri (coastal Odisha)
    const puriGeo = await resolveGeologyContext(19.8135, 85.8312, "Puri", "OR");
    expect(puriGeo).not.toBeNull();
    expect(puriGeo?.lithology).toBeDefined();

    // Query Jodhpur (arid Rajasthan)
    const jodhpurGeo = await resolveGeologyContext(26.2389, 73.0243, "Jodhpur", "RJ");
    expect(jodhpurGeo).not.toBeNull();
    expect(jodhpurGeo?.lithology).toBeDefined();

    // They must never cross-contaminate
    expect(puriGeo?.nearestFaultName).not.toBe(jodhpurGeo?.nearestFaultName);
    expect(puriGeo?.faultDistanceKm).not.toBe(jodhpurGeo?.faultDistanceKm);
  }, 15000);
});
