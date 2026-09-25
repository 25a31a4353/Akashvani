/**
 * ResQ Decision Intelligence Engine V2 — Validation & Accuracy Harness
 * 
 * Strict Accuracy Principle:
 * NEVER claim "99% accurate" unless an actual validation dataset demonstrates it.
 * Reports real, empirically measured validation metrics:
 * - Hazard Classification Accuracy, Precision, Recall, F1
 * - Confusion Matrix
 * - Road Route Availability %
 * - Destination Safety Agreement %
 * - Sensitivity & Invariant Testing
 */

import type { DecisionTier } from "../../../shared/decisionEngine";
import type { HazardType } from "../../../shared/hazards";
import { computeCanonicalDecision } from "./pipeline";
import { buildMultiHazardProfile } from "../hazards/engine";

export interface ValidationCase {
  id: string;
  name: string;
  stateCode: string;
  latitude: number;
  longitude: number;
  slopeDegrees: number | null;
  elevationMeters: number | null;
  expectedPrimaryHazard: HazardType[];
  expectedTiers: DecisionTier[];
  expectedRouteAvailable: boolean;
  notes: string;
}

export const AUTHORITATIVE_VALIDATION_CASES: ValidationCase[] = [
  {
    id: "VAL-AS-DIB",
    name: "Dibrugarh",
    stateCode: "AS",
    latitude: 27.4728,
    longitude: 94.912,
    slopeDegrees: 2,
    elevationMeters: 108,
    expectedPrimaryHazard: ["FLOOD", "RIVERBANK_EROSION"],
    expectedTiers: ["RED", "ORANGE"],
    expectedRouteAvailable: true,
    notes: "Brahmaputra annual flood corridor & active riverbank migration reach (Brahmaputra Board)",
  },
  {
    id: "VAL-KL-WAY",
    name: "Wayanad",
    stateCode: "KL",
    latitude: 11.6854,
    longitude: 76.132,
    slopeDegrees: 28,
    elevationMeters: 920,
    expectedPrimaryHazard: ["LANDSLIDE"],
    expectedTiers: ["RED", "ORANGE"],
    expectedRouteAvailable: true,
    notes: "ISRO Landslide Atlas Rank #13/147, steep slope >25° in Western Ghats granulite terrain",
  },
  {
    id: "VAL-OD-PUR",
    name: "Puri",
    stateCode: "OD",
    latitude: 19.8135,
    longitude: 85.8312,
    slopeDegrees: 1,
    elevationMeters: 6,
    expectedPrimaryHazard: ["CYCLONE", "FLOOD"],
    expectedTiers: ["ORANGE", "RED"],
    expectedRouteAvailable: true,
    notes: "Bay of Bengal historical cyclone landfall zone (Phailin/Fani) & low-elevation coastal plain",
  },
  {
    id: "VAL-RJ-JOD",
    name: "Jodhpur",
    stateCode: "RJ",
    latitude: 26.2389,
    longitude: 73.0243,
    slopeDegrees: 2,
    elevationMeters: 231,
    expectedPrimaryHazard: ["DROUGHT", "EXTREME_HEAT", "FLOOD"],
    expectedTiers: ["GREEN", "ORANGE"],
    expectedRouteAvailable: true,
    notes: "Arid Thar desert baseline; calm conditions without active flash flood trigger",
  },
  {
    id: "VAL-UK-CHA",
    name: "Chamoli",
    stateCode: "UK",
    latitude: 30.55,
    longitude: 79.56,
    slopeDegrees: 34,
    elevationMeters: 1890,
    expectedPrimaryHazard: ["LANDSLIDE", "SEISMIC"],
    expectedTiers: ["RED"],
    expectedRouteAvailable: true,
    notes: "Himalayan seismic zone V, catastrophic mass wasting history (Joshimath/Rishi Ganga)",
  },
  {
    id: "VAL-BR-KHA",
    name: "Khagaria",
    stateCode: "BR",
    latitude: 25.5,
    longitude: 86.48,
    slopeDegrees: 1,
    elevationMeters: 36,
    expectedPrimaryHazard: ["FLOOD", "RIVERBANK_EROSION"],
    expectedTiers: ["RED"],
    expectedRouteAvailable: true,
    notes: "Kosi-Ganga confluence annual inundation zone (Bihar FMISC flood footprint)",
  },
  {
    id: "VAL-MH-SAN",
    name: "Sangli",
    stateCode: "MH",
    latitude: 16.85,
    longitude: 74.58,
    slopeDegrees: 2,
    elevationMeters: 550,
    expectedPrimaryHazard: ["FLOOD"],
    expectedTiers: ["ORANGE", "RED"],
    expectedRouteAvailable: true,
    notes: "Krishna river basin flood basin (2019/2021 historical inundation events)",
  },
  {
    id: "VAL-TN-CHE",
    name: "Chennai",
    stateCode: "TN",
    latitude: 13.0827,
    longitude: 80.2707,
    slopeDegrees: 1,
    elevationMeters: 8,
    expectedPrimaryHazard: ["CYCLONE", "FLOOD", "EXTREME_RAINFALL"],
    expectedTiers: ["ORANGE", "RED"],
    expectedRouteAvailable: true,
    notes: "Coromandel coastal plain subject to northeast monsoon tropical cyclones & storm surge",
  },
  {
    id: "VAL-AP-VIS",
    name: "Visakhapatnam",
    stateCode: "AP",
    latitude: 17.6868,
    longitude: 83.2185,
    slopeDegrees: 4,
    elevationMeters: 14,
    expectedPrimaryHazard: ["CYCLONE"],
    expectedTiers: ["ORANGE", "RED"],
    expectedRouteAvailable: true,
    notes: "Eastern seaboard cyclone landfall corridor (Hudhud 2014 landfall ground zero)",
  },
  {
    id: "VAL-MZ-AIZ",
    name: "Aizawl",
    stateCode: "MZ",
    latitude: 23.7271,
    longitude: 92.7176,
    slopeDegrees: 24,
    elevationMeters: 1130,
    expectedPrimaryHazard: ["LANDSLIDE", "SEISMIC"],
    expectedTiers: ["RED", "ORANGE"],
    expectedRouteAvailable: true,
    notes: "Steep anticlinal ridges, BIS Seismic Zone V, high monsoon rainfall landslide hazard",
  },
];

export interface ValidationMetrics {
  totalEvaluated: number;
  hazardMatchCount: number;
  tierMatchCount: number;
  hazardAccuracy: number; // 0.0 - 1.0
  tierAccuracy: number;   // 0.0 - 1.0
  routeAvailabilityRate: number; // 0.0 - 1.0
  destinationSafetyAgreementRate: number; // 0.0 - 1.0
  precision: Record<string, number>;
  recall: Record<string, number>;
  f1: Record<string, number>;
  confusionMatrix: Record<string, Record<string, number>>;
  sensitivityPassed: boolean;
  edgeCasesPassed: boolean;
  detailedResults: Array<{
    caseId: string;
    locationName: string;
    predictedHazard: string;
    expectedHazards: string[];
    hazardMatched: boolean;
    predictedTier: string;
    expectedTiers: string[];
    tierMatched: boolean;
    routeStatus: string;
    destinationSafety: string;
  }>;
}

export async function runDecisionValidationHarness(): Promise<ValidationMetrics> {
  let hazardMatchCount = 0;
  let tierMatchCount = 0;
  let routeAvailableCount = 0;
  let destinationSafetyCount = 0;

  const confusionMatrix: Record<string, Record<string, number>> = {
    RED: { RED: 0, ORANGE: 0, GREEN: 0, UNKNOWN: 0 },
    ORANGE: { RED: 0, ORANGE: 0, GREEN: 0, UNKNOWN: 0 },
    GREEN: { RED: 0, ORANGE: 0, GREEN: 0, UNKNOWN: 0 },
  };

  const detailedResults: ValidationMetrics["detailedResults"] = [];

  for (const c of AUTHORITATIVE_VALIDATION_CASES) {
    const loc = {
      id: c.id.toLowerCase(),
      name: c.name,
      displayName: `${c.name}, India`,
      category: "City" as const,
      latitude: c.latitude,
      longitude: c.longitude,
      population: 250_000,
      populationSource: "Census 2011",
      boundingBox: null,
      boundary: null,
      address: { state: c.stateCode, city: c.name, district: c.name },
      source: "Validation Harness",
    };

    const hazardProfile = buildMultiHazardProfile({
      locationName: c.name,
      latitude: c.latitude,
      longitude: c.longitude,
      stateCode: c.stateCode,
      district: c.name,
      slopeDegrees: c.slopeDegrees,
      elevationMeters: c.elevationMeters,
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

    const predHazard = decision.hazardAssessment.primaryHazard;
    const predTier = decision.hazardAssessment.tier;

    const hazardMatched = c.expectedPrimaryHazard.includes(predHazard);
    const tierMatched = c.expectedTiers.includes(predTier);

    if (hazardMatched) hazardMatchCount++;
    if (tierMatched) tierMatchCount++;
    if (decision.routingAssessment.status === "ROAD_ROUTE_VERIFIED" || decision.routingAssessment.isRoadRoute) {
      routeAvailableCount++;
    }
    if (decision.relocationAssessment.destinationSafety.destinationSafetyStatus === "SAFE" || decision.relocationAssessment.destinationSafety.destinationSafetyStatus === "CONDITIONAL") {
      destinationSafetyCount++;
    }

    const expectedPrimaryTier = c.expectedTiers[0];
    if (confusionMatrix[expectedPrimaryTier] && confusionMatrix[expectedPrimaryTier][predTier] !== undefined) {
      confusionMatrix[expectedPrimaryTier][predTier]++;
    }

    detailedResults.push({
      caseId: c.id,
      locationName: c.name,
      predictedHazard: predHazard,
      expectedHazards: c.expectedPrimaryHazard,
      hazardMatched,
      predictedTier: predTier,
      expectedTiers: c.expectedTiers,
      tierMatched,
      routeStatus: decision.routingAssessment.status,
      destinationSafety: decision.relocationAssessment.destinationSafety.destinationSafetyStatus,
    });
  }

  const total = AUTHORITATIVE_VALIDATION_CASES.length;
  const hazardAccuracy = Number((hazardMatchCount / total).toFixed(2));
  const tierAccuracy = Number((tierMatchCount / total).toFixed(2));
  const routeAvailabilityRate = Number((routeAvailableCount / total).toFixed(2));
  const destinationSafetyAgreementRate = Number((destinationSafetyCount / total).toFixed(2));

  // Compute Precision, Recall, F1 for RED tier
  const redTP = confusionMatrix["RED"]["RED"] || 0;
  const redFP = (confusionMatrix["ORANGE"]["RED"] || 0) + (confusionMatrix["GREEN"]["RED"] || 0);
  const redFN = (confusionMatrix["RED"]["ORANGE"] || 0) + (confusionMatrix["RED"]["GREEN"] || 0);

  const redPrecision = redTP + redFP > 0 ? Number((redTP / (redTP + redFP)).toFixed(2)) : 1.0;
  const redRecall = redTP + redFN > 0 ? Number((redTP / (redTP + redFN)).toFixed(2)) : 1.0;
  const redF1 = redPrecision + redRecall > 0 ? Number(((2 * redPrecision * redRecall) / (redPrecision + redRecall)).toFixed(2)) : 1.0;

  // Run Sensitivity Tests
  const sensitivityPassed = await verifySensitivityProperties();

  // Run Edge-Case Tests
  const edgeCasesPassed = await verifyEdgeCaseProperties();

  return {
    totalEvaluated: total,
    hazardMatchCount,
    tierMatchCount,
    hazardAccuracy,
    tierAccuracy,
    routeAvailabilityRate,
    destinationSafetyAgreementRate,
    precision: { RED: redPrecision },
    recall: { RED: redRecall },
    f1: { RED: redF1 },
    confusionMatrix,
    sensitivityPassed,
    edgeCasesPassed,
    detailedResults,
  };
}

async function verifySensitivityProperties(): Promise<boolean> {
  // Property 1: Increasing population increases population exposure contribution
  const locBase = {
    id: "sens-test",
    name: "Sensitivity Base",
    displayName: "Sensitivity Base, India",
    category: "City" as const,
    latitude: 27.47,
    longitude: 94.91,
    population: 5_000,
    populationSource: "Census 2011",
    boundingBox: null,
    boundary: null,
    address: { state: "Assam" },
    source: "Test",
  };

  const hp = buildMultiHazardProfile({ latitude: 27.47, longitude: 94.91, stateCode: "AS" });
  const ec = { availableCount: 7, totalCount: 8, coverageRatio: 0.88, label: "7/8", categories: [] };

  const dec1 = await computeCanonicalDecision({ location: locBase, hazardProfile: hp, evidenceCoverage: ec });
  const dec2 = await computeCanonicalDecision({
    location: { ...locBase, population: 250_000 },
    hazardProfile: hp,
    evidenceCoverage: ec,
  });

  const p1 = dec1.responsePriority.components.populationExposure.contribution;
  const p2 = dec2.responsePriority.components.populationExposure.contribution;
  if (p2 < p1) return false;

  return true;
}

async function verifyEdgeCaseProperties(): Promise<boolean> {
  // Edge Case: Null population must not become zero or cause unhandled exceptions
  const locNullPop = {
    id: "edge-null-pop",
    name: "Edge Location",
    displayName: "Edge Location, India",
    category: "Place" as const,
    latitude: 20.0,
    longitude: 80.0,
    population: null,
    populationSource: "Unavailable",
    boundingBox: null,
    boundary: null,
    address: { state: "Maharashtra" },
    source: "Edge Test",
  };

  const hp = buildMultiHazardProfile({ latitude: 20.0, longitude: 80.0, stateCode: "MH" });
  const ec = { availableCount: 5, totalCount: 8, coverageRatio: 0.62, label: "5/8", categories: [] };

  const dec = await computeCanonicalDecision({ location: locNullPop, hazardProfile: hp, evidenceCoverage: ec });

  // Invariant 1: populationValue remains null, never 0
  if (dec.exposureAssessment.populationValue !== null) return false;

  // Invariant 2: confidence level is computed
  if (!dec.confidence.level) return false;

  // Invariant 3: mapState has valid coordinates
  if (!dec.mapState.originMarker.coordinates || isNaN(dec.mapState.originMarker.coordinates[0])) return false;

  return true;
}
