import { describe, expect, it } from "vitest";
import { generatedReports } from "../../drizzle/schema";
import { buildSelectedLocationPdf, extractBoundaryRings, SELECTED_LOCATION_RISK_COLORS } from "./selectedLocationReport";
import { computeCanonicalDecision } from "./decision/pipeline";
import { buildMultiHazardProfile } from "./hazards/engine";

const context = {
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
    boundary: { type: "Feature" as const, properties: { source: "Test boundary" }, geometry: { type: "Polygon", coordinates: [[[77.7, 16.8], [78.5, 16.8], [78.5, 17.4], [77.7, 17.4], [77.7, 16.8]]] } },
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
    forecast: [1, 2, 3, 4, 5].map((day, index) => ({ date: `2026-08-${String(24 + index).padStart(2, "0")}`, temperatureMinC: 24 + index, temperatureMaxC: 33 + index, precipitationProbability: 60 - index * 5, precipitationSumMm: 8 - index, windSpeedMaxKph: 24 - index, windGustMaxKph: 38 - index, weatherCode: 61 })),
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

describe("selected-location PDF reporting", () => {
  it("extracts polygon and multipolygon rings without inventing a geometry type", () => {
    expect(extractBoundaryRings(context.location.boundary)).toHaveLength(1);
    expect(extractBoundaryRings({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: [[[[77.7, 16.8], [78.5, 16.8], [78.5, 17.4], [77.7, 16.8]]]] } })).toHaveLength(1);
    expect(extractBoundaryRings(null)).toEqual([]);
  });

  it("keeps the four report map colours explicit", () => {
    expect(SELECTED_LOCATION_RISK_COLORS).toEqual({ High: "#BD3034", Moderate: "#E66E2D", Low: "#D3A52D", Safe: "#31825D" });
  });

  it("renders a complete non-empty PDF for the selected area", async () => {
    const pdf = await buildSelectedLocationPdf(context);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(7_000);
  });

  it("supports the exact long Kakinada location ID used by selected-location reports", async () => {
    const kakinadaId = "india-kakinada-kakinada-urban-kakinada-andhra-pradesh-533001-india-16.944-82.235";
    expect(kakinadaId.length).toBeGreaterThan(64);
    expect(generatedReports.assessmentId.getSQLType()).toBe("varchar(255)");
    const pdf = await buildSelectedLocationPdf({
      ...context,
      location: {
        ...context.location,
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

  it("renders a 7-page professional decision report when full canonical decision is supplied", async () => {
    const loc = {
      id: "cal-kl-way",
      name: "Wayanad",
      displayName: "Wayanad, Kerala, India",
      category: "District" as const,
      latitude: 11.6854,
      longitude: 76.132,
      population: 817420,
      populationSource: "Census of India 2011",
      boundingBox: [11.45, 75.9, 11.95, 76.35] as [number, number, number, number],
      boundary: null,
      address: { state: "Kerala", district: "Wayanad" },
      source: "Census 2011 & Survey of India",
    };

    const hazardProfile = buildMultiHazardProfile({
      locationName: "Wayanad",
      latitude: 11.6854,
      longitude: 76.132,
      stateCode: "KL",
      district: "Wayanad",
      slopeDegrees: 34,
      elevationMeters: 920,
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

    const fullContext = {
      ...context,
      location: loc,
      hazardProfile,
      decision,
    };

    const pdf = await buildSelectedLocationPdf(fullContext);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(15_000);
  });
});

