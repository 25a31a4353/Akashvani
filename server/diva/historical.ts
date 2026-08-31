import area from "@turf/area";
import bbox from "@turf/bbox";
import intersect from "@turf/intersect";
import { featureCollection, polygon } from "@turf/helpers";
import type { DatasetMapping, DatasetValidation, GeometryFeatureCollection, HistoricalReplayResult, ValidationMetrics } from "../../shared/historical";

type GeoFeature = GeometryFeatureCollection["features"][number];

const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)) ? Number(value) : undefined;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

function geometryIsPresent(feature: GeoFeature) { return Boolean(feature.geometry && feature.geometry.type && feature.geometry.coordinates); }
function geometryPoints(geometry: GeoFeature["geometry"]): number[][] {
  const coordinates = geometry.coordinates as unknown;
  if (geometry.type === "Point" && Array.isArray(coordinates)) return [coordinates as number[]];
  if (geometry.type === "LineString" && Array.isArray(coordinates)) return coordinates as number[][];
  if (geometry.type === "Polygon" && Array.isArray(coordinates)) return (coordinates as number[][][]).flat();
  if (geometry.type === "MultiPolygon" && Array.isArray(coordinates)) return (coordinates as number[][][][]).flat(2);
  return [];
}

function validPoint(point: number[]) { return point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90; }

export function validateDatasetGeometry(data: GeometryFeatureCollection, schema: string[], mapping: DatasetMapping): DatasetValidation {
  const features = Array.isArray(data?.features) ? data.features : [];
  const types = Array.from(new Set(features.map(feature => feature.geometry?.type).filter(Boolean))) as string[];
  const duplicates = new Set<string>();
  let missingCoordinates = 0; let invalidGeometries = 0; let emptyGeometries = 0; let duplicateRecords = 0; let coordinateBearing = 0; let validCoordinateBearing = 0;
  features.forEach(feature => {
    const fingerprint = JSON.stringify([feature.geometry, feature.properties]);
    if (duplicates.has(fingerprint)) duplicateRecords += 1; else duplicates.add(fingerprint);
    if (!geometryIsPresent(feature)) { emptyGeometries += 1; return; }
    const points = geometryPoints(feature.geometry);
    if (!points.length) { missingCoordinates += 1; return; }
    coordinateBearing += 1;
    if (points.every(validPoint)) validCoordinateBearing += 1; else invalidGeometries += 1;
  });
  const warnings: string[] = [];
  if (!features.length) warnings.push("No parseable features were supplied. Import a GeoJSON geometry or map latitude/longitude fields before analysis.");
  if (missingCoordinates) warnings.push(`${missingCoordinates} record(s) have no usable geometry or coordinate pair.`);
  if (invalidGeometries) warnings.push(`${invalidGeometries} geometry record(s) contain out-of-range coordinates.`);
  if (duplicateRecords) warnings.push(`${duplicateRecords} duplicate record(s) were detected by geometry and property fingerprint.`);
  if (mapping.latitude && !mapping.longitude || mapping.longitude && !mapping.latitude) warnings.push("Both latitude and longitude mappings are required for tabular point datasets.");
  const validCoordinateRate = coordinateBearing ? Number((validCoordinateBearing / coordinateBearing * 100).toFixed(1)) : null;
  return {
    status: !features.length || invalidGeometries > 0 ? "INVALID" : warnings.length ? "WARNING" : "VALID",
    featureCount: features.length,
    geometryTypes: types,
    crs: "EPSG:4326 / WGS84 (web visualization target)",
    validCoordinateRate,
    missingCoordinates,
    duplicateRecords,
    emptyGeometries,
    invalidGeometries,
    warnings,
    notes: schema.length ? [`Detected ${schema.length} source field(s). Column mapping remains analyst-editable.`] : ["No tabular schema was supplied."],
  };
}

function normalize(values: number[]) { const low = Math.min(...values); const high = Math.max(...values); return (value: number) => high === low ? 0.5 : (value - low) / (high - low); }

export function deriveHistoricalPrediction(caseStudyId: string, input: GeometryFeatureCollection, parameters: HistoricalReplayResult["parameters"]): HistoricalReplayResult {
  const pointFeatures = input.features.filter(feature => feature.geometry?.type === "Point" && geometryPoints(feature.geometry).every(validPoint));
  if (!pointFeatures.length) throw new Error("Historical replay requires at least one valid pre-event point feature with WGS84 coordinates.");
  const rainfall = pointFeatures.map(feature => numeric(feature.properties?.rainfall) ?? numeric(feature.properties?.precipitation) ?? 0);
  const population = pointFeatures.map(feature => numeric(feature.properties?.population) ?? numeric(feature.properties?.population_density) ?? 0);
  const slope = pointFeatures.map(feature => numeric(feature.properties?.slope) ?? 0);
  const rainfallScale = normalize(rainfall); const populationScale = normalize(population); const slopeScale = normalize(slope);
  const scored = pointFeatures.map((feature, index) => ({ feature, score: clamp((rainfallScale(rainfall[index]) * parameters.rainfallMultiplier * 0.5) + (slopeScale(slope[index]) * 0.32) + (populationScale(population[index]) * parameters.populationMultiplier * 0.18) + (parameters.temperatureDeltaC / 20), 0, 1) }));
  const selected = scored.filter(item => item.score >= 0.62).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.ceil(scored.length / 3)));
  const extent = bbox(featureCollection(pointFeatures as never));
  const halfSize = Math.max((extent[2] - extent[0]) / 42, (extent[3] - extent[1]) / 42, 0.0025);
  const features = selected.map((item, index) => {
    const [longitude, latitude] = item.feature.geometry.coordinates as number[];
    return { type: "Feature" as const, properties: { id: `PRED-${index + 1}`, sourceFeatureId: String(item.feature.properties?.id ?? item.feature.properties?.asset_id ?? item.feature.properties?.name ?? `source-${index + 1}`), assetType: String(item.feature.properties?.asset_type ?? item.feature.properties?.type ?? ""), label: "Predicted hazard zone", riskScore: Math.round(item.score * 100), provenance: "Derived solely from uploaded pre-event inputs and stated simulation parameters" }, geometry: polygon([[[longitude - halfSize, latitude - halfSize], [longitude + halfSize, latitude - halfSize], [longitude + halfSize, latitude + halfSize], [longitude - halfSize, latitude + halfSize], [longitude - halfSize, latitude - halfSize]]]).geometry };
  });
  const baselineRisk = Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length * 100);
  const baselinePopulation = Math.round(population.reduce((sum, value) => sum + value, 0));
  const simulatedRisk = clamp(Math.round(baselineRisk + ((parameters.rainfallMultiplier - 1) * 28) + ((parameters.populationMultiplier - 1) * 13) + (parameters.routeBlocked ? 9 : 0) + (parameters.temperatureDeltaC * 2)), 0, 100);
  const capacity = clamp(Math.round(68 * parameters.shelterMultiplier - (parameters.routeBlocked ? 18 : 0)), 0, 100);
  return { id: `RUN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, caseStudyId, generatedAt: new Date().toISOString(), prediction: { type: "FeatureCollection", features }, methodology: "Reproducible historical replay: normalized uploaded pre-event rainfall/precipitation, slope, and population attributes; parameters applied after baseline calculation. Ground-truth data is not used in this prediction step.", baseline: { risk: baselineRisk, populationExposure: baselinePopulation, carryingCapacity: 68, relocationPriority: clamp(Math.round(baselineRisk * 0.82), 0, 100) }, simulated: { risk: simulatedRisk, populationExposure: Math.round(baselinePopulation * parameters.populationMultiplier), carryingCapacity: capacity, relocationPriority: clamp(Math.round(simulatedRisk * 0.82 + (parameters.routeBlocked ? 7 : 0)), 0, 100) }, parameters, dataStatus: "DATASET-DERIVED PREDICTION" };
}

function polygonFeatures(data: GeometryFeatureCollection) { return data.features.filter(feature => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon"); }

export function compareHistoricalGeometry(prediction: GeometryFeatureCollection, observed: GeometryFeatureCollection, populations?: { predicted?: number; actual?: number }, infrastructure?: { predicted?: number; actual?: number; correctlyDetected?: number }): ValidationMetrics {
  const predicted = polygonFeatures(prediction); const actual = polygonFeatures(observed);
  if (!predicted.length || !actual.length) return { available: false, limitations: ["IoU, precision, recall, and F1 require polygon or multipolygon features in both predicted and observed datasets. No metric has been inferred from non-geospatial metadata."] };
  const predictedArea = predicted.reduce((sum, feature) => sum + area(feature as never), 0);
  const actualArea = actual.reduce((sum, feature) => sum + area(feature as never), 0);
  let overlapArea = 0;
  predicted.forEach(predictedFeature => actual.forEach(actualFeature => {
    const overlap = intersect(featureCollection([predictedFeature, actualFeature] as never));
    if (overlap) overlapArea += area(overlap as never);
  }));
  overlapArea = Math.min(overlapArea, predictedArea, actualArea);
  const precision = predictedArea ? overlapArea / predictedArea : 0;
  const recall = actualArea ? overlapArea / actualArea : 0;
  const iou = (predictedArea + actualArea - overlapArea) ? overlapArea / (predictedArea + actualArea - overlapArea) : 0;
  const metrics: ValidationMetrics = { available: true, predictedAreaKm2: Number((predictedArea / 1_000_000).toFixed(3)), actualAreaKm2: Number((actualArea / 1_000_000).toFixed(3)), overlapAreaKm2: Number((overlapArea / 1_000_000).toFixed(3)), iou: Number((iou * 100).toFixed(1)), precision: Number((precision * 100).toFixed(1)), recall: Number((recall * 100).toFixed(1)), f1: Number((precision + recall ? 2 * precision * recall / (precision + recall) * 100 : 0).toFixed(1)), overlapPercent: Number((recall * 100).toFixed(1)), falsePositiveAreaKm2: Number(((predictedArea - overlapArea) / 1_000_000).toFixed(3)), falseNegativeAreaKm2: Number(((actualArea - overlapArea) / 1_000_000).toFixed(3)), limitations: ["Area metrics are calculated from the supplied WGS84 geometries. Overlapping source polygons can affect aggregate overlap; review source topology before operational use."] };
  if (populations?.predicted !== undefined && populations.actual !== undefined) { metrics.predictedPopulation = populations.predicted; metrics.actualPopulation = populations.actual; metrics.populationDifference = populations.actual - populations.predicted; metrics.populationErrorPercent = populations.actual ? Number((Math.abs(populations.actual - populations.predicted) / populations.actual * 100).toFixed(1)) : undefined; }
  const predictedInfrastructureIds = new Set(predicted.map(feature => String(feature.properties?.sourceFeatureId ?? "")).filter(Boolean));
  const observedInfrastructureIds = new Set(actual.map(feature => String(feature.properties?.asset_id ?? feature.properties?.id ?? "")).filter(Boolean));
  if (predictedInfrastructureIds.size && observedInfrastructureIds.size) {
    const correctlyDetected = Array.from(predictedInfrastructureIds).filter(id => observedInfrastructureIds.has(id)).length;
    metrics.predictedInfrastructureAffected = predictedInfrastructureIds.size;
    metrics.actualInfrastructureAffected = observedInfrastructureIds.size;
    metrics.correctlyDetectedInfrastructure = correctlyDetected;
    metrics.infrastructureDetectionRate = Number((correctlyDetected / observedInfrastructureIds.size * 100).toFixed(1));
  }
  if (infrastructure?.predicted !== undefined && infrastructure.actual !== undefined) { metrics.predictedInfrastructureAffected = infrastructure.predicted; metrics.actualInfrastructureAffected = infrastructure.actual; metrics.correctlyDetectedInfrastructure = infrastructure.correctlyDetected ?? 0; metrics.infrastructureDetectionRate = infrastructure.actual ? Number(((infrastructure.correctlyDetected ?? 0) / infrastructure.actual * 100).toFixed(1)) : undefined; }
  return metrics;
}
