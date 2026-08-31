import { invokeLLM } from "../_core/llm";
import type { AssessmentAnalysis, AssessmentArea, DecisionNarrative } from "../../shared/diva";

export const NARRATIVE_SYSTEM_INSTRUCTION = "You draft a clearly labelled decision-support narrative for an analyst. Use only the supplied JSON values. Do not introduce external facts, forecasts, policy requirements, official formulas, certainty claims, or directions that replace professional judgement. State that the narrative requires analyst review.";

export function deterministicNarrative(area: AssessmentArea, analysis: AssessmentAnalysis): DecisionNarrative {
  const drivers = [...analysis.riskFactors].sort((left, right) => right.score - left.score).slice(0, 3).map(factor => `${factor.label}: ${factor.interpretation}`);
  return { id: `NAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, assessmentId: area.id, label: "AI/ML DECISION-SUPPORT NARRATIVE", headline: `${area.name}: ${analysis.riskLevel} analytical screening context`, summary: `${area.name} has an overall analytical risk score of ${analysis.overallRisk}/100, a carrying-capacity score of ${analysis.carryingCapacityScore}/100 (${analysis.capacityStatus}), and ${analysis.relocationPriority} relocation priority. ${analysis.recommendedAction}`, drivers, cautions: ["The optional narrative model was unavailable or returned an invalid response, so this deterministic fallback uses only the supplied analysis values.", "This decision-support narrative requires analyst review and is not an official warning or operational directive."], model: "deterministic-grounded-fallback", grounding: "SUPPLIED ANALYSIS RESULTS ONLY", createdAt: new Date().toISOString(), reviewStatus: "Pending analyst review" };
}

export async function generateGroundedNarrative(area: AssessmentArea, analysis: AssessmentAnalysis): Promise<DecisionNarrative> {
  const source = {
    location: { name: area.name, district: area.district, state: area.state, population: area.population },
    analysis: {
      overallRisk: analysis.overallRisk,
      riskLevel: analysis.riskLevel,
      carryingCapacityScore: analysis.carryingCapacityScore,
      capacityStatus: analysis.capacityStatus,
      relocationPriority: analysis.relocationPriority,
      recommendedAction: analysis.recommendedAction,
      riskFactors: analysis.riskFactors.map(factor => ({ label: factor.label, score: factor.score, interpretation: factor.interpretation })),
    },
  };
  let raw: unknown;
  try {
    const response = await invokeLLM({
    model: "gpt-5-mini",
    maxTokens: 850,
    messages: [
      {
        role: "system",
        content: NARRATIVE_SYSTEM_INSTRUCTION,
      },
      { role: "user", content: `SUPPLIED ANALYSIS RESULTS ONLY:\n${JSON.stringify(source)}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "diva_decision_support_narrative",
        strict: true,
        schema: {
          type: "object",
          properties: {
            headline: { type: "string" },
            summary: { type: "string" },
            drivers: { type: "array", items: { type: "string" } },
            cautions: { type: "array", items: { type: "string" } },
          },
          required: ["headline", "summary", "drivers", "cautions"],
          additionalProperties: false,
        },
      },
    },
    });
    raw = response.choices[0]?.message.content;
  } catch {
    return deterministicNarrative(area, analysis);
  }
  if (typeof raw !== "string") return deterministicNarrative(area, analysis);
  let content: Omit<DecisionNarrative, "id" | "assessmentId" | "label" | "model" | "grounding" | "createdAt" | "reviewStatus">;
  try { content = JSON.parse(raw) as typeof content; } catch { return deterministicNarrative(area, analysis); }
  return {
    id: `NAR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    assessmentId: area.id,
    label: "AI/ML DECISION-SUPPORT NARRATIVE",
    headline: content.headline,
    summary: content.summary,
    drivers: content.drivers,
    cautions: content.cautions,
    model: "gpt-5-mini",
    grounding: "SUPPLIED ANALYSIS RESULTS ONLY",
    createdAt: new Date().toISOString(),
    reviewStatus: "Pending analyst review",
  };
}
