import { describe, expect, it } from "vitest";
import { buildHistoricalAnalysisPdf } from "./historicalReport";
import type { HistoricalCaseStudy, HistoricalDataset, HistoricalReplayResult } from "../../shared/historical";

const caseStudy: HistoricalCaseStudy = { id: "CASE-TEST", name: "Validation Test Case", location: "Kerala", hazardType: "Landslide", eventDate: "2024-07-30", description: "Automated report test", createdAt: new Date().toISOString() };
const dataset: HistoricalDataset = { id: "DS-TEST", caseStudyId: "CASE-TEST", fileName: "pre-event.geojson", version: 1, phase: "PRE_EVENT", format: "GEOJSON", sourceType: "Research Dataset", storageUrl: "/manus-storage/test", schema: ["rainfall"], mapping: { rainfall: "rainfall" }, validation: { status: "VALID", featureCount: 1, geometryTypes: ["Point"], crs: "EPSG:4326 / WGS84 (web visualization target)", validCoordinateRate: 100, missingCoordinates: 0, duplicateRecords: 0, emptyGeometries: 0, invalidGeometries: 0, warnings: [], notes: [] }, createdAt: new Date().toISOString() };
const run: HistoricalReplayResult = { id: "RUN-TEST", caseStudyId: "CASE-TEST", generatedAt: new Date().toISOString(), prediction: { type: "FeatureCollection", features: [] }, methodology: "Test method", baseline: { risk: 55, populationExposure: 1000, carryingCapacity: 68, relocationPriority: 45 }, simulated: { risk: 63, populationExposure: 1200, carryingCapacity: 58, relocationPriority: 54 }, parameters: { rainfallMultiplier: 1.2, populationMultiplier: 1.2, shelterMultiplier: .85, routeBlocked: false, temperatureDeltaC: 1 }, dataStatus: "DATASET-DERIVED PREDICTION" };

describe("Historical analysis reporting", () => {
  it("renders a non-empty PDF from retained historical analysis evidence", async () => {
    const pdf = await buildHistoricalAnalysisPdf(caseStudy, [dataset], run, { available: false, limitations: ["Observed polygon not supplied."] });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(3_000);
  });
});
