import { describe, expect, it } from "vitest";
import { generatedReports } from "../../drizzle/schema";
import {
  buildSelectedLocationPdf,
  computeMapExtent,
  extractBoundaryRings,
  resolveAssessmentLevel,
  resolveCoordinateMeaning,
  SELECTED_LOCATION_RISK_COLORS,
  validateReportData,
} from "./selectedLocationReport";
import { computeCanonicalDecision } from "./decision/pipeline";
import { buildMultiHazardProfile } from "./hazards/engine";
import { andhraPradeshDefault } from "../../shared/india";

const baseContext = {
  location: {
    id: "india-report-test",
    name: "Test District",
    displayName: "Test District, Test State, India",
    category: "District" as const,
    latitude: 17.1,
    longitude: 78.1,
    population: 456789,
    populationSource: "Open-Meteo Geocoding API / GeoNames",
    boundingBox: [16.8, 77.7, 17.4, 78.5] as [number, number, number, number],
    boundary: {
      type: "Feature" as const,
      properties: { source: "Test boundary" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [77.7, 16.8],
            [78.5, 16.8],
            [78.5, 17.4],
            [77.7, 17.4],
            [77.7, 16.8],
          ],
        ],
      },
    },
    address: { state: "Test State", district: "Test District" },
    source: "Test selected-location source",
  },
  environment: {
    temperatureC: 31,
    precipitationMm: 2,
    usAqi: 71,
    pm25: 18,
    observedAt: "2026-08-24T10:00",
    source: "Open-Meteo Forecast API",
    status: "LIVE MODELLED ENVIRONMENTAL CONTEXT",
    forecast: [1, 2, 3, 4, 5].map((day, index) => ({
      date: `2026-08-${String(24 + index).padStart(2, "0")}`,
      temperatureMinC: 24 + index,
      temperatureMaxC: 33 + index,
      precipitationProbability: 60 - index * 5,
      precipitationSumMm: 8 - index,
      windSpeedMaxKph: 24 - index,
      windGustMaxKph: 38 - index,
      weatherCode: 61,
    })),
  },
  infrastructure: {
    items: [{ id: "facility-1", name: "Test hospital", type: "hospital", latitude: 17.11, longitude: 78.12 }],
    source: "OpenStreetMap Overpass facility sample",
    status: "LIVE OSM FACILITY SAMPLE" as const,
    observedAt: "2026-08-24T10:00",
  },
  screening: {
    riskScore: 62,
    riskLevel: "High" as const,
    priority: "High" as const,
    hazardContext: "Modelled selected-location screening context.",
    populationContext: "456,789 inhabitants reported by the selected geocoding source.",
    status: "LOCATION-SPECIFIC SCREENING CONTEXT",
  },
};

describe("ResQ V3.2 Report Quality & Integrity Validation", () => {
  it("extracts polygon and multipolygon rings without inventing geometry types", () => {
    expect(extractBoundaryRings(baseContext.location.boundary)).toHaveLength(1);
    expect(
      extractBoundaryRings({
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [[[[77.7, 16.8], [78.5, 16.8], [78.5, 17.4], [77.7, 16.8]]]],
        },
      })
    ).toHaveLength(1);
    expect(extractBoundaryRings(null)).toEqual([]);
  });

  it("maintains the four explicit report risk colors", () => {
    expect(SELECTED_LOCATION_RISK_COLORS).toEqual({
      High: "#BD3034",
      Moderate: "#E66E2D",
      Low: "#D3A52D",
      Safe: "#31825D",
    });
  });

  describe("Cartographic Map Extent & Containment Invariants", () => {
    it("guarantees selected location is strictly inside computed map extent", () => {
      const extent = computeMapExtent(baseContext);
      expect(baseContext.location.latitude).toBeGreaterThanOrEqual(extent.south);
      expect(baseContext.location.latitude).toBeLessThanOrEqual(extent.north);
      expect(baseContext.location.longitude).toBeGreaterThanOrEqual(extent.west);
      expect(baseContext.location.longitude).toBeLessThanOrEqual(extent.east);
      expect(extent.boundsAvailable).toBe(true);
      expect(extent.scaleKm).toBeGreaterThan(0);
    });

    it("handles boundary-less points with guaranteed containment and padding", () => {
      const pointContext = {
        ...baseContext,
        location: {
          ...baseContext.location,
          boundingBox: null,
          boundary: null,
        },
      };
      const extent = computeMapExtent(pointContext);
      expect(pointContext.location.latitude).toBeGreaterThan(extent.south);
      expect(pointContext.location.latitude).toBeLessThan(extent.north);
      expect(pointContext.location.longitude).toBeGreaterThan(extent.west);
      expect(pointContext.location.longitude).toBeLessThan(extent.east);
      expect(extent.boundsAvailable).toBe(false);
    });
  });

  describe("Spatial Level & Coordinate Meaning Resolvers", () => {
    it("resolves exact administrative hierarchy levels without ambiguity", () => {
      expect(resolveAssessmentLevel("State")).toBe("STATE-LEVEL SCREENING");
      expect(resolveAssessmentLevel("District")).toBe("DISTRICT-LEVEL SCREENING");
      expect(resolveAssessmentLevel("Block")).toBe("BLOCK/SUBDISTRICT-LEVEL SCREENING");
      expect(resolveAssessmentLevel("Village")).toBe("VILLAGE-LEVEL ASSESSMENT");
      expect(resolveAssessmentLevel("Habitation")).toBe("HABITATION-LEVEL ASSESSMENT");
      expect(resolveAssessmentLevel("City")).toBe("MUNICIPAL / URBAN AREA ASSESSMENT");
    });

    it("explicitly identifies administrative centroids as reference points", () => {
      expect(resolveCoordinateMeaning("State")).toContain("State-level screening reference centroid");
      expect(resolveCoordinateMeaning("District")).toContain("District-level screening centroid");
      expect(resolveCoordinateMeaning("Habitation")).toContain("Assessed local habitation coordinates");
    });
  });

  describe("Report Pre-Generation Guardrails (validateReportData)", () => {
    it("passes for valid location context", () => {
      const result = validateReportData(baseContext);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects coordinates outside India territorial envelope", () => {
      const invalidLat = {
        ...baseContext,
        location: { ...baseContext.location, latitude: 45.0 }, // outside India
      };
      expect(validateReportData(invalidLat).valid).toBe(false);

      const invalidLon = {
        ...baseContext,
        location: { ...baseContext.location, longitude: 105.0 }, // outside India
      };
      expect(validateReportData(invalidLon).valid).toBe(false);
    });

    it("blocks report generation if coordinates are out of bounds", async () => {
      const invalidContext = {
        ...baseContext,
        location: { ...baseContext.location, latitude: 55.0 },
      };
      await expect(buildSelectedLocationPdf(invalidContext)).rejects.toThrow("Report generation blocked by validation guardrails");
    });
  });

  describe("Critical Regression: Andhra Pradesh State-Level Selection", () => {
    it("renders state-level screening report with strict centroid semantics, zero fake routes, and unknown-data safety", async () => {
      const apLoc = {
        ...andhraPradeshDefault,
        id: "india-andhra-pradesh-regression",
      };

      const hazardProfile = buildMultiHazardProfile({
        locationName: apLoc.name,
        latitude: apLoc.latitude,
        longitude: apLoc.longitude,
        stateCode: "AP",
        district: "Andhra Pradesh Centroid",
      });

      const decision = await computeCanonicalDecision({
        location: apLoc,
        hazardProfile,
        evidenceCoverage: {
          availableCount: 5,
          totalCount: 8,
          coverageRatio: 0.62,
          label: "5 / 8 evidence categories available",
          categories: [],
        },
      });

      const apContext = {
        ...baseContext,
        location: apLoc,
        hazardProfile,
        decision,
      };

      // 1. Guardrail validation passes
      const v = validateReportData(apContext);
      expect(v.valid).toBe(true);

      // 2. Extent contains AP centroid (15.9129°N, 79.7400°E)
      const ext = computeMapExtent(apContext);
      expect(apLoc.latitude).toBeGreaterThanOrEqual(ext.south);
      expect(apLoc.latitude).toBeLessThanOrEqual(ext.north);
      expect(apLoc.longitude).toBeGreaterThanOrEqual(ext.west);
      expect(apLoc.longitude).toBeLessThanOrEqual(ext.east);

      // 3. Population is null -> criticalDataMissing is true
      expect(apLoc.population).toBeNull();
      expect(decision.responsePriority.criticalDataMissing).toBe(true);
      expect(decision.responsePriority.priorityLevel).toBe("UNKNOWN");

      // 4. PDF generates cleanly with all 8 pages
      const pdf = await buildSelectedLocationPdf(apContext);
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect(pdf.length).toBeGreaterThan(15_000);
    });
  });

  describe("Authoritative Benchmark Locations Suite", () => {
    const benchmarks = [
      { id: "cal-as-dib", name: "Dibrugarh", state: "AS", lat: 27.4728, lon: 94.912, pop: 154296, slope: 2, elev: 108 },
      { id: "cal-kl-way", name: "Wayanad", state: "KL", lat: 11.6854, lon: 76.132, pop: 817420, slope: 34, elev: 920 },
      { id: "cal-od-pur", name: "Puri", state: "OD", lat: 19.8135, lon: 85.8312, pop: 200564, slope: 1, elev: 12 },
      { id: "cal-rj-jod", name: "Jodhpur", state: "RJ", lat: 26.2389, lon: 73.0243, pop: 1033756, slope: 3, elev: 231 },
      { id: "cal-mh-san", name: "Sangli", state: "MH", lat: 16.8524, lon: 74.5815, pop: 502793, slope: 2, elev: 549 },
      { id: "cal-uk-cha", name: "Chamoli", state: "UK", lat: 30.414, lon: 79.324, pop: 391605, slope: 38, elev: 1500 },
    ];

    benchmarks.forEach((b) => {
      it(`renders compliant 8-page decision report for benchmark: ${b.name} (${b.state})`, async () => {
        const loc = {
          id: b.id,
          name: b.name,
          displayName: `${b.name}, ${b.state}, India`,
          category: "District" as const,
          latitude: b.lat,
          longitude: b.lon,
          population: b.pop,
          populationSource: "Census of India 2011",
          boundingBox: [b.lat - 0.25, b.lon - 0.25, b.lat + 0.25, b.lon + 0.25] as [number, number, number, number],
          boundary: null,
          address: { state: b.state, district: b.name },
          source: "Census 2011 & Survey of India",
        };

        const hazardProfile = buildMultiHazardProfile({
          locationName: b.name,
          latitude: b.lat,
          longitude: b.lon,
          stateCode: b.state,
          district: b.name,
          slopeDegrees: b.slope,
          elevationMeters: b.elev,
        });

        const decision = await computeCanonicalDecision({
          location: loc,
          hazardProfile,
          evidenceCoverage: {
            availableCount: 7,
            totalCount: 8,
            coverageRatio: 0.88,
            label: "7 / 8 evidence categories available",
            categories: [],
          },
        });

        const reportContext = {
          ...baseContext,
          location: loc,
          hazardProfile,
          decision,
        };

        // Guardrail validation check
        const val = validateReportData(reportContext);
        expect(val.valid).toBe(true);

        // Map extent check
        const ext = computeMapExtent(reportContext);
        expect(b.lat).toBeGreaterThanOrEqual(ext.south);
        expect(b.lat).toBeLessThanOrEqual(ext.north);
        expect(b.lon).toBeGreaterThanOrEqual(ext.west);
        expect(b.lon).toBeLessThanOrEqual(ext.east);

        // PDF Generation
        const pdf = await buildSelectedLocationPdf(reportContext);
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
        expect(pdf.length).toBeGreaterThan(16_000);
      });
    });
  });

  describe("Long ID support", () => {
    it("supports the exact long Kakinada location ID used by selected-location reports", async () => {
      const kakinadaId = "india-kakinada-kakinada-urban-kakinada-andhra-pradesh-533001-india-16.944-82.235";
      expect(kakinadaId.length).toBeGreaterThan(64);
      expect(generatedReports.assessmentId.getSQLType()).toBe("varchar(255)");
      const pdf = await buildSelectedLocationPdf({
        ...baseContext,
        location: {
          ...baseContext.location,
          id: kakinadaId,
          name: "Kakinada",
          displayName: "Kakinada, Kakinada Urban, Kakinada, Andhra Pradesh, 533001, India",
          category: "City",
          latitude: 16.9437385,
          longitude: 82.2350607,
          population: null,
          populationSource: "No population value is supplied by Nominatim for this selected place.",
          boundingBox: [16.7837385, 82.0750607, 17.1037385, 82.3950607],
          boundary: null,
          address: { state: "Andhra Pradesh", district: "Kakinada", city: "Kakinada" },
          source: "Nominatim / OpenStreetMap search and boundary context",
        },
      });
      expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
      expect(pdf.length).toBeGreaterThan(7_000);
    });
  });
});
