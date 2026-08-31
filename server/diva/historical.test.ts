import { describe, expect, it } from "vitest";
import { compareHistoricalGeometry, deriveHistoricalPrediction, validateDatasetGeometry } from "./historical";
import type { GeometryFeatureCollection } from "../../shared/historical";

const preEvent: GeometryFeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { rainfall: 80, population: 900, slope: 18 }, geometry: { type: "Point", coordinates: [76.0, 11.5] } },
    { type: "Feature", properties: { rainfall: 250, population: 1800, slope: 43 }, geometry: { type: "Point", coordinates: [76.03, 11.52] } },
    { type: "Feature", properties: { rainfall: 170, population: 1100, slope: 26 }, geometry: { type: "Point", coordinates: [76.06, 11.54] } },
  ],
};

const square = (west: number, south: number, east: number, north: number): GeometryFeatureCollection => ({
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } }],
});

describe("Historical Replay decision-support logic", () => {
  it("validates supplied WGS84 geometry and preserves analyst-readable warnings", () => {
    const validation = validateDatasetGeometry(preEvent, ["rainfall", "population", "slope"], { latitude: "lat", longitude: "lon" });
    expect(validation.status).toBe("VALID");
    expect(validation.featureCount).toBe(3);
    expect(validation.validCoordinateRate).toBe(100);
  });

  it("derives prediction zones from pre-event values only", () => {
    const run = deriveHistoricalPrediction("CASE-TEST", preEvent, { rainfallMultiplier: 1.2, populationMultiplier: 1, shelterMultiplier: 0.8, routeBlocked: true, temperatureDeltaC: 2 });
    expect(run.dataStatus).toBe("DATASET-DERIVED PREDICTION");
    expect(run.prediction.features.length).toBeGreaterThan(0);
    expect(run.methodology).toContain("Ground-truth data is not used");
  });

  it("calculates geographic overlap metrics from supplied polygons rather than fixed validation values", () => {
    const metrics = compareHistoricalGeometry(square(0, 0, 2, 2), square(1, 1, 3, 3));
    expect(metrics.available).toBe(true);
    expect(metrics.iou).toBeGreaterThan(0);
    expect(metrics.iou).toBeLessThan(100);
    expect(metrics.falsePositiveAreaKm2).toBeGreaterThan(0);
    expect(metrics.falseNegativeAreaKm2).toBeGreaterThan(0);
  });
});
