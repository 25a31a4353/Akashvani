import { describe, it, expect } from "vitest";
import { runV31ValidationReport } from "./v3ValidationHarness";
import { V3_ACCURACY_THRESHOLDS } from "./benchmarkRegistry";

describe("ResQ Decision Engine V3.1 Continuous Independent Validation & Audit", () => {
  it("meets all V3.1 accuracy thresholds across calibration, holdout, and adversarial sets", async () => {
    const report = await runV31ValidationReport();

    console.log("\n" + report.summary + "\n");

    console.log("--- Calibration Set Results ---");
    for (const r of report.calibrationMetrics.results) {
      console.log(`  ${r.id.padEnd(14)} | Tier: ${r.tierMatched ? "OK" : "FAIL"} (${r.engineTier}) | Hazard: ${r.hazardMatched ? "OK" : "FAIL"} (${r.engineHazard}) | Dest: ${r.destinationSafety} | Route: ${r.routeStatus}`);
    }

    console.log("\n--- Independent Holdout Set Results ---");
    for (const r of report.holdoutMetrics.results) {
      console.log(`  ${r.id.padEnd(14)} | Tier: ${r.tierMatched ? "OK" : "FAIL"} (${r.engineTier}) | Hazard: ${r.hazardMatched ? "OK" : "FAIL"} (${r.engineHazard}) | Dest: ${r.destinationSafety} | Route: ${r.routeStatus}`);
    }

    console.log("\n--- Adversarial Regression Test Results ---");
    for (const a of report.adversarialResults.tests) {
      console.log(`  [${a.category.padEnd(10)}] ${a.name.padEnd(45)}: ${a.passed ? "PASS" : "FAIL"} — ${a.details}`);
    }

    // Assertions for Calibration Set
    expect(report.calibrationMetrics.hazardAccuracy).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_HAZARD_ACCURACY);
    expect(report.calibrationMetrics.tierAccuracy).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_TIER_ACCURACY);
    expect(report.calibrationMetrics.tierMetrics.RED.recall).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_RED_RECALL);

    // Assertions for Independent Holdout Set
    expect(report.holdoutMetrics.hazardAccuracy).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_HAZARD_ACCURACY);
    expect(report.holdoutMetrics.tierAccuracy).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_TIER_ACCURACY);
    expect(report.holdoutMetrics.tierMetrics.RED.recall).toBeGreaterThanOrEqual(V3_ACCURACY_THRESHOLDS.MIN_RED_RECALL);

    // Assertions for Adversarial Tests & Invariants
    expect(report.adversarialResults.allPassed).toBe(true);
    expect(report.decisionConsistencyPassed).toBe(true);
    expect(report.integrityMetrics.integrityPassed).toBe(true);
  }, 45000);
});
