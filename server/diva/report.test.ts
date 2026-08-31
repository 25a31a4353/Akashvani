import { describe, expect, it } from "vitest";
import { buildAssessmentAnalysis } from "./analysis";
import { getDemoAreas } from "./fixtures";
import { buildAssessmentPdf } from "./report";

describe("DIVA assessment reporting", () => {
  it("creates a technical PDF report from deterministic assessment context", async () => {
    const area = getDemoAreas()[0];
    const analysis = buildAssessmentAnalysis(area);
    const pdf = await buildAssessmentPdf(area, analysis);

    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(3_000);
  });
});
