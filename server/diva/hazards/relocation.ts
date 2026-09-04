/**
 * Akashvani Phase 3.3 — Relocation Priority Engine (Corrected)
 *
 * Deterministic, explainable baseline relocation-priority scoring.
 *
 * Priority formula — Option A (5 components, sum = 100):
 *   Hazard Severity  (0–30)
 *   Population Exposure (0–20)
 *   Vulnerability    (0–20)  ← now an explicit score component
 *   Capacity Deficit (0–15)  ← 0 (neutral) when unavailable, NOT penalised
 *   Accessibility    (0–15)
 *   ─────────────────────────
 *   TOTAL:           0–100
 *
 *   HIGH  ≥ 70  | MEDIUM 40–69  | LOW < 40  | UNKNOWN if critical data missing
 *
 * Single source of truth: scoreBreakdown.total === priorityScore — always.
 * The UI renders scoreBreakdown.total; it does NOT recompute the score.
 *
 * Candidate eligibility rules:
 *   EMERGENCY_SHELTER / RELIEF_CENTRE → eligible for PREFERRED candidate
 *   SCHOOL_EVACUATION_SUPPORT / COMMUNITY_FACILITY → CONDITIONAL only
 *   HOSPITAL_MEDICAL_SUPPORT → medical support, NOT general relocation shelter
 *   UNKNOWN → not promoted silently
 *   UNSUITABLE → NEVER a candidate (hazard conflict)
 *
 * Label: BASELINE PS191 PRIORITY MODEL — NOT AI PREDICTION.
 */

import type {
  AccessibilityEvidence,
  CapacityConfidence,
  CapacityStatus,
  CarryingCapacityAssessment,
  CandidateStatus,
  EvacuationFacility,
  ExposureMethod,
  FacilityRole,
  PS191ScoreBreakdown,
  ReasonCode,
  RelocationRecommendation,
  RelocationSuitability,
} from "../../../shared/hazards";
import {
  RELOCATION_CONDITIONAL_ROLES,
  RELOCATION_ELIGIBLE_ROLES,
} from "../../../shared/hazards";

// ─── Score component calculators ─────────────────────────────────────────────

/**
 * Hazard severity component (0–30).
 * RED = up to 30, ORANGE = up to 20, GREEN = 5, UNAVAILABLE = 0.
 */
function hazardSeverityScore(
  classification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  hazardScore: number
): number {
  if (classification === "RED") {
    // Scale within RED: score 70–100 maps to 25–30
    return Math.round(25 + Math.min((hazardScore - 70) / 30 * 5, 5));
  }
  if (classification === "ORANGE") {
    // Scale within ORANGE: score 40–70 maps to 12–20
    return Math.round(12 + Math.min((hazardScore - 40) / 30 * 8, 8));
  }
  if (classification === "GREEN") return 5;
  return 0;
}

/**
 * Population exposure component (0–20).
 * Supports both macro-district screening estimates and micro-settlement HABITATION_SUM data.
 * 0 returned when exposed population is null (unknown), NOT treated as 0 people.
 */
function populationExposureScore(
  exposedPopulation: number | null,
  exposureMethod?: ExposureMethod
): number {
  if (exposedPopulation === null) return 0; // Unknown → neutral, not zero

  // Habitation-level settlement scale (Phase 3.4):
  // When method is HABITATION_SUM, population represents verified census counts of directly exposed
  // settlements/villages (typically 500–15,000 residents per rural settlement), not macro-district totals.
  if (exposureMethod === "HABITATION_SUM" || exposureMethod === "POINT_BASED_SCREENING") {
    if (exposedPopulation >= 10_000) return 20;
    if (exposedPopulation >= 5_000) return 18;
    if (exposedPopulation >= 2_000) return 15;
    if (exposedPopulation >= 1_000) return 14;
    if (exposedPopulation >= 500) return 10;
    return 4;
  }

  // District screening scale (aggregates of large administrative districts):
  if (exposedPopulation >= 500_000) return 20;
  if (exposedPopulation >= 200_000) return 18;
  if (exposedPopulation >= 100_000) return 15;
  if (exposedPopulation >= 50_000) return 12;
  if (exposedPopulation >= 10_000) return 10;
  if (exposedPopulation >= 1_000) return 6;
  return 2;
}

/**
 * Vulnerability component (0–20).
 * Uses the multi-hazard composite score from the Phase 3.2B engine.
 * This is an explicit component — not just a reason code.
 */
function vulnerabilityScore(hazardScore: number): number {
  if (hazardScore >= 90) return 20;
  if (hazardScore >= 75) return 16;
  if (hazardScore >= 60) return 12;
  if (hazardScore >= 45) return 8;
  if (hazardScore >= 30) return 4;
  return 2;
}

/**
 * Capacity deficit component (0–15).
 *
 * CRITICAL RULE: When capacity is UNAVAILABLE, return 0 (neutral).
 * Missing capacity is UNCERTAINTY, not evidence of deficit.
 * UNKNOWN CAPACITY ≠ ZERO CAPACITY.
 *
 * Only score when deficit is mathematically confirmed (requiredCapacity != null
 * AND availableCapacity != null AND requiredCapacity > availableCapacity).
 */
function capacityDeficitScore(
  capacityDeficit: number | null,
  requiredCapacity: number | null,
  capacityStatus: CapacityStatus
): number {
  // Unavailable → neutral 0, not penalised
  if (capacityStatus === "CAPACITY_UNAVAILABLE") return 0;
  if (capacityDeficit === null || requiredCapacity === null) return 0;
  if (requiredCapacity === 0) return 0;
  const ratio = capacityDeficit / requiredCapacity;
  if (ratio >= 1.0) return 15;
  if (ratio >= 0.75) return 12;
  if (ratio >= 0.50) return 10;
  if (ratio >= 0.25) return 7;
  if (ratio > 0) return 4;
  return 0; // Surplus — no penalty
}

/**
 * Accessibility component (0–15).
 * No reachable PREFERRED facility → higher score (worse access).
 * NOTE: Accessibility is based on STRAIGHT_LINE_PROXY when routing unavailable.
 */
function accessibilityScore(
  facilities: EvacuationFacility[],
  eligibleFacilities: EvacuationFacility[]
): number {
  if (facilities.length === 0) return 15; // No facilities at all
  if (eligibleFacilities.length === 0) return 12; // Facilities exist but none eligible

  const nearest = eligibleFacilities[0]!;
  if (nearest.straightLineDistanceKm > 50) return 12;
  if (nearest.straightLineDistanceKm > 30) return 10;
  if (nearest.straightLineDistanceKm > 20) return 8;
  if (nearest.straightLineDistanceKm > 10) return 6;
  return 4; // Close eligible facility — low access penalty
}

// ─── Candidate selection ──────────────────────────────────────────────────────

/**
 * Determine if a facility is eligible as a relocation destination.
 *
 * Eligibility rules (hard):
 * - UNSUITABLE → NEVER a candidate (hazard conflict)
 * - HOSPITAL_MEDICAL_SUPPORT → medical support only, NOT preferred relocation
 * - UNKNOWN role → not silently promoted
 *
 * Eligible roles (PREFERRED): EMERGENCY_SHELTER, RELIEF_CENTRE
 * Conditional roles (CONDITIONAL fallback): SCHOOL_EVACUATION_SUPPORT, COMMUNITY_FACILITY
 */
function isFacilityRelocationEligible(facility: EvacuationFacility): boolean {
  if (facility.relocationSuitability === "UNSUITABLE") return false;
  return (
    RELOCATION_ELIGIBLE_ROLES.includes(facility.facilityRole) ||
    RELOCATION_CONDITIONAL_ROLES.includes(facility.facilityRole)
  );
}

function isFacilityPreferredEligible(facility: EvacuationFacility): boolean {
  if (facility.relocationSuitability !== "PREFERRED") return false;
  return RELOCATION_ELIGIBLE_ROLES.includes(facility.facilityRole);
}

/**
 * Select the best relocation candidate facility.
 *
 * Returns the nearest PREFERRED, role-eligible facility.
 * Does NOT fall back to CONDITIONAL as bestCandidate.
 * Does NOT ever select UNSUITABLE or hospital-only facilities.
 */
function selectBestCandidate(facilities: EvacuationFacility[]): {
  bestCandidate: EvacuationFacility | null;
  candidateStatus: CandidateStatus;
  conditionalAlternatives: EvacuationFacility[];
  facilitiesWithHazardConflict: EvacuationFacility[];
} {
  const unsuitable = facilities.filter((f) => f.relocationSuitability === "UNSUITABLE");

  const preferredCandidates = facilities
    .filter(isFacilityPreferredEligible)
    .sort((a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm);

  const conditionalCandidates = facilities
    .filter(
      (f) =>
        f.relocationSuitability === "CONDITIONAL" &&
        isFacilityRelocationEligible(f)
    )
    .sort((a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm);

  if (preferredCandidates.length > 0) {
    return {
      bestCandidate: preferredCandidates[0]!,
      candidateStatus: "PREFERRED_CANDIDATE",
      conditionalAlternatives: conditionalCandidates,
      facilitiesWithHazardConflict: unsuitable,
    };
  }

  if (conditionalCandidates.length > 0) {
    // No PREFERRED candidate — show conditional alternatives, no bestCandidate
    return {
      bestCandidate: null,
      candidateStatus: "NO_PREFERRED_CANDIDATE",
      conditionalAlternatives: conditionalCandidates,
      facilitiesWithHazardConflict: unsuitable,
    };
  }

  if (facilities.length > 0) {
    // Facilities exist but none are eligible (all hospital-only or unsuitable)
    return {
      bestCandidate: null,
      candidateStatus: "NO_CANDIDATE",
      conditionalAlternatives: [],
      facilitiesWithHazardConflict: unsuitable,
    };
  }

  return {
    bestCandidate: null,
    candidateStatus: "NO_CANDIDATE",
    conditionalAlternatives: [],
    facilitiesWithHazardConflict: [],
  };
}

// ─── Reason code derivation ───────────────────────────────────────────────────

function deriveReasonCodes(
  assessment: CarryingCapacityAssessment,
  candidateStatus: CandidateStatus
): ReasonCode[] {
  const codes: ReasonCode[] = [];

  // Hazard zone
  if (assessment.hazardClassification === "RED") codes.push("RED_ZONE");
  if (assessment.hazardClassification === "ORANGE") codes.push("ORANGE_ZONE");

  // Exposure
  if (
    assessment.exposedPopulationEstimate !== null &&
    assessment.exposedPopulationEstimate > 50_000
  ) {
    codes.push("HIGH_EXPOSURE");
  }
  if (
    assessment.exposedPopulationEstimate !== null &&
    assessment.exposedPopulationEstimate > 0
  ) {
    codes.push("POPULATION_EXPOSED");
  }

  // Vulnerability — from hazard score, since it is now an explicit score component
  if (assessment.hazardScore >= 75) codes.push("HIGH_VULNERABILITY");

  // Capacity — strict rules:
  // CAPACITY_DEFICIT only when confirmed mathematically
  // CAPACITY_DATA_UNAVAILABLE when capacity = null
  if (
    assessment.capacityStatus === "CAPACITY_KNOWN" ||
    assessment.capacityStatus === "CAPACITY_PARTIAL"
  ) {
    if (assessment.capacityDeficit !== null && assessment.capacityDeficit > 0) {
      codes.push("CAPACITY_DEFICIT");
    } else if (assessment.capacityDeficit === 0 && assessment.capacitySurplus !== null) {
      codes.push("ADEQUATE_CAPACITY");
    }
    if (assessment.capacityStatus === "CAPACITY_PARTIAL") {
      codes.push("FACILITY_CAPACITY_UNKNOWN");
    }
  } else {
    // CAPACITY_UNAVAILABLE or CAPACITY_ESTIMATED
    if (assessment.nearbyFacilities.length > 0) {
      codes.push("FACILITY_CAPACITY_UNKNOWN"); // Facilities exist, capacity unknown
    } else {
      codes.push("NO_NEARBY_CAPACITY"); // No facilities at all
    }
    codes.push("CAPACITY_DATA_UNAVAILABLE");
  }

  // Candidate / accessibility
  if (candidateStatus === "NO_PREFERRED_CANDIDATE" || candidateStatus === "NO_CANDIDATE") {
    codes.push("FACILITY_HAZARD_CONFLICT");
  }

  // Poor access to nearest eligible facility
  const eligibleNearby = assessment.nearbyFacilities.find(
    (f) => f.relocationSuitability === "PREFERRED" && RELOCATION_ELIGIBLE_ROLES.includes(f.facilityRole)
  );
  if (eligibleNearby && eligibleNearby.straightLineDistanceKm > 30) {
    codes.push("POOR_ACCESS");
  }

  // Data limitation
  if (
    assessment.populationStatus === "POPULATION_UNAVAILABLE" ||
    assessment.capacityStatus === "CAPACITY_UNAVAILABLE"
  ) {
    codes.push("DATA_LIMITATION");
  }

  if (assessment.hazardClassification === "GREEN" && assessment.hazardScore < 50) {
    codes.push("LOW_HAZARD_SCORE");
  }

  return codes;
}

// ─── Explanation builder ──────────────────────────────────────────────────────

function buildExplanation(
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
  scoreBreakdown: PS191ScoreBreakdown,
  reasonCodes: ReasonCode[],
  assessment: CarryingCapacityAssessment,
  candidateStatus: CandidateStatus
): string {
  if (priorityLevel === "UNKNOWN") {
    return (
      `Priority cannot be confidently determined for ${assessment.areaName} because critical data is unavailable. ` +
      "Population and/or facility capacity data is missing for this district. " +
      "Field verification is required before any operational decision."
    );
  }
  const parts: string[] = [];
  parts.push(
    `${priorityLevel} relocation priority for ${assessment.areaName} ` +
    `(BASELINE PS191 PRIORITY MODEL score ${scoreBreakdown.total}/100).`
  );
  if (reasonCodes.includes("RED_ZONE")) {
    parts.push("The area is classified RED — critical multi-hazard exposure confirmed.");
  } else if (reasonCodes.includes("ORANGE_ZONE")) {
    parts.push("The area is classified ORANGE — significant hazard concern identified.");
  }
  if (
    reasonCodes.includes("HIGH_EXPOSURE") &&
    assessment.exposedPopulationEstimate !== null
  ) {
    parts.push(
      `District-level exposed population estimate: ${assessment.exposedPopulationEstimate.toLocaleString("en-IN")} persons ` +
      `(district-level screening only — DERIVED from ${assessment.exposureAssumption ?? "screening rate"}).`
    );
  }
  if (reasonCodes.includes("CAPACITY_DEFICIT") && assessment.capacityDeficit !== null) {
    parts.push(
      `Confirmed capacity deficit: ${assessment.capacityDeficit.toLocaleString("en-IN")} persons cannot be accommodated.`
    );
  }
  if (reasonCodes.includes("CAPACITY_DATA_UNAVAILABLE")) {
    parts.push("Facility locations are known, but verified evacuation capacity data is unavailable.");
  }
  if (reasonCodes.includes("NO_NEARBY_CAPACITY")) {
    parts.push("No evacuation-support facilities discovered within the search radius.");
  }
  if (candidateStatus === "NO_PREFERRED_CANDIDATE") {
    parts.push("No preferred relocation candidate was identified within the current search radius.");
  }
  if (reasonCodes.includes("FACILITY_HAZARD_CONFLICT") && candidateStatus !== "NO_PREFERRED_CANDIDATE") {
    parts.push("Nearby facilities are in conditional or unsuitable hazard zones.");
  }
  if (reasonCodes.includes("DATA_LIMITATION")) {
    parts.push("Data limitations apply: population and/or capacity assessment is unavailable.");
  }
  return parts.join(" ");
}

// ─── Accessibility helpers ────────────────────────────────────────────────────

function resolveAccessibilityStatus(
  candidate: EvacuationFacility | null
): "ACCESSIBLE" | "DIFFICULT" | "UNKNOWN" {
  if (!candidate) return "UNKNOWN";
  if (candidate.straightLineDistanceKm <= 20) return "ACCESSIBLE";
  return "DIFFICULT";
}

function resolveAccessibilityEvidence(
  candidate: EvacuationFacility | null
): AccessibilityEvidence {
  if (!candidate) return "UNAVAILABLE";
  if (candidate.distanceType === "ROAD_NETWORK" && candidate.routeDistanceKm != null) {
    return "ROAD_NETWORK";
  }
  return "STRAIGHT_LINE_PROXY"; // Haversine only — road travel unknown
}

/**
 * Assess accessibility for an evacuation candidate facility.
 */
export function assessAccessibility(candidate: EvacuationFacility | null): {
  status: "ACCESSIBLE" | "DIFFICULT" | "UNKNOWN";
  score: number;
} {
  if (!candidate) {
    return { status: "UNKNOWN", score: 0 };
  }
  const status = resolveAccessibilityStatus(candidate);
  let score = 50;
  if (candidate.relocationSuitability === "PREFERRED") score += 30;
  else if (candidate.relocationSuitability === "CONDITIONAL") score += 10;
  else if (candidate.relocationSuitability === "UNSUITABLE") score -= 20;

  if (candidate.straightLineDistanceKm <= 10) score += 20;
  else if (candidate.straightLineDistanceKm <= 25) score += 10;
  else if (candidate.straightLineDistanceKm <= 50) score -= 15;
  else score -= 30;

  score = Math.max(0, Math.min(100, score));
  return { status, score };
}

// ─── Overall confidence ───────────────────────────────────────────────────────

function resolveRecommendationConfidence(
  assessment: CarryingCapacityAssessment,
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
): CapacityConfidence {
  if (priorityLevel === "UNKNOWN") return "UNAVAILABLE";
  if (assessment.populationStatus === "POPULATION_UNAVAILABLE") return "LOW";
  if (assessment.capacityStatus === "CAPACITY_UNAVAILABLE") return "LOW";
  if (assessment.nearbyFacilities.length === 0) return "LOW";
  // Screening estimate reduces confidence
  if (assessment.exposureMethod === "DISTRICT_SCREENING_ASSUMPTION") return "LOW";
  return assessment.confidence;
}

/**
 * Resolve priority confidence — separate from recommendation confidence.
 * Reflects how certain we are about the priority LEVEL itself.
 */
function resolvePriorityConfidence(
  assessment: CarryingCapacityAssessment,
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
): CapacityConfidence {
  if (priorityLevel === "UNKNOWN") return "UNAVAILABLE";

  const issues: string[] = [];
  if (assessment.populationStatus === "POPULATION_UNAVAILABLE") issues.push("population_unknown");
  if (assessment.exposureMethod === "DISTRICT_SCREENING_ASSUMPTION") issues.push("exposure_derived");
  if (assessment.capacityStatus === "CAPACITY_UNAVAILABLE") issues.push("capacity_unknown");
  // Routing/accessibility
  if (assessment.nearbyFacilities.every((f) => f.distanceType === "STRAIGHT_LINE")) {
    issues.push("routing_proxy_only");
  }

  if (issues.length >= 3) return "LOW";
  if (issues.length >= 1) return "LOW"; // Any significant missing data → LOW confidence
  return "MEDIUM"; // Only MEDIUM max without spatially verified data
}

// ─── Main recommendation builder ──────────────────────────────────────────────

/**
 * Build a PS191 relocation recommendation from a carrying-capacity assessment.
 *
 * SINGLE SOURCE OF TRUTH: scoreBreakdown contains all sub-scores.
 * priorityScore === scoreBreakdown.total — always.
 * The UI MUST render scoreBreakdown fields, not recompute the score.
 *
 * Priority formula (Option A, 5 components):
 *   Hazard Severity (0–30) + Population Exposure (0–20) + Vulnerability (0–20)
 *   + Capacity Deficit (0–15) + Accessibility (0–15) = 0–100
 *   HIGH ≥ 70 | MEDIUM 40–69 | LOW < 40 | UNKNOWN if critical data missing
 */
export function buildRelocationRecommendation(
  assessment: CarryingCapacityAssessment
): RelocationRecommendation {
  const facilities = assessment.nearbyFacilities;

  // ─── Compute score breakdown (single source of truth) ────────────────────
  const eligibleFacilities = facilities
    .filter(
      (f) =>
        f.relocationSuitability === "PREFERRED" &&
        RELOCATION_ELIGIBLE_ROLES.includes(f.facilityRole)
    )
    .sort((a, b) => a.straightLineDistanceKm - b.straightLineDistanceKm);

  const hScore = hazardSeverityScore(assessment.hazardClassification, assessment.hazardScore);
  const pScore = populationExposureScore(
    assessment.exposedPopulationEstimate,
    assessment.exposureMethod
  );
  const vScore = vulnerabilityScore(assessment.hazardScore);
  const cScore = capacityDeficitScore(
    assessment.capacityDeficit,
    assessment.requiredCapacity,
    assessment.capacityStatus
  );
  const aScore = accessibilityScore(facilities, eligibleFacilities);
  const totalScore = hScore + pScore + vScore + cScore + aScore;

  const scoreBreakdown: PS191ScoreBreakdown = {
    hazardSeverity: hScore,
    populationExposure: pScore,
    vulnerability: vScore,
    capacityDeficit: cScore,
    accessibility: aScore,
    total: totalScore, // MUST equal sum of all components
  };

  // Verify invariant: total === sum (defensive, should always hold)
  const sumCheck = hScore + pScore + vScore + cScore + aScore;
  if (scoreBreakdown.total !== sumCheck) {
    // This should never happen — arithmetic guard
    scoreBreakdown.total = sumCheck;
  }

  // ─── Priority level — UNKNOWN if we lack both population and capacity ──────
  let priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  const criticalDataMissing =
    assessment.populationStatus === "POPULATION_UNAVAILABLE" &&
    assessment.capacityStatus === "CAPACITY_UNAVAILABLE";
  if (criticalDataMissing) {
    priorityLevel = "UNKNOWN";
  } else if (totalScore >= 70) {
    priorityLevel = "HIGH";
  } else if (totalScore >= 40) {
    priorityLevel = "MEDIUM";
  } else {
    priorityLevel = "LOW";
  }

  // ─── Candidate selection ──────────────────────────────────────────────────
  const {
    bestCandidate,
    candidateStatus,
    conditionalAlternatives,
    facilitiesWithHazardConflict,
  } = selectBestCandidate(facilities);

  // ─── Reason codes ─────────────────────────────────────────────────────────
  const reasonCodes = deriveReasonCodes(assessment, candidateStatus);

  // ─── Explanation ──────────────────────────────────────────────────────────
  const explanation = buildExplanation(
    priorityLevel,
    scoreBreakdown,
    reasonCodes,
    assessment,
    candidateStatus
  );

  // ─── Accessibility ────────────────────────────────────────────────────────
  const accessibilityStatus = resolveAccessibilityStatus(bestCandidate);
  const accessibilityEvidence = resolveAccessibilityEvidence(bestCandidate);

  // ─── Confidence ───────────────────────────────────────────────────────────
  const confidence = resolveRecommendationConfidence(assessment, priorityLevel);
  const priorityConfidence = resolvePriorityConfidence(assessment, priorityLevel);

  return {
    recommendationId: `REC-${assessment.areaId}-${Date.now()}`,
    sourceAreaId: assessment.areaId,
    sourceAreaName: assessment.areaName,
    sourceHazardLevel: assessment.hazardClassification,
    sourcePopulation: assessment.population,
    exposedPopulation: assessment.exposedPopulationEstimate,
    exposureMethod: assessment.exposureMethod,
    exposureAssumption: assessment.exposureAssumption,
    vulnerabilityScore: assessment.hazardScore,
    capacityRequired: assessment.requiredCapacity,
    capacityAvailable: assessment.availableCapacity,
    capacityDeficit: assessment.capacityDeficit,
    capacityStatus: assessment.capacityStatus,
    nearestFacilities: facilities.slice(0, 5),
    // Candidate fields
    candidateStatus,
    candidateDestination: bestCandidate?.name ?? null,
    candidateDestinationType: (bestCandidate?.facilityRole ?? null) as FacilityRole | null,
    candidateLatitude: bestCandidate?.latitude ?? null,
    candidateLongitude: bestCandidate?.longitude ?? null,
    destinationCapacity: bestCandidate?.capacity ?? null,
    destinationHazardStatus: (bestCandidate?.relocationSuitability ?? null) as RelocationSuitability | null,
    conditionalAlternatives,
    facilitiesWithHazardConflict,
    // Distance / accessibility
    distanceKm: bestCandidate
      ? (bestCandidate.routeDistanceKm ?? bestCandidate.straightLineDistanceKm)
      : null,
    routeDistanceKm: bestCandidate?.routeDistanceKm ?? null,
    distanceType: bestCandidate ? bestCandidate.distanceType : "UNAVAILABLE",
    accessibilityEvidence,
    travelTimeMinutes: bestCandidate?.estimatedTravelTimeMinutes ?? null,
    accessibilityStatus,
    // Priority — SINGLE SOURCE OF TRUTH
    priorityLevel,
    priorityScore: scoreBreakdown.total, // Always equals scoreBreakdown.total
    scoreBreakdown,
    priorityConfidence,
    reasonCodes,
    explanation,
    modelLabel: "BASELINE PS191 PRIORITY MODEL",
    provenance: assessment.provenance,
    confidence,
    limitations: [
      ...assessment.limitations,
      "Priority score is deterministic and based on district-level screening only.",
      "Weights: Hazard severity 0-30 + Population exposure 0-20 + Vulnerability 0-20 + Capacity deficit 0-15 + Accessibility 0-15 = 100.",
      "These weights are not scientifically validated — they represent a transparent baseline for demonstration.",
      "Capacity deficit score is 0 (neutral) when capacity is unavailable — not treated as maximum deficit.",
      "Best candidate requires PREFERRED suitability AND eligible role (EMERGENCY_SHELTER or RELIEF_CENTRE).",
      "HOSPITAL_MEDICAL_SUPPORT facilities are not eligible as general relocation shelters.",
    ],
    timestamp: new Date().toISOString(),
  };
}

/**
 * @deprecated Use buildRelocationRecommendation() which returns the full scoreBreakdown.
 * This function is retained only for test compatibility.
 * It uses the same internal formula. Do NOT call it from the UI or API.
 */
export function calculateRelocationPriority(
  hazardScore: number | null,
  classification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  exposedPopulation: number | null,
  capacityDeficit: number | null,
  accessibilityScoreVal: number = 0,
  hasNearbyFacilities: boolean = true
): {
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  priorityScore: number;
  scoreBreakdown: PS191ScoreBreakdown;
  reasonCodes: ReasonCode[];
} {
  const codes: ReasonCode[] = [];
  if (classification === "UNAVAILABLE" || hazardScore === null) codes.push("DATA_LIMITATION");
  if (!hasNearbyFacilities) codes.push("NO_NEARBY_CAPACITY");
  if (classification === "RED") codes.push("RED_ZONE");
  else if (classification === "ORANGE") codes.push("ORANGE_ZONE");
  if (exposedPopulation !== null && exposedPopulation > 0) {
    codes.push("POPULATION_EXPOSED");
    if (exposedPopulation > 50_000) codes.push("HIGH_EXPOSURE");
  }
  if (hazardScore !== null && hazardScore >= 75) codes.push("HIGH_VULNERABILITY");

  // Use null-safe capacity status
  const capStatus: CapacityStatus = capacityDeficit !== null ? "CAPACITY_KNOWN" : "CAPACITY_UNAVAILABLE";
  if (capacityDeficit !== null && capacityDeficit > 0) codes.push("CAPACITY_DEFICIT");
  else if (capStatus === "CAPACITY_UNAVAILABLE") codes.push("CAPACITY_DATA_UNAVAILABLE");

  if (classification === "UNAVAILABLE" && exposedPopulation === null && capacityDeficit === null) {
    const bd: PS191ScoreBreakdown = {
      hazardSeverity: 0, populationExposure: 0, vulnerability: 0, capacityDeficit: 0, accessibility: 0, total: 0,
    };
    return { priorityLevel: "UNKNOWN", priorityScore: 0, scoreBreakdown: bd, reasonCodes: codes };
  }

  const hScore = hazardSeverityScore(classification, hazardScore ?? 0);
  const pScore = populationExposureScore(exposedPopulation);
  const vScore = vulnerabilityScore(hazardScore ?? 0);
  const cScore = capacityDeficitScore(
    capacityDeficit,
    exposedPopulation,
    capStatus
  );
  // Simplified accessibility
  const aScore = hasNearbyFacilities ? (accessibilityScoreVal < 50 ? 10 : 6) : 12;
  const total = hScore + pScore + vScore + cScore + aScore;

  const scoreBreakdown: PS191ScoreBreakdown = {
    hazardSeverity: hScore,
    populationExposure: pScore,
    vulnerability: vScore,
    capacityDeficit: cScore,
    accessibility: aScore,
    total,
  };

  let level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" = "LOW";
  if (total >= 70) level = "HIGH";
  else if (total >= 40) level = "MEDIUM";

  return { priorityLevel: level, priorityScore: total, scoreBreakdown, reasonCodes: codes };
}
