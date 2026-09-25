/**
 * ResQ Decision Intelligence Engine V3.1 — Validation Framework Registry Index
 */

export * from "./calibrationRegistry";
export * from "./holdoutRegistry";

export const V3_ACCURACY_THRESHOLDS = {
  MIN_HAZARD_ACCURACY: 0.90,
  MIN_TIER_ACCURACY: 0.90,
  MIN_ROUTE_RATE: 0.50,
  MIN_DESTINATION_SAFETY_RATE: 0.50,
  MIN_RED_RECALL: 0.90,
  ADVERSARIAL_MUST_PASS: true,
  DECISION_CONSISTENCY_MUST_PASS: true,
} as const;
