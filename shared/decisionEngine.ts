/**
 * ResQ Decision Intelligence Engine V2 — Canonical Decision Schemas
 * 
 * Invariants:
 * 1. ONE Canonical Decision Object (`ResQDecisionContext`) as the single source of truth across UI, API, Map, and AI.
 * 2. Missing data NEVER silently defaults to 0, LOW, GREEN, or SAFE.
 * 3. Exposure and Vulnerability are evaluated independently.
 * 4. Facility existence is separated from verified facility capacity.
 * 5. Safe destinations are validated to ensure they are NOT inside the active hazard footprint.
 * 6. Road routes require verified OSRM road geometry; geodesic lines are strictly labeled DIRECT DISTANCE.
 * 7. Evidence completeness, decision confidence, and validation accuracy are treated as separate metrics.
 */

import type { IndiaLocation } from "./india";
import type { DataProvenance, EvidenceCoverageScore, GeologyContext } from "./multiState";
import type {
  HazardType,
  HazardLevel,
  RedZoneTier,
  HazardObservation,
  CWCGaugeObservation,
  FloodExposure,
  LandslideExposure,
  CycloneExposure,
  SeismicExposure,
  RiverbankErosionExposure,
  ExtremeRainfallExposure,
  DroughtExposure,
  ExtremeHeatExposure,
  HabitationExposure,
  ExposureMethod,
  CapacityStatus,
  CandidateStatus,
  RelocationSuitability,
  FacilityRole,
  DistanceType,
  AccessibilityEvidence,
  EvacuationFacility,
  PS191ScoreBreakdown,
  CarryingCapacityAssessment,
  RelocationRecommendation,
} from "./hazards";

export type DecisionTier = "RED" | "ORANGE" | "GREEN" | "UNKNOWN";

export type EvidenceHierarchyLevel =
  | "ACTIVE_OFFICIAL_WARNING"
  | "ACTIVE_OBSERVED_HAZARD"
  | "CURRENT_OFFICIAL_FORECAST"
  | "RECENT_OBSERVED_EVENT"
  | "HISTORICAL_EVENT"
  | "SUSCEPTIBILITY_SCREENING"
  | "STATIC_REGULATORY_REFERENCE";

export type FreshnessClassification =
  | "CURRENT"
  | "RECENT"
  | "HISTORICAL"
  | "STATIC_REFERENCE"
  | "FORECAST"
  | "MODELLED"
  | "EXPIRED"
  | "UNKNOWN";

export interface EvidenceSourceSnapshot {
  sourceId: string;
  sourceName: string;
  sourceType: "OFFICIAL" | "OBSERVED" | "HISTORICAL" | "REFERENCE" | "FORECAST" | "MODELLED" | "DERIVED";
  sourceTimestamp: string | null;
  retrievedAt: string;
  validFrom: string | null;
  validUntil: string | null;
  freshness: FreshnessClassification;
  resolution: string;
  scale: string | null;
  geometryLevel: "POINT" | "POLYGON" | "LINE" | "RASTER" | "DISTRICT_ADMIN" | "TABULAR";
  confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
  isDeduplicated?: boolean;
}

export interface ResQDataSnapshot {
  snapshotId: string;
  timestamp: string;
  sources: Record<string, EvidenceSourceSnapshot>;
  evidenceGroups: Record<string, string[]>; // e.g. "flood_inundation_group": ["cwcGauges", "historicalFloodplains"]
}

export interface HazardEvidenceContribution {
  hazard: HazardType;
  score: number;
  hierarchyLevel: EvidenceHierarchyLevel;
  evidenceSourceGroup: string;
  reason: string;
  trigger: string;
  isDeduplicated: boolean;
  provenance: DataProvenance;
}

export interface ResQHazardAssessment {
  tier: DecisionTier;
  compositeHazardScore: number; // 0-100
  primaryHazard: HazardType;
  primaryDriverReason: string;
  secondaryHazards: HazardType[];
  supportingEvidence: string[];
  triggers: string[];
  contributions: HazardEvidenceContribution[];
  specificExposures: {
    flood: FloodExposure;
    landslide: LandslideExposure;
    cyclone: CycloneExposure;
    seismic: SeismicExposure;
    erosion: RiverbankErosionExposure;
    rainfall: ExtremeRainfallExposure;
    drought: DroughtExposure;
    heat: ExtremeHeatExposure;
    geology?: GeologyContext | null;
  };
  provenance: DataProvenance;
  limitations: string[];
}

export interface ResQExposureAssessment {
  populationValue: number | null;
  populationUnit: "people";
  populationResolution: "Habitation" | "Village" | "WorldPop 100m" | "WorldPop 1km" | "District" | "State" | "Unavailable";
  populationYear: number | null;
  populationSource: string;
  exposedPopulationEstimate: number | null;
  exposureMethod: ExposureMethod;
  exposureRationale: string;
  exposedHabitationsCount: number;
  exposedHabitations: HabitationExposure[];
  selectedOriginHabitation: HabitationExposure | {
    name: string;
    latitude: number;
    longitude: number;
    exposureLevel: string;
    population: number | null;
    hazardType: string;
    insideHazardZone: boolean;
  };
}

export interface ResQVulnerabilityAssessment {
  status: "ASSESSED" | "UNKNOWN";
  vulnerabilityScore: number | null; // 0-20 in priority breakdown, or null if demographic data unavailable
  demographicDataAvailable: boolean;
  factors: Array<{ name: string; value: string | number; evidence: string }>;
  terrainVulnerabilityScore: number | null;
  accessibilityConstraintScore: number | null;
  rationale: string;
}

export interface ResQCapacityAssessment {
  capacityStatus: CapacityStatus;
  capacityVerified: boolean;
  capacitySource: string;
  capacityTimestamp: string | null;
  totalNearbyFacilities: number;
  eligibleRelocationShelters: number;
  hospitalsExcludedFromShelters: number;
  requiredCapacity: number | null;
  availableCapacity: number | null;
  capacityDeficit: number | null;
  notes: string;
}

export interface ResQAccessibilityAssessment {
  status: "ACCESSIBLE" | "CONSTRAINED" | "UNAVAILABLE";
  roadAccessVerified: boolean;
  evidence: AccessibilityEvidence;
  obstaclesIdentified: string[];
  travelTimeMinutes: number | null;
  accessibilityScore: number; // 0-15 in priority breakdown
  notes: string;
}

export interface DestinationSafetyCheck {
  destinationName: string;
  destinationInsideHazard: boolean;
  destinationHazardTier: RedZoneTier | "UNSCREENED";
  destinationHazardScore: number | null;
  destinationSafetyStatus: "SAFE" | "CONDITIONAL" | "UNSAFE" | "UNKNOWN";
  checkDetails: string;
}

export interface ResQRelocationAssessment {
  candidateStatus: CandidateStatus;
  bestCandidate: EvacuationFacility | null;
  destinationSafety: DestinationSafetyCheck;
  conditionalAlternatives: EvacuationFacility[];
  facilitiesWithHazardConflict: EvacuationFacility[];
  nearestFacilities: EvacuationFacility[];
  rationale: string;
}

export interface ResQRoutingAssessment {
  status: "ROAD_ROUTE_VERIFIED" | "ROAD_ROUTING_UNAVAILABLE" | "DIRECT_DISTANCE_FALLBACK";
  origin: {
    name: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
    role: string;
  } | null;
  isRoadRoute: boolean;
  routeCoordinates: [number, number][]; // [lon, lat]
  distanceKm: number | null;
  durationMinutes: number | null;
  validation: {
    geometryExists: boolean;
    originProximityValid: boolean;
    destinationProximityValid: boolean;
    positiveDistanceDuration: boolean;
    coordinatesValid: boolean;
  };
  displayBadge: string;
  sourceNote: string;
}

export interface PriorityScoreComponent {
  rawValue: number | null;
  normalizedValue: number; // 0 to maxWeight
  maxWeight: number;
  contribution: number;
  source: string;
  method: string;
  uncertainty: string;
}

export interface ResQResponsePriority {
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  priorityScore: number; // 0-100
  components: {
    hazardSeverity: PriorityScoreComponent;
    populationExposure: PriorityScoreComponent;
    vulnerability: PriorityScoreComponent;
    capacityDeficit: PriorityScoreComponent;
    accessibility: PriorityScoreComponent;
  };
  scoreBreakdown: PS191ScoreBreakdown;
  criticalDataMissing: boolean;
  formulaExplanation: string;
}

export interface ResQDecisionExplanation {
  whyThisHazard: string;
  whyThisSeverity: string;
  whyThisLocation: string;
  whyThisPriority: string;
  whyThisDestination: string;
  whyThisRoute: string;
  whyNotAnotherDestination: string;
  whatDataIsMissing: string;
}

export interface ResQMapState {
  riskTier: DecisionTier;
  tierColor: string;
  primaryHazard: HazardType;
  secondaryHazards: HazardType[];
  compositeScore: number;
  originMarker: {
    coordinates: [number, number];
    label: string;
    exposureLevel: string;
    population: number | null;
  };
  destinationMarker: {
    coordinates: [number, number];
    label: string;
    role: string;
    safetyStatus: string;
    capacity: number | null;
  } | null;
  route: {
    coordinates: [number, number][];
    distanceKm: number | null;
    durationMinutes: number | null;
    isRoadRoute: boolean;
    displayBadge: string;
    status: string;
  } | null;
  activeLayerKeys: string[];
  hazardSummary: string;
}

export interface ResQConsistencyCheck {
  name: string;
  status: "PASSED" | "FAILED" | "WARNING";
  details: string;
  source: string;
}

/**
 * The Canonical Decision Result — The Single Source of Truth
 */
export interface ResQDecisionContext {
  decisionId: string;
  decisionSnapshotHash: string;
  decisionTimestamp: string;
  location: IndiaLocation;
  dataSnapshot: ResQDataSnapshot;
  hazardAssessment: ResQHazardAssessment;
  exposureAssessment: ResQExposureAssessment;
  vulnerabilityAssessment: ResQVulnerabilityAssessment;
  capacityAssessment: ResQCapacityAssessment;
  accessibilityAssessment: ResQAccessibilityAssessment;
  relocationAssessment: ResQRelocationAssessment;
  routingAssessment: ResQRoutingAssessment;
  responsePriority: ResQResponsePriority;
  evidenceCoverage: EvidenceCoverageScore;
  confidence: {
    level: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
    score: number; // 0.0 - 1.0
    reasons: string[];
  };
  uncertainty: {
    level: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    reasons: string[];
    missingDatasets: string[];
  };
  provenance: DataProvenance;
  recommendedAction: {
    tier: DecisionTier;
    headline: string;
    actionItems: string[];
    rationale: string;
  };
  explanation: ResQDecisionExplanation;
  mapState: ResQMapState;
  consistencyChecks: ResQConsistencyCheck[];
}
