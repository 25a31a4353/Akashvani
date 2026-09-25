import { describe, it, expect } from "vitest";
import { runDecisionValidationHarness, AUTHORITATIVE_VALIDATION_CASES } from "./decisionValidation";
import { computeCanonicalDecision } from "./pipeline";
import { buildMultiHazardProfile } from "../hazards/engine";

describe("ResQ Decision Intelligence Engine V2 — Validation Harness", () => {
  it("evaluates authoritative validation dataset and reports real empirical metrics", async () => {
    const metrics = await runDecisionValidationHarness();

    console.log("=== RESQ DECISION ENGINE V2 EMPIRICAL VALIDATION METRICS ===");
    console.log(`Total Cases: ${metrics.totalEvaluated}`);
    console.log(`Primary Hazard Accuracy: ${(metrics.hazardAccuracy * 100).toFixed(1)}% (${metrics.hazardMatchCount}/${metrics.totalEvaluated})`);
    console.log(`Risk Tier Accuracy: ${(metrics.tierAccuracy * 100).toFixed(1)}% (${metrics.tierMatchCount}/${metrics.totalEvaluated})`);
    console.log(`Route Availability Rate: ${(metrics.routeAvailabilityRate * 100).toFixed(1)}%`);
    console.log(`Destination Safety Agreement Rate: ${(metrics.destinationSafetyAgreementRate * 100).toFixed(1)}%`);
    console.log(`RED Tier Precision: ${metrics.precision.RED}, Recall: ${metrics.recall.RED}, F1: ${metrics.f1.RED}`);
    console.log(`Sensitivity Invariants: ${metrics.sensitivityPassed ? "PASSED" : "FAILED"}`);
    console.log(`Edge Case Invariants: ${metrics.edgeCasesPassed ? "PASSED" : "FAILED"}`);

    expect(metrics.totalEvaluated).toBe(AUTHORITATIVE_VALIDATION_CASES.length);
    expect(metrics.hazardAccuracy).toBeGreaterThanOrEqual(0.80);
    expect(metrics.tierAccuracy).toBeGreaterThanOrEqual(0.80);
    expect(metrics.routeAvailabilityRate).toBeGreaterThanOrEqual(0.50);
    expect(metrics.destinationSafetyAgreementRate).toBeGreaterThanOrEqual(0.50);
    expect(metrics.sensitivityPassed).toBe(true);
    expect(metrics.edgeCasesPassed).toBe(true);
  });

  it("guarantees deterministic canonical decision object and snapshot hash", async () => {
    const loc = {
      id: "test-dibrugarh",
      name: "Dibrugarh",
      displayName: "Dibrugarh, Assam, India",
      category: "City" as const,
      latitude: 27.4728,
      longitude: 94.912,
      population: 154000,
      populationSource: "Census 2011",
      boundingBox: null,
      boundary: null,
      address: { state: "Assam", district: "Dibrugarh" },
      source: "Test",
    };

    const hp = buildMultiHazardProfile({
      locationName: "Dibrugarh",
      latitude: 27.4728,
      longitude: 94.912,
      stateCode: "AS",
      district: "Dibrugarh",
    });

    const ec = {
      availableCount: 7,
      totalCount: 8,
      coverageRatio: 0.88,
      label: "7/8",
      categories: [],
    };

    const dec1 = await computeCanonicalDecision({ location: loc, hazardProfile: hp, evidenceCoverage: ec });
    const dec2 = await computeCanonicalDecision({ location: loc, hazardProfile: hp, evidenceCoverage: ec });

    // Invariant: Exact same snapshot hash
    expect(dec1.decisionSnapshotHash).toBe(dec2.decisionSnapshotHash);
    expect(dec1.hazardAssessment.tier).toBe(dec2.hazardAssessment.tier);
    expect(dec1.hazardAssessment.compositeHazardScore).toBe(dec2.hazardAssessment.compositeHazardScore);
    expect(dec1.responsePriority.priorityScore).toBe(dec2.responsePriority.priorityScore);
    expect(dec1.mapState.riskTier).toBe(dec1.hazardAssessment.tier);
  });

  it("enforces destination safety: unsafe destinations inside hazard zone are blocked", async () => {
    const loc = {
      id: "test-wayanad",
      name: "Wayanad",
      displayName: "Wayanad, Kerala, India",
      category: "District" as const,
      latitude: 11.6854,
      longitude: 76.132,
      population: 817420,
      populationSource: "Census 2011",
      boundingBox: null,
      boundary: null,
      address: { state: "Kerala", district: "Wayanad" },
      source: "Test",
    };

    const hp = buildMultiHazardProfile({
      locationName: "Wayanad",
      latitude: 11.6854,
      longitude: 76.132,
      stateCode: "KL",
      district: "Wayanad",
      slopeDegrees: 28,
    });

    const ec = {
      availableCount: 8,
      totalCount: 8,
      coverageRatio: 1.0,
      label: "8/8",
      categories: [],
    };

    const decision = await computeCanonicalDecision({ location: loc, hazardProfile: hp, evidenceCoverage: ec });

    expect(decision.relocationAssessment.destinationSafety).toBeDefined();
    // Safety check must not be UNKNOWN if facilities were found
    if (decision.relocationAssessment.bestCandidate) {
      expect(decision.relocationAssessment.destinationSafety.destinationSafetyStatus).toMatch(/SAFE|CONDITIONAL/);
      expect(decision.relocationAssessment.destinationSafety.destinationInsideHazard).toBe(false);
    }
  });
});
