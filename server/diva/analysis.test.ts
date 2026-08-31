import { describe, expect, it } from "vitest";
import { buildAssessmentAnalysis, getRankedAssessments } from "./analysis";
import { getDemoAreas } from "./fixtures";

describe("DIVA deterministic decision model", () => {
  it("returns transparent risk, capacity, and relocation outputs for a demo area", () => {
    const area = getDemoAreas()[0];
    const analysis = buildAssessmentAnalysis(area);

    expect(analysis.assessmentId).toBe(area.id);
    expect(analysis.overallRisk).toBeGreaterThanOrEqual(0);
    expect(analysis.overallRisk).toBeLessThanOrEqual(100);
    expect(analysis.carryingCapacityScore).toBeGreaterThanOrEqual(0);
    expect(analysis.carryingCapacityScore).toBeLessThanOrEqual(100);
    expect(analysis.riskFactors).toHaveLength(5);
    expect(analysis.capacityFactors).toHaveLength(4);
    expect(analysis.candidateSites[0]?.recommendation).toContain("Preferred");
    expect(analysis.methodologyVersion).toContain("deterministic");
    expect(analysis.dataStatus).toContain("KERALA REFERENCE CONTEXT");
  });

  it("ranks all scenario habitations by reproducible relocation score", () => {
    const ranked = getRankedAssessments(getDemoAreas());

    expect(ranked).toHaveLength(14);
    expect(ranked[0].analysis.relocationScore).toBeGreaterThanOrEqual(ranked[1].analysis.relocationScore);
    expect(ranked.every(({ area, analysis }) => area.id === analysis.assessmentId)).toBe(true);
  });
});
