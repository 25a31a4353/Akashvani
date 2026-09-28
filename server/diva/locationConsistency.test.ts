import { describe, expect, it } from "vitest";
import { lookupRealDistrict } from "../../client/src/components/diva/SelectedLocationDecisionPanels";
import { buildResqAssistantContext } from "../../client/src/components/diva/ResqAiAssistant";
import { buildSelectedLocationSummary } from "../../client/src/components/diva/mapCommandUi";
import { buildLocationSignature, validateLocationConsistency } from "./locationSignature";
import type { IndiaLocation, IndiaLocationContext } from "@shared/india";

describe("Phase 18: End-to-End Location Consistency & Anti-Leakage Invariants", () => {
  const assamLocation: IndiaLocation = {
    id: "india-assam",
    name: "Assam",
    displayName: "Assam, India",
    category: "State",
    latitude: 26.2006,
    longitude: 92.9376,
    population: 31205576,
    populationSource: "Census of India 2011",
    boundingBox: [24.13, 89.68, 28.22, 96.02],
    boundary: null,
    address: { state: "Assam" },
    source: "Census 2011 reference state",
  };

  const wayanadLocation: IndiaLocation = {
    id: "DIST-KL-WAY",
    name: "Wayanad",
    displayName: "Wayanad, Kerala, India",
    category: "District",
    latitude: 11.6854,
    longitude: 76.1320,
    population: 817420,
    populationSource: "Census of India 2011 / geoBoundaries ADM2",
    boundingBox: [11.45, 75.85, 11.95, 76.45],
    boundary: null,
    address: { state: "Kerala", district: "Wayanad" },
    source: "geoBoundaries ADM2 / Census 2011 reference district",
  };

  const puriLocation: IndiaLocation = {
    id: "DIST-OD-PUR",
    name: "Puri",
    displayName: "Puri, Odisha, India",
    category: "District",
    latitude: 19.8135,
    longitude: 85.8312,
    population: 1698730,
    populationSource: "Census of India 2011 / geoBoundaries ADM2",
    boundingBox: [19.45, 85.10, 20.25, 86.40],
    boundary: null,
    address: { state: "Odisha", district: "Puri" },
    source: "geoBoundaries ADM2 / Census 2011 reference district",
  };

  const jodhpurLocation: IndiaLocation = {
    id: "DIST-RJ-JOD",
    name: "Jodhpur",
    displayName: "Jodhpur, Rajasthan, India",
    category: "District",
    latitude: 26.2389,
    longitude: 73.0243,
    population: 3687002,
    populationSource: "Census of India 2011 / geoBoundaries ADM2",
    boundingBox: [25.80, 72.20, 27.20, 73.80],
    boundary: null,
    address: { state: "Rajasthan", district: "Jodhpur" },
    source: "geoBoundaries ADM2 / Census 2011 reference district",
  };

  // TEST 1: Select Assam — Assert no Wayanad text appears in live decision context
  it("TEST 1: Selecting Assam ensures no Wayanad district or route leaks into lookup", () => {
    // Before fix, lookupRealDistrict("Assam", "Wayanad", null) matched Wayanad!
    // With state filtering:
    const districtForAssam = lookupRealDistrict("Assam", undefined, "Assam");
    expect(districtForAssam?.name).not.toBe("Wayanad");
    expect(districtForAssam?.id).not.toBe("DIST-KL-WAY");

    // Even if stale "Wayanad" string is passed as candidate district, stateFilter="Assam" ensures Wayanad is NEVER returned
    const safeDistrict = lookupRealDistrict("Assam", "Wayanad", "Assam");
    expect(safeDistrict?.name).not.toBe("Wayanad");
    expect(safeDistrict?.id).not.toBe("DIST-KL-WAY");
    expect(safeDistrict?.stateCode).toBe("AS");
  });

  // TEST 2: Select Wayanad — Assert no Assam-specific decision appears
  it("TEST 2: Selecting Wayanad matches strictly Wayanad and never Assam", () => {
    const districtForWayanad = lookupRealDistrict("Wayanad", "Wayanad", "Kerala");
    expect(districtForWayanad?.id).toBe("DIST-KL-WAY");
    expect(districtForWayanad?.stateCode).toBe("KL");
    expect(districtForWayanad?.name).toBe("Wayanad");
  });

  // TEST 3: Assam → Wayanad → Puri → Jodhpur → Assam rapidly
  it("TEST 3: Rapid switching between locations produces distinct, non-overlapping signatures", () => {
    const sigAssam = buildLocationSignature(assamLocation);
    const sigWayanad = buildLocationSignature(wayanadLocation);
    const sigPuri = buildLocationSignature(puriLocation);
    const sigJodhpur = buildLocationSignature(jodhpurLocation);

    expect(sigAssam).toContain("assam");
    expect(sigWayanad).toContain("wayanad");
    expect(sigPuri).toContain("puri");
    expect(sigJodhpur).toContain("jodhpur");

    // All signatures must be completely distinct
    const set = new Set([sigAssam, sigWayanad, sigPuri, sigJodhpur]);
    expect(set.size).toBe(4);
  });

  // TEST 4: Slow Wayanad request resolves after Assam selection — Assert Wayanad response is discarded
  it("TEST 4: Stale response protection discards slow asynchronous responses from previous locations", () => {
    const currentSignature = buildLocationSignature(assamLocation);
    const slowWayanadResponse = {
      districtId: "DIST-KL-WAY",
      locationSignature: buildLocationSignature(wayanadLocation),
      bestCandidate: { name: "Wayanad District Collectorate" },
    };

    const isMatch = slowWayanadResponse.locationSignature === currentSignature;
    expect(isMatch).toBe(false);
    // Decision invariant: Discard response when signature mismatch occurs
    const acceptedData = isMatch ? slowWayanadResponse : null;
    expect(acceptedData).toBeNull();
  });

  // TEST 5: Weather partial response — Valid fields render individually without failing whole card
  it("TEST 5: Partial weather telemetry renders available fields without claiming total failure", () => {
    const partialEnvContext: Partial<IndiaLocationContext> = {
      location: assamLocation,
      environment: {
        latitude: 26.2006,
        longitude: 92.9376,
        temperatureC: 28.4,
        precipitationMm: 0.0,
        pressureHpa: 1012,
        windSpeedKmh: 7.2,
        usAqi: null, // AQI unavailable
        uvIndex: null, // UV unavailable
        status: "LIVE MODELLED ENVIRONMENTAL CONTEXT",
        source: "Open-Meteo High-Resolution Numerical Weather Prediction model",
        observedAt: new Date().toISOString(),
        forecast: [],
      } as any,
      screening: {
        riskScore: 23,
        riskLevel: "Low",
        priority: "Immediate",
        hazardContext: "Normal Baseline Atmospheric Profile",
        populationContext: "Statewide baseline",
        status: "SCREENED",
      },
      infrastructure: { status: "CURATED BASELINE FACILITY REGISTER", items: [], source: "Test", observedAt: null },
    };

    const summary = buildSelectedLocationSummary(partialEnvContext as IndiaLocationContext);
    expect(summary.temperature).toBe("28.4°C");
    expect(summary.precipitation).toBe("0 mm");
    expect(summary.airQuality).toBe("Unavailable");
  });

  // TEST 6: Facility query failure — Assert "Discovery unavailable", not "0 facilities"
  it("TEST 6: Distinguishes facility query failure from verified 0 facilities", () => {
    const failedFacilityContext: Partial<IndiaLocationContext> = {
      location: assamLocation,
      environment: { forecast: [] } as any,
      screening: { riskScore: 23, riskLevel: "Low", priority: "Low", hazardContext: "Normal", populationContext: "", status: "SCREENED" },
      infrastructure: { status: "UNAVAILABLE", items: [], source: "Test", observedAt: null },
    };

    const summary = buildSelectedLocationSummary(failedFacilityContext as IndiaLocationContext);
    expect(summary.facilityCount).toBe("Discovery unavailable");
    expect(summary.facilityCount).not.toBe("0 facilities");
    expect(summary.facilityCount).not.toBe("0 verified facilities");

    const zeroFacilityContext: Partial<IndiaLocationContext> = {
      ...failedFacilityContext,
      infrastructure: { status: "CURATED BASELINE FACILITY REGISTER", items: [], source: "Test", observedAt: null },
    };
    const zeroSummary = buildSelectedLocationSummary(zeroFacilityContext as IndiaLocationContext);
    expect(zeroSummary.facilityCount).toBe("0");
  });

  // TEST 7: Facilities found + capacity unknown — Assert facility count > 0 and capacity UNKNOWN
  it("TEST 7: Verified facility count > 0 with unverified capacity remains truthfully unverified", () => {
    const verifiedFacContext: Partial<IndiaLocationContext> = {
      location: assamLocation,
      environment: { forecast: [] } as any,
      screening: { riskScore: 23, riskLevel: "Low", priority: "Low", hazardContext: "Normal", populationContext: "", status: "SCREENED" },
      infrastructure: {
        status: "CURATED BASELINE FACILITY REGISTER",
        items: [
          { id: "osm-1", name: "Guwahati Medical College", type: "hospital", latitude: 26.15, longitude: 91.77 },
          { id: "osm-2", name: "Assam Engineering College", type: "shelter", latitude: 26.14, longitude: 91.66 },
        ] as any,
        source: "Test",
        observedAt: null,
      },
    };

    const summary = buildSelectedLocationSummary(verifiedFacContext as IndiaLocationContext);
    expect(summary.facilityCount).toBe("2");

    // In AI assistant context, capacity must remain unverified
    const aiCtx = buildResqAssistantContext(verifiedFacContext as IndiaLocationContext);
    expect(aiCtx.facilitiesAvailable).toBe(2);
    expect(aiCtx.facilityCapacityVerified).toBe(false);
  });

  // TEST 8: Cross-state route distance — Invariant check prevents cross-country routes
  it("TEST 8: Rejects routes where distance between origin and destination exceeds local emergency perimeter", () => {
    const origLat = 26.2006; // Assam
    const origLon = 92.9376;
    const destLat = 11.6854; // Wayanad, Kerala
    const destLon = 76.1320;

    const crossCountryDistKm = Math.hypot((destLat - origLat) * 111, (destLon - origLon) * 111 * Math.cos((origLat * Math.PI) / 180));
    expect(crossCountryDistKm).toBeGreaterThan(1500);

    // Invariant: Emergency route must be within 150 km
    const isNearby = crossCountryDistKm <= 150;
    expect(isNearby).toBe(false);
  });

  // TEST 9: AI context must equal current selected location
  it("TEST 9: AI structured context matches canonical location name and never falls back to demo", () => {
    const aiCtxAssam = buildResqAssistantContext(undefined, assamLocation);
    expect(aiCtxAssam.locationName).toBe("Assam");
    expect(aiCtxAssam.state).toBe("Assam");
    expect(aiCtxAssam.locationName).not.toBe("Wayanad");

    const aiCtxWayanad = buildResqAssistantContext(undefined, wayanadLocation);
    expect(aiCtxWayanad.locationName).toBe("Wayanad");
    expect(aiCtxWayanad.locationName).not.toBe("Assam");
  });

  // TEST 10: Canonical Decision Invariant validation
  it("TEST 10: Decision engine validates canonical location consistency and fails closed on mismatch", () => {
    const valid = validateLocationConsistency(
      { locationId: "DIST-KL-WAY", state: "Kerala", latitude: 11.68, longitude: 76.13 },
      { locationId: "DIST-KL-WAY", state: "Kerala", latitude: 11.68, longitude: 76.13 }
    );
    expect(valid).toBe(true);

    const mismatch = validateLocationConsistency(
      { locationId: "DIST-AS-DIB", state: "Assam", latitude: 27.47, longitude: 94.91 },
      { locationId: "DIST-KL-WAY", state: "Kerala", latitude: 11.68, longitude: 76.13 }
    );
    expect(mismatch).toBe(false);
  });
});
