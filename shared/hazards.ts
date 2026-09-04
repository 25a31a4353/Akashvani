/**
 * Akashvani Phase 3.2B — Multi-Hazard Intelligence & Red-Zone Engine Schemas
 * 
 * Strict Data Hygiene Principles:
 * 1. Missing data MUST be null with status "UNAVAILABLE".
 * 2. Missing data NEVER defaults to 0 or safe.
 * 3. Strict provenance classification (OFFICIAL, OBSERVED, LIVE_API, MODELLED, DERIVED, FIXTURE, USER_UPLOADED).
 * 4. Habitation population is null when unverified; 0 is never used as a placeholder.
 */

import type { DataProvenance } from "./multiState";

export type HazardType =
  | "FLOOD"
  | "LANDSLIDE"
  | "CYCLONE"
  | "EXTREME_RAINFALL"
  | "SEISMIC"
  | "DROUGHT"
  | "EXTREME_HEAT"
  | "RIVERBANK_EROSION"
  | "WILDFIRE";

export type HazardLevel =
  | "CRITICAL"
  | "HIGH"
  | "MODERATE"
  | "LOW"
  | "UNAVAILABLE";

export type RedZoneTier = "RED" | "ORANGE" | "YELLOW" | "LOW";

export interface HazardObservation {
  hazardType: HazardType;
  hazardLevel: HazardLevel;
  rawNumericValue: number | null;
  rawUnit: string | null;
  normalizedScore: number | null; // 0–100 or null if unavailable
  geometry?: {
    type: string;
    coordinates: unknown;
  } | null;
  distanceToFeatureKm: number | null;
  provenance: DataProvenance;
  limitations: string[];
}

export interface CWCGaugeObservation {
  stationId: string;
  stationName: string;
  river: string;
  basin: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  warningLevelMeters: number;
  dangerLevelMeters: number;
  hflMeters: number; // Highest Flood Level
  currentLevelMeters: number | null;
  status: "NORMAL" | "WARNING" | "DANGER" | "UNAVAILABLE";
  source: string;
}

export interface FloodExposure {
  insideHistoricalFloodExtent: boolean;
  distanceToFloodExtentKm: number | null;
  floodFrequencyTier: "ANNUAL" | "HIGH_FREQUENCY" | "MODERATE" | "LOW" | "UNAVAILABLE";
  nearestRiver: string | null;
  riverDistanceKm: number | null;
  nearestCwcGauge: CWCGaugeObservation | null;
  currentRainfallMm: number | null;
  recentAccumulationMm: number | null;
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface HistoricalLandslideEvent {
  id: string;
  name: string;
  state: string;
  district: string;
  year: number;
  latitude: number;
  longitude: number;
  trigger: string;
  fatalities: number | null;
  source: string;
  distanceKm?: number;
}

export interface LandslideExposure {
  districtRank: number | null; // 1 to 147 from ISRO Landslide Atlas
  districtName: string;
  susceptibilityClass: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  nearestEvent: HistoricalLandslideEvent | null;
  slopeDegrees: number | null;
  elevationMeters: number | null;
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface HistoricalCycloneTrack {
  id: string;
  name: string;
  year: number;
  category: "CS" | "SCS" | "VSCS" | "ESCS" | "SuCS"; // Cyclonic Storm to Super Cyclone
  maxSustainedWindKmph: number;
  centralPressureHpa: number | null;
  landfallLocation: string;
  landfallState: string;
  landfallLatitude: number;
  landfallLongitude: number;
  coordinates: [number, number][]; // [lon, lat] points along track
  source: string;
  distanceKm?: number;
}

export interface CycloneExposure {
  nearestTrack: HistoricalCycloneTrack | null;
  distanceToTrackKm: number | null;
  distanceToCoastKm: number | null;
  elevationMeters: number | null;
  coastalVulnerabilityClass: "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "NOT_COASTAL";
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface SeismicExposure {
  zone: "ZONE_II" | "ZONE_III" | "ZONE_IV" | "ZONE_V";
  zoneFactor: number; // 0.10, 0.16, 0.24, 0.36 (IS 1893:2016)
  intensityDescription: string;
  peakGroundAccelerationG: number;
  regulatoryStatus: "OFFICIAL_REGULATORY_BASELINE";
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface RiverbankErosionExposure {
  insideErosionCorridor: boolean;
  riverSystem: string | null;
  distanceToBankKm: number | null;
  corridorBufferMeters: number | null; // 100m, 250m, 500m
  riskTier: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface ExtremeRainfallExposure {
  currentRainfallMm: number | null;
  recent24hAccumulationMm: number | null;
  forecastMaxMm: number | null;
  imdClassification: "NORMAL" | "HEAVY" | "VERY_HEAVY" | "EXTREMELY_HEAVY" | "UNAVAILABLE";
  historicalExtremeMaxDailyMm: number | null;
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface DroughtExposure {
  dstClimateVulnerabilityScore: number | null; // 0-1 from DST Common Framework
  vulnerabilityClass: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  rainfallDeficiencyCategory: string | null;
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface ExtremeHeatExposure {
  isHeatwaveProneDistrict: boolean;
  climatologicalDaysAbove40CPerYear: number | null;
  currentTemperatureC: number | null;
  heatwaveStatus: "ACTIVE_HEATWAVE" | "PRONE_BASELINE" | "LOW_RISK" | "UNAVAILABLE";
  status: HazardLevel;
  evidence: string[];
  provenance: DataProvenance;
}

export interface RedZoneAssessment {
  status: RedZoneTier;
  tier: RedZoneTier; // Alias for status ("RED" | "ORANGE" | "YELLOW" | "LOW")
  isRedZone: boolean; // status === "RED"
  score: number; // 0–100 composite severity
  compositeScore: number; // Alias for score
  primaryHazard: HazardType;
  triggers: string[];
  explanation: string; // Human-readable rationale
  explainability: string; // Detailed audit trace
  confidence: "HIGH" | "MEDIUM" | "LOW";
  provenance: DataProvenance;
  limitations: string[];
}

export interface HabitationExposure {
  habitationId: string;
  name: string;
  state: string;
  stateCode: string;
  district: string;
  latitude: number;
  longitude: number;
  population: number | null; // STRICTLY null when unverified — NEVER 0
  hazardType: HazardType;
  exposureLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  distanceToHazardKm: number;
  insideHazardZone: boolean;
  hazardEvidence: string[];
  provenance: DataProvenance;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface MultiHazardProfile {
  locationName: string;
  stateCode: string;
  stateName: string;
  district: string | null;
  latitude: number;
  longitude: number;
  redZone: RedZoneAssessment;
  observations: Record<HazardType, HazardObservation>;
  hazards: HazardObservation[]; // Array representation of observations
  flood: FloodExposure;
  landslide: LandslideExposure;
  cyclone: CycloneExposure;
  seismic: SeismicExposure;
  erosion: RiverbankErosionExposure;
  rainfall: ExtremeRainfallExposure;
  drought: DroughtExposure;
  heat: ExtremeHeatExposure;
  exposedHabitations: HabitationExposure[];
  dataCompletenessPercent: number; // 0-100 based on verified inputs
  updatedAt: string;
}

// ─── Phase 3.3 — Carrying Capacity Assessment + Relocation Intelligence ───────

/**
 * Population source quality classification.
 * NEVER substitute null population with 0.
 */
export type PopulationStatus =
  | "POPULATION_OBSERVED"     // Directly counted (e.g. Census 2011)
  | "POPULATION_MODELLED"     // Modelled estimate (e.g. WorldPop)
  | "POPULATION_DERIVED"      // Derived from proxy
  | "POPULATION_UNAVAILABLE"; // Cannot be determined at this resolution

/**
 * How exposed population was estimated.
 * - SPATIAL_POPULATION_INTERSECTION: Real spatial intersection of hazard geometry and population grid (future: WorldPop raster)
 * - HABITATION_SUM: Sum of verified habitation-level populations inside hazard zone (Phase 3.4)
 * - POINT_BASED_SCREENING: Habitation point coordinates used without polygon geometry (Phase 3.4)
 * - DISTRICT_SCREENING_ASSUMPTION: Fixed % rate applied to district total — DERIVED, not measured (fallback only)
 * - UNAVAILABLE: Cannot be estimated
 */
export type ExposureMethod =
  | "SPATIAL_POPULATION_INTERSECTION"
  | "HABITATION_SUM"
  | "POINT_BASED_SCREENING"
  | "DISTRICT_SCREENING_ASSUMPTION"
  | "UNAVAILABLE";

/**
 * Explicit exposure status for a single habitation.
 * - EXPOSED: Habitation's primary hazard type matches the active hazard zone
 * - PARTIALLY_EXPOSED: Adjacent district or secondary hazard overlap
 * - NOT_EXPOSED: Positive evidence of absence (different hazard type, confirmed safe elevation)
 * - UNKNOWN: Insufficient data — NEVER inferred as NOT_EXPOSED from absence of data
 */
export type HabitationExposureStatus =
  | "EXPOSED"
  | "PARTIALLY_EXPOSED"
  | "NOT_EXPOSED"
  | "UNKNOWN";

/**
 * Aggregated habitation exposure summary for a district.
 * Phase 3.4 — replaces/supplements the blanket district screening assumption.
 *
 * Data integrity: summedExposedPopulation is null if no exposed habitation has known population.
 * unknownPopulationCount tracks how many habitations could not contribute to the sum.
 */
export interface HabitationExposureSummary {
  totalHabitations: number;
  exposedHabitations: number;
  partiallyExposedHabitations: number;
  notExposedHabitations: number;
  unknownHabitations: number;
  summedExposedPopulation: number | null;   // null when no exposed hab has known pop
  unknownPopulationCount: number;           // habitations where population = null
  exposureMethod: ExposureMethod;
  exposureProvenance: string;
  exposureConfidence: CapacityConfidence;
  dataAvailabilityNote: string;
  habitationDetails: {
    id: string;
    name: string;
    district: string;
    exposureStatus: HabitationExposureStatus;
    population: number | null;
    primaryExposures: string[];
  }[];
}

/**
 * Functional role of an evacuation-support facility.
 * A hospital is NOT automatically a shelter.
 */
export type FacilityRole =
  | "EMERGENCY_SHELTER"
  | "SCHOOL_EVACUATION_SUPPORT"
  | "HOSPITAL_MEDICAL_SUPPORT"
  | "RELIEF_CENTRE"
  | "COMMUNITY_FACILITY"
  | "UNKNOWN";

/**
 * Eligibility of a facility role as a RELOCATION candidate.
 * Hospitals are medical support only — not general relocation shelters.
 */
export const RELOCATION_ELIGIBLE_ROLES: FacilityRole[] = [
  "EMERGENCY_SHELTER",
  "RELIEF_CENTRE",
];
export const RELOCATION_CONDITIONAL_ROLES: FacilityRole[] = [
  "SCHOOL_EVACUATION_SUPPORT",
  "COMMUNITY_FACILITY",
];
// HOSPITAL_MEDICAL_SUPPORT and UNKNOWN are NOT eligible for preferred relocation

/** Qualitative confidence in a capacity assessment. Not a fabricated percentage. */
export type CapacityConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";

/**
 * Explicit carrying capacity status.
 * - CAPACITY_KNOWN: All eligible facilities have known, verified capacity.
 * - CAPACITY_PARTIAL: Some facilities have known capacity, others do not.
 * - CAPACITY_ESTIMATED: Capacities are estimated, not officially verified.
 * - CAPACITY_UNAVAILABLE: No verified capacity data available from any source.
 */
export type CapacityStatus =
  | "CAPACITY_KNOWN"
  | "CAPACITY_PARTIAL"
  | "CAPACITY_ESTIMATED"
  | "CAPACITY_UNAVAILABLE";

/**
 * Suitability of a facility/site as a relocation candidate.
 * NEVER use "SAFE" — use these precise terms.
 */
export type RelocationSuitability =
  | "PREFERRED"    // Capacity + accessible + no identified hazard conflict
  | "CONDITIONAL"  // Some hazard concern or incomplete data
  | "UNSUITABLE"   // Inside critical hazard zone
  | "UNKNOWN";     // Insufficient evidence

/** Distance type — straight-line must NEVER be presented as road distance. */
export type DistanceType = "STRAIGHT_LINE" | "ROAD_NETWORK" | "UNAVAILABLE";

/**
 * Evidence quality for accessibility assessment.
 * Straight-line is a proxy ONLY; must not be presented as road access.
 */
export type AccessibilityEvidence =
  | "ROAD_NETWORK"          // Real routing data from OSRM/ORS
  | "STRAIGHT_LINE_PROXY"   // Haversine only — road travel unknown
  | "UNAVAILABLE";          // No spatial data

/**
 * Status of the best candidate facility selection.
 */
export type CandidateStatus =
  | "PREFERRED_CANDIDATE"     // A PREFERRED facility was found and selected
  | "CONDITIONAL_FALLBACK"    // Only CONDITIONAL facilities available (no PREFERRED)
  | "NO_PREFERRED_CANDIDATE"  // No PREFERRED facility in radius
  | "NO_CANDIDATE";           // No eligible facility at all

/**
 * A real, geolocated evacuation-support facility.
 * All capacity fields are strictly null when unknown — never fabricated.
 */
export interface EvacuationFacility {
  facilityId: string;
  name: string;
  facilityRole: FacilityRole;
  latitude: number;
  longitude: number;
  source: string;
  provenance: string;
  lastUpdated: string | null;
  capacity: number | null;           // null when unknown — NEVER fabricated
  capacitySource: string;
  capacityConfidence: CapacityConfidence;
  facilityHazardTier: RedZoneTier | "UNSCREENED";
  facilityHazardScore: number | null;
  relocationSuitability: RelocationSuitability;
  hazardScreeningNote: string;
  straightLineDistanceKm: number;
  routeDistanceKm?: number | null; // Real road distance from OSRM when available
  distanceType: DistanceType;
  estimatedTravelTimeMinutes: number | null; // null when routing unavailable
  accessibilityNote: string;
}

/**
 * Score breakdown for the PS191 priority model.
 * All components are explicit — the total MUST equal sum of components.
 * Formula (Option A): Hazard(0-30) + Population(0-20) + Vulnerability(0-20) + Capacity(0-15) + Accessibility(0-15)
 */
export interface PS191ScoreBreakdown {
  hazardSeverity: number;      // 0–30
  populationExposure: number;  // 0–20
  vulnerability: number;       // 0–20 (explicit component, not just a reason code)
  capacityDeficit: number;     // 0–15 (0 when unavailable — not penalised as unknown)
  accessibility: number;       // 0–15
  total: number;               // MUST equal sum of all components
}

/**
 * Full PS191 carrying-capacity assessment for one district/area.
 */
export interface CarryingCapacityAssessment {
  areaId: string;
  areaName: string;
  district: string;
  state: string;
  stateCode: string;
  geographicResolution: "DISTRICT" | "HABITATION" | "SUBDISTRICT";
  population: number | null;
  populationStatus: PopulationStatus;
  populationSource: string;
  populationYear: number | null;
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE";
  redZoneTier: RedZoneTier;
  hazardScore: number;
  // ─── Exposure fields ───────────────────────────────────────────────────────
  exposedPopulationEstimate: number | null;
  exposureMethod: ExposureMethod;
  exposureProvenance: string;        // human-readable source description
  exposureConfidence: CapacityConfidence;
  exposureAssumption: string | null; // explicit screening rate/assumption text, or null if spatial
  exposureRationale: string;         // full human-readable rationale
  // ─── Phase 3.4 — Habitation-level exposure summary (optional, non-breaking) ─
  habitationSummary: HabitationExposureSummary | null; // null when no habitation data available
  // ─── Facility & capacity fields ────────────────────────────────────────────
  nearbyFacilities: EvacuationFacility[];
  searchRadiusKm: number;
  facilitySource: string;
  requiredCapacity: number | null;
  availableCapacity: number | null;
  capacityDeficit: number | null;
  capacitySurplus: number | null;
  capacityStatus: CapacityStatus;    // explicit 4-state enum
  /** @deprecated Use capacityStatus instead. Kept for backward compat. */
  capacityAssessmentStatus: "ASSESSED" | "CAPACITY_ASSESSMENT_UNAVAILABLE";
  confidence: CapacityConfidence;
  limitations: string[];
  provenance: string;
  calculatedAt: string;
}

/** Structured reason codes explaining a relocation priority. */
export type ReasonCode =
  | "RED_ZONE"
  | "ORANGE_ZONE"
  | "HIGH_EXPOSURE"
  | "HIGH_VULNERABILITY"
  | "POPULATION_EXPOSED"
  | "CAPACITY_DEFICIT"           // Only when deficit is mathematically confirmed
  | "CAPACITY_DATA_UNAVAILABLE"  // When capacity = null (replaces CAPACITY_DEFICIT)
  | "FACILITY_CAPACITY_UNKNOWN"  // Facilities found but all capacity = null
  | "POOR_ACCESS"
  | "FACILITY_HAZARD_CONFLICT"
  | "NO_NEARBY_CAPACITY"
  | "DATA_LIMITATION"
  | "LOW_HAZARD_SCORE"
  | "ADEQUATE_CAPACITY";

/**
 * Full PS191 relocation recommendation.
 * Label: BASELINE PS191 PRIORITY MODEL — NOT AI prediction.
 *
 * Priority formula (Option A — 5 components, sum = 100):
 *   Hazard Severity (0–30) + Population Exposure (0–20) + Vulnerability (0–20)
 *   + Capacity Deficit (0–15) + Accessibility (0–15)
 *   HIGH ≥ 70 | MEDIUM 40–69 | LOW < 40 | UNKNOWN if critical data missing
 */
export interface RelocationRecommendation {
  recommendationId: string;
  sourceAreaId: string;
  sourceAreaName: string;
  sourceHazardLevel: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE";
  sourcePopulation: number | null;
  exposedPopulation: number | null;
  exposureMethod: ExposureMethod;
  exposureAssumption: string | null;
  vulnerabilityScore: number | null;
  capacityRequired: number | null;
  capacityAvailable: number | null;
  capacityDeficit: number | null;
  capacityStatus: CapacityStatus;
  nearestFacilities: EvacuationFacility[];
  // ─── Candidate fields ──────────────────────────────────────────────────────
  candidateStatus: CandidateStatus;       // Status of best candidate selection
  candidateDestination: string | null;    // null when no PREFERRED candidate exists
  candidateDestinationType: FacilityRole | null;
  candidateLatitude: number | null;
  candidateLongitude: number | null;
  destinationCapacity: number | null;
  destinationHazardStatus: RelocationSuitability | null;
  conditionalAlternatives: EvacuationFacility[]; // CONDITIONAL facilities (separate from candidate)
  facilitiesWithHazardConflict: EvacuationFacility[]; // UNSUITABLE — shown for awareness only
  // ─── Distance / accessibility ──────────────────────────────────────────────
  distanceKm: number | null;
  routeDistanceKm?: number | null;
  distanceType: DistanceType;
  accessibilityEvidence: AccessibilityEvidence;
  travelTimeMinutes: number | null;
  accessibilityStatus: "ACCESSIBLE" | "DIFFICULT" | "UNKNOWN";
  // ─── Priority ─────────────────────────────────────────────────────────────
  priorityLevel: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  priorityScore: number;              // MUST equal scoreBreakdown.total
  scoreBreakdown: PS191ScoreBreakdown; // Single source of truth for score
  priorityConfidence: CapacityConfidence; // Confidence in the priority rating itself
  reasonCodes: ReasonCode[];
  explanation: string;
  modelLabel: "BASELINE PS191 PRIORITY MODEL";
  provenance: string;
  confidence: CapacityConfidence;
  limitations: string[];
  timestamp: string;
}
