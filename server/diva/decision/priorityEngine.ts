/**
 * ResQ Decision Intelligence Engine V2 — Evacuation Priority Engine V2
 * 
 * Implements the audited, transparent 5-component priority model:
 * 1. Hazard Severity (0–30)
 * 2. Population Exposure (0–20)
 * 3. Vulnerability (0–20)
 * 4. Capacity Deficit (0–15)
 * 5. Accessibility (0–15)
 * Total Score = Sum of 5 components (0–100)
 * 
 * Priority Tiers:
 * - HIGH: Score ≥ 70
 * - MEDIUM: Score 40–69
 * - LOW: Score < 40
 * - UNKNOWN: Critical data missing (both population and capacity unavailable)
 */

import type {
  ResQResponsePriority,
  PriorityScoreComponent,
} from "../../../shared/decisionEngine";
import type { PS191ScoreBreakdown } from "../../../shared/hazards";
import type { ResQHazardAssessment } from "../../../shared/decisionEngine";
import type { ResQExposureAssessment } from "../../../shared/decisionEngine";
import type { ResQVulnerabilityAssessment } from "../../../shared/decisionEngine";
import type { ResQCapacityAssessment } from "../../../shared/decisionEngine";
import type { ResQAccessibilityAssessment } from "../../../shared/decisionEngine";

export function evaluatePriorityV2(
  hazard: ResQHazardAssessment,
  exposure: ResQExposureAssessment,
  vulnerability: ResQVulnerabilityAssessment,
  capacity: ResQCapacityAssessment,
  accessibility: ResQAccessibilityAssessment
): ResQResponsePriority {
  // ── 1. Hazard Severity Component (0–30) ───────────────────────────────────
  // Maps 0-100 hazard composite score to 0-30 contribution
  const hRaw = hazard.compositeHazardScore;
  const hNorm = Math.round((hRaw / 100) * 30);
  const hazardSeverity: PriorityScoreComponent = {
    rawValue: hRaw,
    normalizedValue: hNorm,
    maxWeight: 30,
    contribution: hNorm,
    source: hazard.provenance.sourceName,
    method: "Linear scaling of composite multi-hazard score (0-100 → 0-30)",
    uncertainty: hazard.limitations[0] || "Screening model baseline",
  };

  // ── 2. Population Exposure Component (0–20) ───────────────────────────────
  // Based on exposed population magnitude
  const pRaw = exposure.exposedPopulationEstimate;
  let pNorm = 0;
  if (pRaw !== null) {
    if (pRaw >= 100_000) pNorm = 20;
    else if (pRaw >= 25_000) pNorm = 16;
    else if (pRaw >= 5_000) pNorm = 12;
    else if (pRaw >= 1_000) pNorm = 8;
    else if (pRaw > 0) pNorm = 4;
    else pNorm = 0;
  } else if (exposure.exposedHabitationsCount > 0) {
    // Settlements identified but population unverified: conservative moderate score
    pNorm = 10;
  } else {
    pNorm = 0;
  }

  const populationExposure: PriorityScoreComponent = {
    rawValue: pRaw,
    normalizedValue: pNorm,
    maxWeight: 20,
    contribution: pNorm,
    source: exposure.populationSource,
    method: `Tiered exposure evaluation via ${exposure.exposureMethod}`,
    uncertainty: pRaw === null ? "Settlement-level Census counts unverified" : "Based on Census 2011 figures",
  };

  // ── 3. Vulnerability Component (0–20) ─────────────────────────────────────
  const vRaw = vulnerability.vulnerabilityScore;
  const vNorm = vRaw !== null ? Math.min(20, Math.max(0, vRaw)) : 10;
  const vulnerabilityComponent: PriorityScoreComponent = {
    rawValue: vRaw,
    normalizedValue: vNorm,
    maxWeight: 20,
    contribution: vNorm,
    source: "Terrain slope gradient & settlement isolation screening",
    method: "Physical relief & geographic isolation index",
    uncertainty: vulnerability.status === "UNKNOWN" ? "Demographic micro-vulnerability unverified" : "Physical screening baseline",
  };

  // ── 4. Capacity Deficit Component (0–15) ──────────────────────────────────
  // If capacity is unavailable, deficit is strictly 0 (neutral) to avoid penalising unknown data
  const cDeficit = capacity.capacityDeficit;
  let cNorm = 0;
  if (capacity.capacityVerified && capacity.requiredCapacity !== null && capacity.requiredCapacity > 0) {
    const deficitRatio = (cDeficit ?? 0) / capacity.requiredCapacity;
    cNorm = Math.round(Math.min(15, deficitRatio * 15));
  } else {
    cNorm = 0; // Neutral when unverified
  }

  const capacityDeficit: PriorityScoreComponent = {
    rawValue: cDeficit,
    normalizedValue: cNorm,
    maxWeight: 15,
    contribution: cNorm,
    source: capacity.capacitySource,
    method: capacity.capacityVerified ? "Ratio of verified shelter deficit to required capacity (0-15)" : "Zero-neutral: unverified capacity is not penalized",
    uncertainty: capacity.capacityVerified ? "Verified shelter records" : "Capacity unverified from OpenStreetMap geometry",
  };

  // ── 5. Accessibility Component (0–15) ─────────────────────────────────────
  // Higher score = poorer accessibility / greater evacuation challenge
  let aNorm = 5; // Default baseline
  if (accessibility.status === "CONSTRAINED") {
    aNorm = 12;
  } else if (accessibility.status === "ACCESSIBLE") {
    aNorm = 3;
  } else {
    aNorm = 8;
  }

  const accessibilityComponent: PriorityScoreComponent = {
    rawValue: accessibility.travelTimeMinutes,
    normalizedValue: aNorm,
    maxWeight: 15,
    contribution: aNorm,
    source: accessibility.evidence,
    method: "Road network travel time & terrain obstacle index (0-15)",
    uncertainty: accessibility.roadAccessVerified ? "OSRM road graph verified" : "Straight-line proxy baseline",
  };

  // ── Total Composite Priority Score ─────────────────────────────────────────
  const priorityScore = hNorm + pNorm + vNorm + cNorm + aNorm;

  const scoreBreakdown: PS191ScoreBreakdown = {
    hazardSeverity: hNorm,
    populationExposure: pNorm,
    vulnerability: vNorm,
    capacityDeficit: cNorm,
    accessibility: aNorm,
    total: priorityScore,
  };

  // Priority Level Classification
  let priorityLevel: ResQResponsePriority["priorityLevel"];
  const criticalDataMissing =
    exposure.populationValue === null && !capacity.capacityVerified;

  if (criticalDataMissing) {
    priorityLevel = "UNKNOWN";
  } else if (priorityScore >= 70 || hazard.tier === "RED") {
    priorityLevel = "HIGH";
  } else if (priorityScore >= 40 || hazard.tier === "ORANGE") {
    priorityLevel = "MEDIUM";
  } else {
    priorityLevel = "LOW";
  }

  const formulaExplanation = `Priority Score ${priorityScore}/100 = Hazard Severity (${hNorm}/30) + Population Exposure (${pNorm}/20) + Vulnerability (${vNorm}/20) + Capacity Deficit (${cNorm}/15) + Accessibility Constraint (${aNorm}/15). Classified as ${priorityLevel} priority.`;

  return {
    priorityLevel,
    priorityScore,
    components: {
      hazardSeverity,
      populationExposure,
      vulnerability: vulnerabilityComponent,
      capacityDeficit,
      accessibility: accessibilityComponent,
    },
    scoreBreakdown,
    criticalDataMissing,
    formulaExplanation,
  };
}
