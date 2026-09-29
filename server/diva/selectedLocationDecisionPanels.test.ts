import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IndiaContextSidebar, IndiaLocationSummaryStrip, SelectedLocationCandidateCapacityTable, SelectedLocationForecast, SelectedLocationForecastSidebar, SelectedLocationForecastSummary, SelectedLocationPriorityDecisionTable, SelectedLocationPriorityQueue, SelectedLocationReportAction } from "../../client/src/components/diva/SelectedLocationDecisionPanels";

const context = {
  location: { id: "india-test", name: "Test City", displayName: "Test City, India", category: "City" as const, latitude: 17.1, longitude: 78.1, population: 456789, populationSource: "Open-Meteo Geocoding API / GeoNames", boundingBox: null, boundary: null, address: { state: "Telangana", city: "Test City" }, source: "Test" },
  infrastructure: { items: [{ id: "facility-test", name: "Test clinic", type: "clinic", latitude: 17.11, longitude: 78.12 }], source: "Test facility source", status: "LIVE OSM FACILITY SAMPLE" as const, observedAt: "2026-08-24T10:00" },
  environment: { temperatureC: 31, precipitationMm: 2, usAqi: 71, pm25: 18, observedAt: "2026-08-24T10:00", source: "Open-Meteo Forecast API", status: "LIVE MODELLED ENVIRONMENTAL CONTEXT", forecast: [{ date: "2026-08-24", temperatureMinC: 24, temperatureMaxC: 33, precipitationProbability: 60, precipitationSumMm: 8, windSpeedMaxKph: 24, windGustMaxKph: 38, weatherCode: 61 }] },
  screening: { riskScore: 62, riskLevel: "High" as const, priority: "High" as const, hazardContext: "Modelled selected-location screening.", populationContext: "456,789 inhabitants.", status: "LOCATION-SPECIFIC SCREENING CONTEXT" },
};

describe("selected-location priority and forecast panels", () => {
  it("renders selected population, derived priority, and live modelled forecast data", () => {
    const markup = renderToStaticMarkup(createElement("div", null, createElement(IndiaContextSidebar, { context, onOpenKeralaAssessment: () => undefined }), createElement(IndiaLocationSummaryStrip, { context }), createElement(SelectedLocationPriorityQueue, { context }), createElement(SelectedLocationPriorityDecisionTable, { context }), createElement(SelectedLocationForecastSidebar, { context }), createElement(SelectedLocationForecastSummary, { context }), createElement(SelectedLocationForecast, { context })));
    expect(markup).toContain("Test City");
    expect(markup).toContain("HIGH PRIORITY");
    expect(markup).toContain("4,56,789");
    expect(markup).toContain("24–33°C");
    expect(markup).toContain("five-day values are Open-Meteo modelled context");
    expect(markup).toContain("Forecast refreshed");
    expect(markup).toContain("24 Aug, 10:00 am");
    expect(markup).toContain("Selected-area comparison row");
    expect(markup).toContain("Location decision context");
    expect(markup).toContain("Decision readout");
    expect(markup).toContain("Selected India forecast sidebar");
    expect(markup).toContain("Next day: 24–33°C · 60% rain · 24 km/h wind");
    expect(markup).toContain("Forecast refreshed");
    // Verify carrying capacity is displayed in the sidebar & summary strip
    expect(markup).toContain("Carrying Capacity");
    expect(markup).toContain("Capacity Balance");
  });

  it("renders a clear selected-area PDF action", () => {
    const markup = renderToStaticMarkup(createElement(SelectedLocationReportAction, { context, isPending: false, onDownload: () => undefined }));
    expect(markup).toContain("Complete selected-area analysis");
    expect(markup).toContain("Download selected-area PDF");
    expect(markup).toContain("grounded AI/ML narrative");
  });

  it("renders dynamic Carrying Capacity candidate sites table with PS191 model metrics", () => {
    const contextWithDecision = {
      ...context,
      decision: {
        decisionId: "RESQ-DEC-test-1",
        decisionSnapshotHash: "hash1234567890",
        capacityAssessment: {
          capacityStatus: "CAPACITY_UNAVAILABLE" as const,
          capacityVerified: false,
          capacitySource: "OpenStreetMap",
          capacityTimestamp: null,
          totalNearbyFacilities: 4,
          eligibleRelocationShelters: 3,
          hospitalsExcludedFromShelters: 1,
          requiredCapacity: 15000,
          availableCapacity: null,
          capacityDeficit: null,
          notes: "OSM mapped; capacity unverified from registers (strictly null).",
        },
        relocationAssessment: {
          candidateStatus: "CANDIDATE_FOUND" as const,
          bestCandidate: {
            facilityId: "FAC-1",
            name: "Central High School Relief Shelter",
            facilityRole: "EMERGENCY_SHELTER" as const,
            latitude: 17.12,
            longitude: 78.13,
            capacity: null,
            capacitySource: "OSM",
            capacityConfidence: "UNAVAILABLE" as const,
            relocationSuitability: "PREFERRED" as const,
            straightLineDistanceKm: 3.2,
            routeDistanceKm: 4.1,
            distanceType: "ROAD_NETWORK" as const,
            estimatedTravelTimeMinutes: 8,
            hazardScreeningNote: "Elevated ridge outside flood zone",
            facilityHazardTier: "GREEN" as const,
            facilityHazardScore: 18,
          },
          destinationSafety: {
            destinationName: "Central High School Relief Shelter",
            destinationInsideHazard: false,
            destinationHazardTier: "GREEN" as const,
            destinationHazardScore: 18,
            destinationSafetyStatus: "SAFE" as const,
            checkDetails: "Verified safe",
          },
          conditionalAlternatives: [],
          facilitiesWithHazardConflict: [],
          nearestFacilities: [
            {
              facilityId: "FAC-1",
              name: "Central High School Relief Shelter",
              facilityRole: "EMERGENCY_SHELTER" as const,
              latitude: 17.12,
              longitude: 78.13,
              capacity: null,
              capacitySource: "OSM",
              capacityConfidence: "UNAVAILABLE" as const,
              relocationSuitability: "PREFERRED" as const,
              straightLineDistanceKm: 3.2,
              routeDistanceKm: 4.1,
              distanceType: "ROAD_NETWORK" as const,
              estimatedTravelTimeMinutes: 8,
              hazardScreeningNote: "Elevated ridge outside flood zone",
              facilityHazardTier: "GREEN" as const,
              facilityHazardScore: 18,
            },
            {
              facilityId: "FAC-2",
              name: "District Civil Hospital",
              facilityRole: "HOSPITAL_MEDICAL_SUPPORT" as const,
              latitude: 17.15,
              longitude: 78.14,
              capacity: null,
              capacitySource: "OSM",
              capacityConfidence: "UNAVAILABLE" as const,
              relocationSuitability: "CONDITIONAL" as const,
              straightLineDistanceKm: 5.6,
              routeDistanceKm: 6.9,
              distanceType: "ROAD_NETWORK" as const,
              estimatedTravelTimeMinutes: 14,
              hazardScreeningNote: "Medical support only",
              facilityHazardTier: "YELLOW" as const,
              facilityHazardScore: 35,
            }
          ],
          rationale: "Selected Central High School as primary haven",
        },
      },
    };

    const markup = renderToStaticMarkup(createElement(SelectedLocationCandidateCapacityTable, { context: contextWithDecision as any }));
    expect(markup).toContain("Carrying Capacity Assessment: Test City");
    expect(markup).toContain("PS191 Capacity Model");
    expect(markup).toContain("Central High School Relief Shelter");
    expect(markup).toContain("Primary Haven");
    expect(markup).toContain("District Civil Hospital");
    expect(markup).toContain("HOSPITAL MEDICAL SUPPORT");
    expect(markup).toContain("Unverified (null)");
    expect(markup).toContain("4.1 km");
  });
});
