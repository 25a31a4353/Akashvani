import { describe, expect, it } from "vitest";
import type { AssessmentAnalysis } from "@shared/diva";
import type { IndiaLocationContext } from "@shared/india";
import { buildLocationPlanningCorridor, buildRelocationRoute, buildSelectedLocationSummary, formatMapMetric, getRecommendedSite, mapRiskColor } from "./mapCommandUi";

const analysis = { candidateSites: [{ id: "SITE-01", name: "North bank ground", capacity: 600, availableCapacity: 420, serviceAccess: 82, suitability: 92, constraints: [], score: 90, recommendation: "Preferred for phased relocation." }] } as AssessmentAnalysis;
const assamContext = {
  location: { id: "india-assam", name: "Assam", displayName: "Assam, India", category: "State", latitude: 26.2006, longitude: 92.9376, population: null, populationSource: "Population unavailable", boundingBox: null, boundary: null, address: { state: "Assam" }, source: "Selected search result" },
  environment: { temperatureC: 28, precipitationMm: 3.2, usAqi: 41, pm25: 12, observedAt: "2026-08-26T04:30:00.000Z", forecast: [{ date: "2026-08-27", temperatureMinC: 25, temperatureMaxC: 32, precipitationProbability: 60, precipitationSumMm: 8, windSpeedMaxKph: 14, windGustMaxKph: 24, weatherCode: 80 }], source: "Open-Meteo", status: "MODELLED CONTEXT" },
  infrastructure: { items: [{ id: "facility-1", name: "Assam facility", type: "hospital", latitude: 26.21, longitude: 92.94 }], source: "OpenStreetMap", status: "LIVE OSM FACILITY SAMPLE", observedAt: "2026-08-26T04:30:00.000Z" },
  screening: { riskScore: 61, riskLevel: "Moderate", priority: "High", hazardContext: "Assam selected-location hazard context", populationContext: "Population unavailable for this state selection", status: "SCREENED" },
} as IndiaLocationContext;

describe("map command presentation helpers", () => {
  it("formats map metrics using the Indian locale and preserves unavailable values", () => {
    expect(formatMapMetric(1200)).toBe("1,200");
    expect(formatMapMetric(null)).toBe("—");
  });

  it("maps the assessment risk levels to the command palette", () => {
    expect(mapRiskColor("High")).toBe("#ff8a20");
    expect(mapRiskColor("Low")).toBe("#43c95b");
  });

  it("selects the first candidate site as the recommendation shown in the panel", () => {
    expect(getRecommendedSite(analysis)?.name).toBe("North bank ground");
    expect(getRecommendedSite({ candidateSites: [] } as AssessmentAnalysis)).toBeNull();
  });

  it("summarizes selected-location details without falling back to assessment data", () => {
    const summary = buildSelectedLocationSummary(assamContext);
    expect(summary.title).toBe("State: Assam");
    expect(summary.subtitle).toBe("Assam, India");
    expect(summary.population).toBe("Unavailable");
    expect(summary.risk).toBe("61/100");
    expect(summary.priority).toBe("High");
    expect(summary.temperature).toBe("28°C");
    expect(summary.precipitation).toBe("3.2 mm");
    expect(summary.airQuality).toBe("AQI 41");
    expect(summary.nextForecast).toBe("25–32°C");
    expect(summary.facilityCount).toBe("1");
    expect(summary.action).toContain("Assam");
  });

  it("builds a selected-location corridor from selected-context facilities only", () => {
    const route = buildLocationPlanningCorridor(assamContext.location, { infrastructure: [], nearbyInfrastructure: assamContext.infrastructure.items });
    expect(route.coordinates[0]).toEqual([assamContext.location.longitude, assamContext.location.latitude]);
    expect(route.destinationLabel).toBe("Assam facility");
    expect(route.sourceNote).toContain("not yet verified");
  });

  it("builds a labeled route from the selected area to the nearest available context point", () => {
    const route = buildRelocationRoute({ latitude: 10, longitude: 76, name: "Wayanad", district: "Wayanad", state: "Kerala, India", population: 1200, households: 300, areaKm2: 10, populationDensity: 120, vulnerablePopulation: 430, primaryHazard: "Flood", hazardSeverity: 72, rainfallMm: 10, temperatureC: 28, aqi: 42, hospitalDistanceKm: 4, shelterCapacity: 600, roadAccessScore: 82, waterAvailabilityScore: 70, incidentIndex: 65, dataStatus: "TEST", updatedAt: "TEST" }, { infrastructure: [{ name: "Transit campus", longitude: 76.03, latitude: 10.02 }] }, "North bank ground");
    expect(route.coordinates).toHaveLength(3);
    expect(route.coordinates[0]).toEqual([76, 10]);
    expect(route.destinationLabel).toBe("North bank ground");
    expect(route.distanceKm).toBeGreaterThan(2);
    expect(route.isPlanningCorridor).toBe(true);
    expect(route.sourceNote).toContain("not yet verified");
  });
});
