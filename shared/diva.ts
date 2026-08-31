export type RiskLevel = "Critical" | "High" | "Moderate" | "Low";
export type RelocationPriority = "Immediate" | "High" | "Moderate" | "Low";

export type AssessmentArea = {
  id: string;
  name: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  households: number;
  areaKm2: number;
  populationDensity: number;
  vulnerablePopulation: number;
  primaryHazard: "Flood" | "Landslide" | "Extreme Rainfall" | "River Erosion";
  hazardSeverity: number;
  rainfallMm: number;
  temperatureC: number;
  aqi: number;
  hospitalDistanceKm: number;
  shelterCapacity: number;
  roadAccessScore: number;
  waterAvailabilityScore: number;
  incidentIndex: number;
  dataStatus: string;
  updatedAt: string;
};

export type ScoreFactor = {
  id: string;
  label: string;
  score: number;
  contribution: number;
  interpretation: string;
};

export type CandidateSite = {
  id: string;
  name: string;
  capacity: number;
  availableCapacity: number;
  serviceAccess: number;
  suitability: number;
  constraints: string[];
  score: number;
  recommendation: string;
};

export type AssessmentAnalysis = {
  assessmentId: string;
  overallRisk: number;
  riskLevel: RiskLevel;
  vulnerabilityScore: number;
  hazardExposure: number;
  infrastructureRisk: number;
  accessibilityRisk: number;
  environmentalRisk: number;
  carryingCapacityScore: number;
  capacityStatus: "Adequate" | "Constrained" | "Insufficient";
  relocationScore: number;
  relocationPriority: RelocationPriority;
  riskFactors: ScoreFactor[];
  capacityFactors: ScoreFactor[];
  candidateSites: CandidateSite[];
  recommendedAction: string;
  methodologyVersion: string;
  dataStatus: string;
};

export type DecisionNarrative = {
  id: string;
  assessmentId: string;
  label: "AI/ML DECISION-SUPPORT NARRATIVE";
  headline: string;
  summary: string;
  drivers: string[];
  cautions: string[];
  model: string;
  grounding: "SUPPLIED ANALYSIS RESULTS ONLY";
  createdAt: string;
  reviewStatus: "Pending analyst review" | "Reviewed";
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  Critical: "#bd3034",
  High: "#e66e2d",
  Moderate: "#d3a52d",
  Low: "#31825d",
};

export const LAYER_CATALOG = [
  { id: "population", label: "Population density", group: "Exposure", enabled: true },
  { id: "vulnerable", label: "Vulnerable population", group: "Exposure", enabled: false },
  { id: "flood", label: "Flood hazard", group: "Hazard", enabled: true },
  { id: "landslide", label: "Landslide susceptibility", group: "Hazard", enabled: false },
  { id: "rainfall", label: "Extreme rainfall", group: "Environment", enabled: true },
  { id: "temperature", label: "Temperature anomaly", group: "Environment", enabled: false },
  { id: "aqi", label: "Air quality index", group: "Environment", enabled: false },
  { id: "infrastructure", label: "Critical infrastructure", group: "Infrastructure", enabled: true },
  { id: "boundaries", label: "Administrative boundaries", group: "Reference", enabled: true },
] as const;
