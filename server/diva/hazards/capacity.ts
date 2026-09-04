/**
 * Akashvani Phase 3.3 — Carrying Capacity Assessment Engine
 *
 * PS191 core chain:
 *   HAZARD → EXPOSED POPULATION → VULNERABILITY → AVAILABLE CAPACITY
 *   → CAPACITY DEFICIT → ACCESSIBILITY → RELOCATION PRIORITY
 *
 * Data integrity invariants (must never be violated):
 * 1. population = null when unverified — NEVER 0
 * 2. facility capacity = null when unknown — NEVER fabricated
 * 3. capacityStatus = CAPACITY_UNAVAILABLE when no verified capacity exists
 * 4. No location is ever labelled "SAFE" — use RelocationSuitability
 * 5. Straight-line distance is NEVER presented as road distance
 * 6. Exposed population derived from screening rate = DISTRICT_SCREENING_ASSUMPTION
 *    — NEVER labelled as OBSERVED or measured
 *
 * This is a transparent decision-support baseline.
 * Label: BASELINE PS191 PRIORITY MODEL — NOT AI PREDICTION.
 */

import type {
  CapacityConfidence,
  CapacityStatus,
  CarryingCapacityAssessment,
  EvacuationFacility,
  ExposureMethod,
  PopulationStatus,
} from "../../../shared/hazards";
import { buildMultiHazardProfile } from "./engine";
import { tierToPresentation } from "./classification";
import { ALL_REAL_DISTRICTS, findRealDistrict } from "./data/realDistricts";
import { resolveExposedPopulationWithSpatialPriority } from "./spatialExposure";

// ─── Haversine distance helper ────────────────────────────────────────────────

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

// ─── Population resolution ────────────────────────────────────────────────────

export { CENSUS_2011_DISTRICT_POPULATION } from "./data/realDistricts";
import { CENSUS_2011_DISTRICT_POPULATION } from "./data/realDistricts";

/**
 * Resolve population and its source status for a known district.
 * Returns null/POPULATION_UNAVAILABLE when no authoritative record exists.
 */
export function resolvePopulation(
  population: number | null | undefined,
  districtName: string,
  stateCode: string
): {
  population: number | null;
  populationStatus: PopulationStatus;
  populationSource: string;
  populationYear: number | null;
} {
  if (typeof population === "number" && population > 0) {
    return {
      population,
      populationStatus: "POPULATION_OBSERVED",
      populationSource: "Census 2011 (Census of India embedded geoBoundaries district record)",
      populationYear: 2011,
    };
  }
  // Try to find it from realDistricts
  const record = findRealDistrict(districtName, stateCode);
  if (record?.population && record.population > 0) {
    return {
      population: record.population,
      populationStatus: "POPULATION_OBSERVED",
      populationSource: "Census 2011 (Census of India embedded geoBoundaries district record)",
      populationYear: 2011,
    };
  }
  const norm = districtName.trim().toLowerCase();
  if (CENSUS_2011_DISTRICT_POPULATION[norm]) {
    return {
      population: CENSUS_2011_DISTRICT_POPULATION[norm],
      populationStatus: "POPULATION_OBSERVED",
      populationSource: "Census 2011 (Registrar General & Census Commissioner of India)",
      populationYear: 2011,
    };
  }
  return {
    population: null,
    populationStatus: "POPULATION_UNAVAILABLE",
    populationSource: "Census 2011 district population not available at this geographic resolution",
    populationYear: null,
  };
}

// ─── Exposed population estimate ─────────────────────────────────────────────

/**
 * Screening rate lookup: fixed planning-assumption percentages applied to district total.
 *
 * These are DISTRICT_SCREENING_ASSUMPTION — NOT measured geospatial exposure.
 * They must be labelled DERIVED, never OBSERVED.
 *
 * Source: NDMA planning guidance — district-level evacuation planning assumption
 * (not a scientifically validated measurement of exposed population).
 */
const SCREENING_RATES: Record<"RED" | "ORANGE" | "GREEN", number> = {
  RED: 0.15,    // 15% planning assumption for highly hazardous RED zones
  ORANGE: 0.08, // 8%  planning assumption for ORANGE-classified zones
  GREEN: 0.02,  // 2%  planning assumption for GREEN-classified zones
};

export interface ExposedPopulationResult {
  estimate: number | null;
  exposureMethod: ExposureMethod;
  exposureProvenance: string;
  exposureConfidence: CapacityConfidence;
  /** Explicit screening assumption text, null when spatial method is used */
  exposureAssumption: string | null;
  screeningRate: number | null;
  rationale: string;
}

/**
 * Estimate exposed population.
 *
 * Returns DISTRICT_SCREENING_ASSUMPTION when only district population is available.
 * The result is explicitly labelled DERIVED, never OBSERVED.
 *
 * When real spatial intersection data becomes available, this function should return
 * SPATIAL_POPULATION_INTERSECTION with the measured estimate.
 */
export function estimateExposedPopulation(
  population: number | null,
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE"
): ExposedPopulationResult {
  if (population === null) {
    return {
      estimate: null,
      exposureMethod: "UNAVAILABLE",
      exposureProvenance: "District population is unavailable — cannot estimate exposed sub-population.",
      exposureConfidence: "UNAVAILABLE",
      exposureAssumption: null,
      screeningRate: null,
      rationale: "Exposed population estimate unavailable — district population is not available at this resolution.",
    };
  }
  if (hazardClassification === "UNAVAILABLE") {
    return {
      estimate: null,
      exposureMethod: "UNAVAILABLE",
      exposureProvenance: "Hazard classification unavailable — cannot apply screening rate.",
      exposureConfidence: "UNAVAILABLE",
      exposureAssumption: null,
      screeningRate: null,
      rationale: "Classification unavailable — cannot estimate exposed population.",
    };
  }

  const rate = SCREENING_RATES[hazardClassification];
  const est = Math.round(population * rate);
  const ratePercent = Math.round(rate * 100);
  const assumptionText =
    `${ratePercent}% of district population applied for ${hazardClassification}-classified area. ` +
    `This is a DISTRICT_SCREENING_ASSUMPTION (planning assumption), not a spatially measured exposed population.`;

  return {
    estimate: est,
    exposureMethod: "DISTRICT_SCREENING_ASSUMPTION",
    exposureProvenance:
      "DERIVED: NDMA-aligned district-level evacuation planning assumption. " +
      "Not based on spatial intersection of hazard geometry and population grid. " +
      "Habitation-level population breakdown would improve precision.",
    exposureConfidence: "LOW",
    exposureAssumption: assumptionText,
    screeningRate: rate,
    rationale:
      `Estimated ${est.toLocaleString("en-IN")} persons (~${ratePercent}% of district population) in ` +
      `${hazardClassification}-classified zone. ` +
      assumptionText,
  };
}

// ─── Capacity calculation ─────────────────────────────────────────────────────

/**
 * Calculate carrying capacity from exposed population and nearby facilities.
 *
 * Core invariants:
 * - If population = null → CAPACITY_UNAVAILABLE
 * - If no facility has known capacity → CAPACITY_UNAVAILABLE
 * - Deficit = max(required - available, 0) — NEVER negative
 * - Surplus = max(available - required, 0) — NEVER negative
 * - CAPACITY_UNAVAILABLE ≠ ZERO CAPACITY — missing data is uncertainty, not deficit
 */
export function calculateCapacityBalance(
  exposedPopulation: number | null,
  facilities: EvacuationFacility[]
): {
  requiredCapacity: number | null;
  availableCapacity: number | null;
  capacityDeficit: number | null;
  capacitySurplus: number | null;
  capacityStatus: CapacityStatus;
  /** @deprecated Use capacityStatus. Kept for backward compat. */
  status: "ASSESSED" | "CAPACITY_ASSESSMENT_UNAVAILABLE";
  confidence: CapacityConfidence;
} {
  const required = exposedPopulation;

  // Only eligible non-UNSUITABLE facilities with known capacity count
  const facilitiesWithKnownCapacity = facilities.filter(
    (f) => f.capacity !== null && f.relocationSuitability !== "UNSUITABLE"
  );
  const facilitiesWithUnknownCapacity = facilities.filter(
    (f) => f.capacity === null && f.relocationSuitability !== "UNSUITABLE"
  );

  const available =
    facilitiesWithKnownCapacity.length > 0
      ? facilitiesWithKnownCapacity.reduce((sum, f) => sum + (f.capacity ?? 0), 0)
      : null;

  // Determine capacity status
  let capacityStatus: CapacityStatus;
  if (available === null) {
    capacityStatus = "CAPACITY_UNAVAILABLE";
  } else if (facilitiesWithUnknownCapacity.length > 0) {
    capacityStatus = "CAPACITY_PARTIAL";
  } else {
    capacityStatus = "CAPACITY_KNOWN";
  }

  if (required === null || available === null) {
    return {
      requiredCapacity: required,
      availableCapacity: available,
      capacityDeficit: null,
      capacitySurplus: null,
      capacityStatus,
      status: "CAPACITY_ASSESSMENT_UNAVAILABLE",
      confidence: "UNAVAILABLE",
    };
  }

  const deficit = Math.max(required - available, 0);
  const surplus = Math.max(available - required, 0);

  // Confidence based on data quality
  let confidence: CapacityConfidence = "LOW";
  if (facilitiesWithKnownCapacity.some((f) => f.capacityConfidence === "HIGH")) {
    confidence = "HIGH";
  } else if (
    facilitiesWithKnownCapacity.some((f) => f.capacityConfidence === "MEDIUM") ||
    facilitiesWithKnownCapacity.length >= 3
  ) {
    confidence = "MEDIUM";
  }

  return {
    requiredCapacity: required,
    availableCapacity: available,
    capacityDeficit: deficit,
    capacitySurplus: surplus,
    capacityStatus,
    status: "ASSESSED",
    confidence,
  };
}

// ─── Overall confidence calculation ──────────────────────────────────────────

function overallConfidence(
  populationStatus: PopulationStatus,
  capacityStatus: CapacityStatus,
  facilityCount: number,
  capacityConfidence: CapacityConfidence
): CapacityConfidence {
  if (populationStatus === "POPULATION_UNAVAILABLE") return "UNAVAILABLE";
  if (capacityStatus === "CAPACITY_UNAVAILABLE") return "LOW";
  if (facilityCount === 0) return "LOW";
  if (capacityStatus === "CAPACITY_PARTIAL") return "LOW";
  return capacityConfidence;
}

// ─── Main carrying capacity builder ──────────────────────────────────────────

/**
 * Build a full CarryingCapacityAssessment for a named district.
 *
 * @param districtId - The district ID from realDistricts.ts (e.g. "DIST-AS-DIB")
 * @param facilities - Pre-discovered EvacuationFacility records for this area
 * @param searchRadiusKm - Radius used for facility search
 */
export function buildCarryingCapacityAssessment(
  districtId: string,
  facilities: EvacuationFacility[],
  searchRadiusKm: number = 30
): CarryingCapacityAssessment {
  const normId = districtId.trim().toLowerCase();
  const district = ALL_REAL_DISTRICTS.find(
    (d) =>
      d.id.toLowerCase() === normId ||
      (normId === "dist-kl-way" && d.id === "KER-WAY") ||
      d.district.toLowerCase() === normId
  );
  if (!district) {
    throw new Error(`District '${districtId}' not found in realDistricts. Check the ID.`);
  }

  // Build multi-hazard profile (Phase 3.2B)
  const profile = buildMultiHazardProfile({
    locationName: district.district,
    latitude: district.latitude,
    longitude: district.longitude,
    stateCode: district.stateCode,
    district: district.district,
  });

  const classification = tierToPresentation(profile.redZone.tier);

  // Population
  const popResolution = resolvePopulation(district.population, district.district, district.stateCode);

  // Exposure — Phase 3.4: use spatial priority resolver
  // Priority: HABITATION_SUM > DISTRICT_SCREENING_ASSUMPTION > UNAVAILABLE
  const exposureResult = resolveExposedPopulationWithSpatialPriority(
    district.district,
    district.stateCode,
    classification,
    popResolution.population,
    profile.redZone.primaryHazard // hint for better keyword matching
  );

  // Capacity balance
  const balance = calculateCapacityBalance(exposureResult.exposedPopulationEstimate, facilities);

  const confidence = overallConfidence(
    popResolution.populationStatus,
    balance.capacityStatus,
    facilities.length,
    balance.confidence
  );

  // Build limitation text reflecting actual method used
  const exposureMethodStr = exposureResult.exposureMethod;
  const isSpatial = exposureMethodStr === "HABITATION_SUM" || exposureMethodStr === "POINT_BASED_SCREENING";
  const isScreening = exposureMethodStr === "DISTRICT_SCREENING_ASSUMPTION";

  const limitations: string[] = [
    isSpatial
      ? `Exposure method: HABITATION_SUM — sum of verified Census 2011 settlement populations. DERIVED (not measured); habitation coverage is partial (${exposureResult.habitationSummary?.totalHabitations ?? 0} settlements in state records).`
      : isScreening
      ? "Exposure method: DISTRICT_SCREENING_ASSUMPTION — fixed % of district population. Spatial habitation data unavailable for this district. Lower precision than HABITATION_SUM."
      : "Exposure estimate unavailable — district population and habitation data both unavailable.",
    "Facility evacuation capacity is not published in OpenStreetMap or open sources — capacity is null unless an official record is available.",
    "Distance is straight-line (Haversine) only. Road-network routing is not integrated.",
    "Classification reflects district-wide multi-hazard exposure intersection; actual affected zone may be smaller.",
    "This is a transparent decision-support baseline, not an operational evacuation order.",
  ];

  if (exposureResult.habitationSummary?.unknownPopulationCount && exposureResult.habitationSummary.unknownPopulationCount > 0) {
    limitations.push(
      `${exposureResult.habitationSummary.unknownPopulationCount} exposed settlement(s) have unverified population (null) and are excluded from the habitation sum — estimate is a lower bound.`
    );
  }
  if (facilities.length === 0) {
    limitations.push("No evacuation-support facilities were discovered within the search radius.");
  }
  if (balance.capacityStatus === "CAPACITY_UNAVAILABLE") {
    limitations.push(
      "Facility locations are known, but verified evacuation capacity data is not available from the current source (OSM does not publish facility evacuation capacity)."
    );
  }

  return {
    areaId: district.id,
    areaName: `${district.district} District`,
    district: district.district,
    state: district.state,
    stateCode: district.stateCode,
    geographicResolution: "DISTRICT",
    population: popResolution.population,
    populationStatus: popResolution.populationStatus,
    populationSource: popResolution.populationSource,
    populationYear: popResolution.populationYear,
    hazardClassification: classification,
    redZoneTier: profile.redZone.tier,
    hazardScore: profile.redZone.score,
    // Exposure fields
    exposedPopulationEstimate: exposureResult.exposedPopulationEstimate,
    exposureMethod: exposureResult.exposureMethod,
    exposureProvenance: exposureResult.exposureProvenance,
    exposureConfidence: exposureResult.exposureConfidence,
    exposureAssumption: exposureResult.exposureAssumption,
    exposureRationale: exposureResult.exposureRationale,
    // Phase 3.4 — Habitation-level exposure summary
    habitationSummary: exposureResult.habitationSummary ?? null,
    // Facility & capacity fields
    nearbyFacilities: facilities,
    searchRadiusKm,
    facilitySource: facilities.length > 0 ? facilities[0]!.source : "No facilities discovered",
    requiredCapacity: balance.requiredCapacity,
    availableCapacity: balance.availableCapacity,
    capacityDeficit: balance.capacityDeficit,
    capacitySurplus: balance.capacitySurplus,
    capacityStatus: balance.capacityStatus,
    capacityAssessmentStatus: balance.status,
    confidence,
    limitations,
    provenance:
      `Phase 3.2B Multi-Hazard Engine (${profile.redZone.provenance.sourceName}) · ` +
      `Population: ${popResolution.populationSource} · ` +
      `Facilities: OpenStreetMap Overpass API / curated baseline`,
    calculatedAt: new Date().toISOString(),
  };
}
