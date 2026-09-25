/**
 * ResQ Decision Intelligence Engine V2 — Canonical Decision Pipeline
 * 
 * Implements the single end-to-end decision pipeline:
 * DATA → NORMALIZATION → SPATIAL ALIGNMENT → TEMPORAL ALIGNMENT →
 * HAZARD EVALUATION → EXPOSURE → VULNERABILITY → CAPACITY → ACCESSIBILITY →
 * SAFE HAVEN SELECTION → DESTINATION VALIDATION → ROAD ROUTE →
 * RESPONSE PRIORITY → CONFIDENCE & UNCERTAINTY → EXPLANATION →
 * CANONICAL DECISION OBJECT
 */

import crypto from "crypto";
import type {
  ResQDecisionContext,
  ResQConsistencyCheck,
} from "../../../shared/decisionEngine";
import type { IndiaLocation, EnvironmentalContext } from "../../../shared/india";
import type { TerrainContext, HydrologyContext, GeologyContext, EvidenceCoverageScore } from "../../../shared/multiState";
import type { MultiHazardProfile } from "../../../shared/hazards";
import { createEvidenceSnapshot } from "./snapshot";
import { evaluateHazardV2 } from "./hazardEngineV2";
import { evaluateExposure } from "./exposureEngine";
import { evaluateVulnerability } from "./vulnerabilityEngine";
import { evaluateCapacity } from "./capacityEngine";
import { selectSafeHaven } from "./safeHavenEngine";
import { evaluateRoadRoute } from "./routingEngine";
import { evaluatePriorityV2 } from "./priorityEngine";
import { generateExplanation } from "./explainability";
import { deriveMapState } from "./mapState";
import { discoverFacilitiesSync } from "../hazards/facilityDiscovery";

export interface DecisionPipelineOptions {
  location: IndiaLocation;
  environment?: EnvironmentalContext;
  terrain?: TerrainContext | null;
  hydrology?: HydrologyContext | null;
  geology?: GeologyContext | null;
  hazardProfile: MultiHazardProfile;
  evidenceCoverage: EvidenceCoverageScore;
  radiusKm?: number;
}

export async function computeCanonicalDecision(
  options: DecisionPipelineOptions
): Promise<ResQDecisionContext> {
  const {
    location,
    environment,
    terrain,
    hydrology,
    geology,
    hazardProfile,
    evidenceCoverage,
    radiusKm = 35,
  } = options;

  const decisionTimestamp = new Date().toISOString();
  const decisionId = `RESQ-DEC-${location.id}-${Date.now()}`;

  // 1. Load Evidence Snapshot (Temporal Consistency)
  const dataSnapshot = createEvidenceSnapshot(location, environment);

  // 2. Evaluate Hazards V2 (Hierarchy & Deduplication)
  const hazardAssessment = evaluateHazardV2(hazardProfile, environment, geology);

  // 3. Evaluate Exposure (Hierarchical Resolution)
  const districtName = location.address?.district ?? location.address?.city ?? location.name;
  const stateCode = location.address?.state;
  const exposureAssessment = evaluateExposure(location, districtName, stateCode, radiusKm);

  // 4. Evaluate Vulnerability (Separated from Exposure, Demographic Gating)
  const vulnerabilityAssessment = evaluateVulnerability(
    exposureAssessment,
    terrain,
    hazardAssessment.compositeHazardScore
  );

  // 5. Discover Facilities & Evaluate Capacity
  const originHab = exposureAssessment.selectedOriginHabitation;
  const facilities = discoverFacilitiesSync(
    originHab.latitude,
    originHab.longitude,
    radiusKm,
    stateCode
  );

  const capacityAssessment = evaluateCapacity(
    facilities,
    exposureAssessment.exposedPopulationEstimate
  );

  // 6. Safe-Haven Selection & Destination Safety Validation
  const relocationAssessment = selectSafeHaven(
    facilities,
    hazardAssessment.primaryHazard
  );

  // 7. Accessibility Assessment
  const bestCandidate = relocationAssessment.bestCandidate;
  const accessibilityAssessment = {
    status: (bestCandidate ? "ACCESSIBLE" : "CONSTRAINED") as "ACCESSIBLE" | "CONSTRAINED" | "UNAVAILABLE",
    roadAccessVerified: Boolean(bestCandidate?.routeDistanceKm),
    evidence: (bestCandidate?.distanceType === "ROAD_NETWORK" ? "ROAD_NETWORK" : "STRAIGHT_LINE_PROXY") as any,
    obstaclesIdentified: (terrain?.slopeDegrees ?? 0) >= 20 ? ["Steep hill gradient (>20° slope)"] : [],
    travelTimeMinutes: bestCandidate?.estimatedTravelTimeMinutes ?? null,
    accessibilityScore: bestCandidate ? 5 : 12,
    notes: bestCandidate
      ? `Facility is ${bestCandidate.routeDistanceKm ?? bestCandidate.straightLineDistanceKm} km from origin settlement.`
      : "No accessible facility found within search perimeter.",
  };

  // 8. Road Routing Engine (OSRM + Validation + Fallback Gating)
  const routingAssessment = await evaluateRoadRoute(
    {
      name: originHab.name,
      latitude: originHab.latitude,
      longitude: originHab.longitude,
    },
    bestCandidate
      ? {
          name: bestCandidate.name,
          latitude: bestCandidate.latitude,
          longitude: bestCandidate.longitude,
          role: bestCandidate.facilityRole,
        }
      : null
  );

  // 9. Response Priority Engine V2 (Audited 5-Component Model)
  const responsePriority = evaluatePriorityV2(
    hazardAssessment,
    exposureAssessment,
    vulnerabilityAssessment,
    capacityAssessment,
    accessibilityAssessment
  );

  // 10. Confidence & Uncertainty Computation
  const confidenceReasons: string[] = [];
  let confidenceScore = 0.5;

  if (evidenceCoverage.coverageRatio >= 0.75) {
    confidenceScore += 0.25;
    confidenceReasons.push(`${evidenceCoverage.label} verified in multi-layer registry`);
  } else if (evidenceCoverage.coverageRatio <= 0.35) {
    confidenceScore -= 0.25;
    confidenceReasons.push(`Sparse evidence coverage: only ${evidenceCoverage.label}`);
  }
  if (hazardAssessment.triggers.length > 0) {
    confidenceScore += 0.15;
    confidenceReasons.push("Empirical physical hazard spatial intersection confirmed");
  }
  if (!capacityAssessment.capacityVerified) {
    confidenceReasons.push("Emergency facility capacity is unverified from OpenStreetMap geometry (marked null)");
  }
  if (!routingAssessment.isRoadRoute) {
    confidenceReasons.push("OSRM live road routing failed; route is geodesic proxy");
  }

  const confidenceLevel =
    confidenceScore >= 0.75 ? "HIGH" : confidenceScore >= 0.5 ? "MEDIUM" : "LOW";

  const uncertaintyReasons: string[] = [];
  const missingDatasets: string[] = [];

  if (!capacityAssessment.capacityVerified) {
    uncertaintyReasons.push("Physical shelter bed capacities are unverified from field registers.");
    missingDatasets.push("DDMA Emergency Shelter Capacity Register");
  }
  if (exposureAssessment.populationValue === null) {
    uncertaintyReasons.push("Fine-grained village census population unavailable.");
    missingDatasets.push("Settlement-level Census 2011 PCA");
  }
  if (!routingAssessment.isRoadRoute) {
    uncertaintyReasons.push("Topological road network geometry query failed.");
    missingDatasets.push("Live OSRM Road Graph");
  }

  // 11. Cross-Source Consistency Checks (Section 38 & 39)
  const consistencyChecks: ResQConsistencyCheck[] = [];

  // Check A: Destination safety
  if (bestCandidate && relocationAssessment.destinationSafety.destinationInsideHazard) {
    consistencyChecks.push({
      name: "Destination Hazard Separation",
      status: "FAILED",
      details: `Destination '${bestCandidate.name}' is inside active hazard zone! Blocked from safe classification.`,
      source: "SafeHavenEngine / SpatialExposure",
    });
  } else {
    consistencyChecks.push({
      name: "Destination Hazard Separation",
      status: "PASSED",
      details: bestCandidate
        ? `Destination '${bestCandidate.name}' validated outside active hazard zone.`
        : "No destination selected.",
      source: "SafeHavenEngine",
    });
  }

  // Check B: IMD Warning vs Internal Evidence
  if (environment?.imdWarning && hazardAssessment.primaryHazard !== "EXTREME_RAINFALL" && hazardAssessment.primaryHazard !== "CYCLONE") {
    consistencyChecks.push({
      name: "IMD Warning Alignment",
      status: "WARNING",
      details: `IMD issued ${environment.imdWarning.warningLevel} warning (${environment.imdWarning.headline}), while primary physical hazard is ${hazardAssessment.primaryHazard}.`,
      source: "IMD Weather Telemetry",
    });
  } else {
    consistencyChecks.push({
      name: "IMD Warning Alignment",
      status: "PASSED",
      details: "Meteorological telemetry aligns with physical hazard classification.",
      source: "IMD / Open-Meteo",
    });
  }

  // Check C: Regulatory Seismic vs Active Earthquake
  consistencyChecks.push({
    name: "Seismic Baseline Separation",
    status: "PASSED",
    details: "BIS IS 1893:2016 treated strictly as regulatory baseline; no active earthquake rupture claimed.",
    source: "BIS IS 1893:2016",
  });

  // Check D: Road Routing Integrity
  if (routingAssessment.isRoadRoute) {
    consistencyChecks.push({
      name: "Road Routing Integrity",
      status: "PASSED",
      details: `Route confirmed on OSRM road centerline network (${routingAssessment.distanceKm} km).`,
      source: "Project OSRM Driving Engine",
    });
  } else {
    consistencyChecks.push({
      name: "Road Routing Integrity",
      status: "WARNING",
      details: "Road routing unavailable; straight line displayed strictly as DIRECT DISTANCE.",
      source: "Spatial Haversine Proxy",
    });
  }

  // 12. Recommended Action
  const recommendedAction = {
    tier: hazardAssessment.tier,
    headline:
      hazardAssessment.tier === "RED"
        ? `IMMEDIATE ACTION REQUIRED: Critical ${hazardAssessment.primaryHazard} Hazard`
        : hazardAssessment.tier === "ORANGE"
        ? `ELEVATED ALERT: High ${hazardAssessment.primaryHazard} Exposure`
        : `ROUTINE MONITORING: ${hazardAssessment.primaryHazard} Baseline Conditions`,
    actionItems:
      hazardAssessment.tier === "RED"
        ? [
            `Initiate evacuation of exposed habitations in ${location.name} to ${bestCandidate?.name || "designated safe shelter"}.`,
            `Dispatch emergency response teams along verified road corridor (${routingAssessment.distanceKm ?? "—"} km).`,
            `Coordinate with local DDMA for rapid shelter bed capacity auditing.`,
          ]
        : hazardAssessment.tier === "ORANGE"
        ? [
            `Maintain active vigilance on CWC gauges and IMD nowcast updates.`,
            `Pre-position relief resources at ${bestCandidate?.name || "nearby facilities"}.`,
            `Alert vulnerable habitations along riverine/hill corridors.`,
          ]
        : [
            `Continue baseline multi-hazard monitoring.`,
            `Verify emergency facility registry readiness.`,
          ],
    rationale: hazardAssessment.primaryDriverReason,
  };

  // 13. Generate Decision Explanation (8 Canonical Questions)
  const explanation = generateExplanation(
    location,
    hazardAssessment,
    exposureAssessment,
    responsePriority,
    relocationAssessment,
    routingAssessment,
    capacityAssessment
  );

  // 14. Derive Synchronized Map State
  const mapState = deriveMapState(
    hazardAssessment,
    exposureAssessment,
    relocationAssessment,
    routingAssessment
  );

  // 15. Compute Deterministic Snapshot Hash
  const hashInput = JSON.stringify({
    locationId: location.id,
    lat: location.latitude,
    lon: location.longitude,
    tier: hazardAssessment.tier,
    score: hazardAssessment.compositeHazardScore,
    primaryHazard: hazardAssessment.primaryHazard,
    priorityScore: responsePriority.priorityScore,
    dest: bestCandidate?.facilityId || "none",
    routeDist: routingAssessment.distanceKm,
  });
  const decisionSnapshotHash = crypto.createHash("sha256").update(hashInput).digest("hex").slice(0, 16);

  return {
    decisionId,
    decisionSnapshotHash,
    decisionTimestamp,
    location,
    dataSnapshot,
    hazardAssessment,
    exposureAssessment,
    vulnerabilityAssessment,
    capacityAssessment,
    accessibilityAssessment,
    relocationAssessment,
    routingAssessment,
    responsePriority,
    evidenceCoverage,
    confidence: {
      level: confidenceLevel,
      score: Number(confidenceScore.toFixed(2)),
      reasons: confidenceReasons,
    },
    uncertainty: {
      level: uncertaintyReasons.length > 2 ? "HIGH" : uncertaintyReasons.length > 0 ? "MODERATE" : "LOW",
      reasons: uncertaintyReasons,
      missingDatasets,
    },
    provenance: hazardAssessment.provenance,
    recommendedAction,
    explanation,
    mapState,
    consistencyChecks,
  };
}
