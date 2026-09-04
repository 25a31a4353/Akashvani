import type { AssessmentAnalysis, AssessmentArea, CandidateSite, RelocationPriority, RiskLevel, ScoreFactor } from "../../shared/diva";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const classifyRisk = (score: number): RiskLevel =>
  score >= 85 ? "Critical" : score >= 70 ? "High" : score >= 50 ? "Moderate" : "Low";

const classifyPriority = (score: number): RelocationPriority =>
  score >= 83 ? "Immediate" : score >= 68 ? "High" : score >= 48 ? "Moderate" : "Low";

export function getCapacityStatus(score: number) {
  return score >= 70 ? "Adequate" as const : score >= 48 ? "Constrained" as const : "Insufficient" as const;
}

export function buildAssessmentAnalysis(area: AssessmentArea): AssessmentAnalysis {
  const populationPressure = clamp((area.populationDensity / 4200) * 100);
  const shelterCoverage = clamp((area.shelterCapacity / area.population) * 100 * 3.4);
  const accessDeficit = clamp(100 - area.roadAccessScore);
  const environmentalRisk = clamp(area.rainfallMm * 0.35 + Math.max(0, area.aqi - 40) * 0.28 + Math.max(0, area.temperatureC - 30) * 7);
  const infrastructureRisk = clamp((area.hospitalDistanceKm * 8) + accessDeficit * 0.42 + (100 - shelterCoverage) * 0.3);
  const vulnerabilityScore = clamp(populationPressure * 0.48 + area.incidentIndex * 0.27 + (area.vulnerablePopulation / area.population) * 100 * 0.25);
  const carryingCapacityScore = clamp(shelterCoverage * 0.33 + area.waterAvailabilityScore * 0.27 + area.roadAccessScore * 0.23 + (100 - Math.min(area.hospitalDistanceKm * 7, 100)) * 0.17);
  const overallRisk = clamp(area.hazardSeverity * 0.34 + vulnerabilityScore * 0.22 + infrastructureRisk * 0.18 + accessDeficit * 0.11 + environmentalRisk * 0.15);
  const relocationScore = clamp(overallRisk * 0.46 + (100 - carryingCapacityScore) * 0.31 + vulnerabilityScore * 0.15 + accessDeficit * 0.08);

  const riskFactors: ScoreFactor[] = [
    { id: "hazard", label: `${area.primaryHazard} exposure`, score: area.hazardSeverity, contribution: Math.round(area.hazardSeverity * 0.34), interpretation: "Hazard intensity within the selected assessment scenario." },
    { id: "population", label: "Population pressure", score: populationPressure, contribution: Math.round(populationPressure * 0.22), interpretation: `${area.population.toLocaleString()} people within ${area.areaKm2} km².` },
    { id: "infrastructure", label: "Infrastructure deficit", score: infrastructureRisk, contribution: Math.round(infrastructureRisk * 0.18), interpretation: `Nearest hospital is ${area.hospitalDistanceKm} km away; shelter coverage is limited.` },
    { id: "environment", label: "Environmental stress", score: environmentalRisk, contribution: Math.round(environmentalRisk * 0.15), interpretation: `${area.rainfallMm} mm rainfall scenario and AQI ${area.aqi}.` },
    { id: "access", label: "Evacuation accessibility", score: accessDeficit, contribution: Math.round(accessDeficit * 0.11), interpretation: `Road access index is ${area.roadAccessScore}/100.` },
  ].sort((a, b) => b.contribution - a.contribution);

  const capacityFactors: ScoreFactor[] = [
    { id: "shelter", label: "Shelter capacity", score: shelterCoverage, contribution: 33, interpretation: `${area.shelterCapacity.toLocaleString()} available shelter places.` },
    { id: "water", label: "Water availability", score: area.waterAvailabilityScore, contribution: 27, interpretation: "Scenario availability score for potable and emergency water." },
    { id: "roads", label: "Road connectivity", score: area.roadAccessScore, contribution: 23, interpretation: "Composite emergency route access score." },
    { id: "healthcare", label: "Healthcare access", score: clamp(100 - area.hospitalDistanceKm * 7), contribution: 17, interpretation: `Travel distance to hospital: ${area.hospitalDistanceKm} km.` },
  ];

  const candidateSites: CandidateSite[] = [
    {
      id: `${area.id}-SITE-01`,
      name: `${area.district} Central Relief & Transit Campus`,
      capacity: Math.round(Math.max(1500, area.population * 0.008)),
      availableCapacity: Math.round(Math.max(1000, area.population * 0.0055)),
      serviceAccess: clamp(80 + (area.roadAccessScore > 60 ? 8 : -5)),
      suitability: clamp(78 + (area.waterAvailabilityScore > 60 ? 6 : -4)),
      constraints: ["Temporary drainage reinforcement needed"],
      score: 81,
      recommendation: "Preferred for phased temporary relocation.",
    },
    {
      id: `${area.id}-SITE-02`,
      name: `${area.district} North Zone Transit Facility`,
      capacity: Math.round(Math.max(1000, area.population * 0.005)),
      availableCapacity: Math.round(Math.max(450, area.population * 0.0022)),
      serviceAccess: clamp(86 + (area.roadAccessScore > 60 ? 5 : -3)),
      suitability: 74,
      constraints: ["Limited expansion area", "Seasonal traffic bottleneck"],
      score: 76,
      recommendation: "Use for priority households and medical needs.",
    },
    {
      id: `${area.id}-SITE-03`,
      name: `${area.district} Resettlement & Staging Parcel`,
      capacity: Math.round(Math.max(2000, area.population * 0.011)),
      availableCapacity: Math.round(Math.max(1600, area.population * 0.009)),
      serviceAccess: 68,
      suitability: 72,
      constraints: ["Water network extension pending"],
      score: 71,
      recommendation: "Suitable subject to service upgrades.",
    },
  ];

  const riskLevel = classifyRisk(overallRisk);
  const relocationPriority = classifyPriority(relocationScore);
  return {
    assessmentId: area.id,
    overallRisk,
    riskLevel,
    vulnerabilityScore,
    hazardExposure: area.hazardSeverity,
    infrastructureRisk,
    accessibilityRisk: accessDeficit,
    environmentalRisk,
    carryingCapacityScore,
    capacityStatus: getCapacityStatus(carryingCapacityScore),
    relocationScore,
    relocationPriority,
    riskFactors,
    capacityFactors,
    candidateSites,
    recommendedAction: relocationPriority === "Immediate"
      ? "Initiate an immediate multi-agency relocation assessment, confirm household lists, and reserve the preferred transit site."
      : relocationPriority === "High"
        ? "Prepare a time-bound relocation readiness plan, improve shelter coverage, and validate evacuation access."
        : "Maintain risk monitoring, address identified capacity gaps, and review the assessment after material data updates.",
    methodologyVersion: "DIVA deterministic analytical model v1.0 (demonstration)",
    dataStatus: area.dataStatus,
  };
}

export function getRankedAssessments(areas: AssessmentArea[]) {
  return areas
    .map(area => ({ area, analysis: buildAssessmentAnalysis(area) }))
    .sort((a, b) => b.analysis.relocationScore - a.analysis.relocationScore);
}
