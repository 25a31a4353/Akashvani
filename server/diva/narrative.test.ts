import { describe, expect, it } from "vitest";
import { NARRATIVE_SYSTEM_INSTRUCTION, deterministicNarrative } from "./narrative";
import type { AssessmentAnalysis, AssessmentArea } from "../../shared/diva";

const area = { id: "AUDIT-WAY", name: "Wayanad", district: "Wayanad", state: "Kerala, India", population: 817420 } as AssessmentArea;
const analysis = { overallRisk: 50, riskLevel: "Moderate", carryingCapacityScore: 57, capacityStatus: "Constrained", relocationPriority: "Low", recommendedAction: "Maintain risk monitoring.", riskFactors: [{ label: "Landslide exposure", score: 85, interpretation: "Analytical scenario exposure." }] } as AssessmentAnalysis;

describe("DIVA narrative grounding contract", () => {
  it("restricts AI narratives to supplied analysis results and requires analyst review", () => {
    expect(NARRATIVE_SYSTEM_INSTRUCTION).toContain("only the supplied JSON values");
    expect(NARRATIVE_SYSTEM_INSTRUCTION).toContain("Do not introduce external facts");
    expect(NARRATIVE_SYSTEM_INSTRUCTION).toContain("requires analyst review");
  });

  it("builds a deterministic grounded narrative for the optional-model fallback", () => {
    const narrative = deterministicNarrative(area, analysis);
    expect(narrative.assessmentId).toBe("AUDIT-WAY");
    expect(narrative.grounding).toBe("SUPPLIED ANALYSIS RESULTS ONLY");
    expect(narrative.cautions.join(" ")).toContain("analyst review");
  });
});
