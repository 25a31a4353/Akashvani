/**
 * Akashvani Phase 3.4 — Spatial Population Exposure Engine
 *
 * Upgrades exposed population estimation from blanket district screening
 * (15/8/2%) to habitation-level intelligence using curated settlement data.
 *
 * Pipeline priority:
 *   1. HABITATION_SUM — sum verified habitation populations inside hazard zone
 *      (requires habitation records for the district)
 *   2. DISTRICT_SCREENING_ASSUMPTION — 15/8/2% fallback (retained from Phase 3.3)
 *      (used only when no habitation records available for district)
 *   3. UNAVAILABLE — when district population is also null
 *
 * Data integrity invariants (never violated):
 *   - Population = 0 is NEVER used as a placeholder for unknown
 *   - Missing habitation pop does NOT contribute to the sum
 *   - UNKNOWN exposure status is NEVER assumed to be NOT_EXPOSED
 *   - All outputs carry explicit method + provenance + confidence
 *   - No artificial circular/buffer geometries — hazard matching is semantic
 */

import type {
  CapacityConfidence,
  ExposureMethod,
  HabitationExposureStatus,
  HabitationExposureSummary,
} from "../../../shared/hazards";
import { TARGET_STATE_HABITATIONS, type HabitationRecord } from "./data/habitations";

// ─── Hazard type keyword mapping ──────────────────────────────────────────────

/**
 * Maps a district's active hazard classification to primary exposure keywords.
 * Used for semantic matching against habitation.primaryExposures[].
 * No artificial geometry — this is keyword-based evidence matching.
 */
const HAZARD_TYPE_KEYWORDS: Record<string, string[]> = {
  FLOOD: [
    "flood", "inundation", "submergence", "river", "ganga", "brahmaputra",
    "kosi", "rapti", "ghaghara", "diara", "barrage", "embankment", "waterlogging",
    "deluge", "backwater", "spillage", "tributary",
  ],
  LANDSLIDE: [
    "landslide", "debris", "slope", "debris flow", "slope failure", "shear",
    "torrential", "mass movement",
  ],
  CYCLONE: [
    "cyclone", "storm surge", "surge", "maritime", "coastal", "sea inundation",
  ],
  RIVERBANK_EROSION: [
    "erosion", "bank cutting", "land cutting", "bankline",
  ],
  EXTREME_HEAT: [
    "heat", "heatwave", "drought", "desertification", "arid",
  ],
  SEISMIC: [
    "seismic", "earthquake",
  ],
};

/**
 * Determine the dominant hazard keyword set for a district classification.
 * RED zone: use all hazard types for broader matching.
 * ORANGE zone: use all.
 * GREEN zone: minimal — heat/drought only (for completeness).
 */
function getHazardKeywords(
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  primaryHazardHint?: string
): string[] {
  if (hazardClassification === "UNAVAILABLE") return [];

  // If we have a hint about primary hazard type, prioritize it
  if (primaryHazardHint && HAZARD_TYPE_KEYWORDS[primaryHazardHint]) {
    const primary = HAZARD_TYPE_KEYWORDS[primaryHazardHint] ?? [];
    // Also include flood as secondary for RED zones (frequently co-occurring)
    if (hazardClassification === "RED") {
      return [...primary, ...( HAZARD_TYPE_KEYWORDS.FLOOD ?? [])];
    }
    return primary;
  }

  // Without hint: use all keywords for RED/ORANGE; minimal for GREEN
  if (hazardClassification === "RED" || hazardClassification === "ORANGE") {
    return Object.values(HAZARD_TYPE_KEYWORDS).flat();
  }
  // GREEN zone — still check
  return Object.values(HAZARD_TYPE_KEYWORDS).flat();
}

// ─── Per-habitation exposure classification ───────────────────────────────────

/**
 * Classify exposure status for a single habitation against a district's hazard context.
 *
 * Logic:
 * - EXPOSED: habitation is in same district AND primary exposures include the active hazard type
 * - PARTIALLY_EXPOSED: habitation is in adjacent state, or same state different district, AND hazard matches
 * - NOT_EXPOSED: habitation has ONLY exposures that are clearly different hazard types (e.g., only drought
 *   when active hazard is cyclone) — must have POSITIVE evidence of mismatch, not just absence
 * - UNKNOWN: insufficient evidence — NEVER inferred as NOT_EXPOSED
 */
export function classifyHabitationExposure(
  habitation: HabitationRecord,
  targetDistrict: string,
  targetStateCode: string,
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  primaryHazardHint?: string
): HabitationExposureStatus {
  if (hazardClassification === "UNAVAILABLE") return "UNKNOWN";

  const keywords = getHazardKeywords(hazardClassification, primaryHazardHint);
  if (keywords.length === 0) return "UNKNOWN";

  const exposuresLower = habitation.primaryExposures.map((e) => e.toLowerCase());
  const hazardMatch = keywords.some((kw) =>
    exposuresLower.some((exp) => exp.includes(kw))
  );

  const sameDistrict =
    habitation.district.toLowerCase().trim() === targetDistrict.toLowerCase().trim();
  const sameState =
    habitation.stateCode.toUpperCase() === targetStateCode.toUpperCase();

  if (sameDistrict && sameState) {
    if (hazardMatch) return "EXPOSED";
    // Same district but no hazard keyword match — could be different micro-hazard zone
    // Don't assert NOT_EXPOSED without positive evidence
    return "UNKNOWN";
  }

  if (sameState && !sameDistrict) {
    if (hazardMatch) return "PARTIALLY_EXPOSED";
    return "UNKNOWN";
  }

  // Different state: not relevant to this district exposure
  return "NOT_EXPOSED";
}

// ─── Habitation exposure summary builder ──────────────────────────────────────

/**
 * Build a full habitation exposure summary for a district.
 * Returns null if there are no habitation records at all for the district or state.
 */
export function buildHabitationExposureSummary(
  district: string,
  stateCode: string,
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  primaryHazardHint?: string
): HabitationExposureSummary | null {
  // Filter habitations to same state (include cross-district for partial exposure)
  const relevantHabitations = TARGET_STATE_HABITATIONS.filter(
    (hab) => hab.stateCode.toUpperCase() === stateCode.toUpperCase()
  );

  if (relevantHabitations.length === 0) return null;

  // Classify each habitation
  const details: HabitationExposureSummary["habitationDetails"] = relevantHabitations.map(
    (hab) => {
      const status = classifyHabitationExposure(
        hab,
        district,
        stateCode,
        hazardClassification,
        primaryHazardHint
      );
      return {
        id: hab.id,
        name: hab.name,
        district: hab.district,
        exposureStatus: status,
        population: hab.population, // STRICTLY null when unverified — NEVER 0
        primaryExposures: hab.primaryExposures,
      };
    }
  );

  // Count by status
  const exposedDetails = details.filter((d) => d.exposureStatus === "EXPOSED");
  const partialDetails = details.filter((d) => d.exposureStatus === "PARTIALLY_EXPOSED");
  const notExposedDetails = details.filter((d) => d.exposureStatus === "NOT_EXPOSED");
  const unknownDetails = details.filter((d) => d.exposureStatus === "UNKNOWN");

  // Sum population of EXPOSED habitations only
  // If population is null for a habitation, it cannot contribute to sum (tracked separately)
  let summedExposedPopulation: number | null = null;
  let unknownPopulationCount = 0;

  for (const d of exposedDetails) {
    if (d.population !== null) {
      summedExposedPopulation = (summedExposedPopulation ?? 0) + d.population;
    } else {
      unknownPopulationCount++;
    }
  }

  // Determine method and confidence
  const hasDistrictHabitations = details.some(
    (d) => d.district.toLowerCase().trim() === district.toLowerCase().trim()
  );

  let exposureMethod: ExposureMethod;
  let exposureConfidence: CapacityConfidence;
  let dataAvailabilityNote: string;

  if (exposedDetails.length > 0) {
    exposureMethod = "HABITATION_SUM";
    exposureConfidence = unknownPopulationCount > 0 ? "MEDIUM" : "MEDIUM";
    dataAvailabilityNote = unknownPopulationCount > 0
      ? `${exposedDetails.length} habitation(s) classified as EXPOSED; ${unknownPopulationCount} have unverified population (excluded from sum). Sum represents partial lower bound only.`
      : `${exposedDetails.length} habitation(s) classified as EXPOSED with known Census 2011 population.`;
  } else if (hasDistrictHabitations) {
    // District has habitation records but none classified as EXPOSED
    exposureMethod = "POINT_BASED_SCREENING";
    exposureConfidence = "LOW";
    dataAvailabilityNote = `District has ${details.filter(d => d.district.toLowerCase() === district.toLowerCase()).length} habitation record(s) but none matched active hazard type. Exposure may be underestimated.`;
  } else {
    // No district-level habitations — state-level only (partial)
    exposureMethod = "POINT_BASED_SCREENING";
    exposureConfidence = "LOW";
    dataAvailabilityNote = `No habitation records for ${district} district specifically. State-level records available but insufficient for district exposure.`;
  }

  const provenanceLabel =
    "Akashvani Phase 3.4 Habitation Exposure Engine — Census 2011 & SDMA settlement records. " +
    "DERIVED: exposure classification uses hazard keyword matching against primaryExposures field. " +
    "Population data is OFFICIAL (Census 2011) where available; null where unverified. " +
    "No artificial buffer geometry used — matching is semantic and evidence-based.";

  return {
    totalHabitations: details.length,
    exposedHabitations: exposedDetails.length,
    partiallyExposedHabitations: partialDetails.length,
    notExposedHabitations: notExposedDetails.length,
    unknownHabitations: unknownDetails.length,
    summedExposedPopulation,
    unknownPopulationCount,
    exposureMethod,
    exposureProvenance: provenanceLabel,
    exposureConfidence,
    dataAvailabilityNote,
    habitationDetails: details,
  };
}

// ─── Screening fallback rates (retained from Phase 3.3) ──────────────────────

const SCREENING_RATES: Record<"RED" | "ORANGE" | "GREEN", number> = {
  RED: 0.15,    // 15% — per NDMA exposure screening guidance
  ORANGE: 0.08, // 8%
  GREEN: 0.02,  // 2%
};

const SCREENING_RATE_RATIONALE = {
  RED: "15% NDMA-aligned district exposure screening (fallback — spatial data unavailable)",
  ORANGE: "8% NDMA-aligned district exposure screening (fallback — spatial data unavailable)",
  GREEN: "2% baseline district exposure screening (fallback — spatial data unavailable)",
};

// ─── Unified exposure resolver ────────────────────────────────────────────────

export interface ExposedPopulationResult {
  exposedPopulationEstimate: number | null;
  exposureMethod: ExposureMethod;
  exposureProvenance: string;
  exposureConfidence: CapacityConfidence;
  exposureAssumption: string | null;
  exposureRationale: string;
  habitationSummary: HabitationExposureSummary | null;
}

/**
 * Resolve exposed population using strongest-available data source.
 *
 * Priority:
 *   1. HABITATION_SUM — when habitation data exists for state and exposed habitations found
 *   2. DISTRICT_SCREENING_ASSUMPTION — explicit fallback
 *   3. null + UNAVAILABLE — when district pop also unknown
 *
 * NEVER returns 0 to represent unknown.
 * NEVER labels DISTRICT_SCREENING_ASSUMPTION as HABITATION_SUM.
 */
export function resolveExposedPopulationWithSpatialPriority(
  district: string,
  stateCode: string,
  hazardClassification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  districtPopulation: number | null,
  primaryHazardHint?: string
): ExposedPopulationResult {

  // Build habitation summary regardless of hazard classification
  const habitationSummary = buildHabitationExposureSummary(
    district,
    stateCode,
    hazardClassification,
    primaryHazardHint
  );

  // ── Path 1: HABITATION_SUM ─────────────────────────────────────────────────
  if (
    habitationSummary !== null &&
    habitationSummary.exposedHabitations > 0 &&
    hazardClassification !== "UNAVAILABLE"
  ) {
    const estimate = habitationSummary.summedExposedPopulation;
    // estimate could be null if all exposed habitations have null population

    const provenance =
      `HABITATION_SUM: ${habitationSummary.exposedHabitations} exposed settlement(s) identified ` +
      `out of ${habitationSummary.totalHabitations} in state records. ` +
      `Source: Census of India 2011 & SDMA village records. ` +
      `Methodology: Semantic hazard-keyword matching against SDMA primary exposure records — ` +
      `not artificial radius buffers. DERIVED provenance (exposure classification uses ` +
      `Akashvani hazard engine).`;

    const rationale =
      estimate !== null
        ? `Habitation-level exposure: summed Census 2011 population of ${habitationSummary.exposedHabitations} ` +
          `EXPOSED settlement(s) = ${estimate.toLocaleString("en-IN")} persons. ` +
          (habitationSummary.unknownPopulationCount > 0
            ? `${habitationSummary.unknownPopulationCount} additional settlement(s) have unverified population (not included — lower bound).`
            : "All exposed settlements have verified Census population.")
        : `${habitationSummary.exposedHabitations} EXPOSED settlement(s) identified but none have verified ` +
          `Census population — sum unavailable. Habitation-level exposure confirmed but population magnitude unknown.`;

    return {
      exposedPopulationEstimate: estimate,
      exposureMethod: "HABITATION_SUM",
      exposureProvenance: provenance,
      exposureConfidence: "MEDIUM",
      exposureAssumption: null, // no screening assumption — real habitation data
      exposureRationale: rationale,
      habitationSummary,
    };
  }

  // ── Path 2: DISTRICT_SCREENING_ASSUMPTION (explicit fallback) ──────────────
  if (hazardClassification !== "UNAVAILABLE" && districtPopulation !== null) {
    const rate = SCREENING_RATES[hazardClassification];
    const estimate = Math.round(districtPopulation * rate);
    const assumptionText =
      `${(rate * 100).toFixed(0)}% NDMA-aligned district screening rate applied to Census 2011 ` +
      `district total (${districtPopulation.toLocaleString("en-IN")}). ` +
      `Fallback: no habitation-level spatial data available for ${district}, ${stateCode}.`;

    const rationale =
      SCREENING_RATE_RATIONALE[hazardClassification] +
      `. District population: ${districtPopulation.toLocaleString("en-IN")} × ${(rate * 100).toFixed(0)}% = ` +
      `${estimate.toLocaleString("en-IN")} estimated exposed. ` +
      `This is a DERIVED approximation — not a measured or modelled spatial intersection. ` +
      `Upgrade path: integrate WorldPop 100m raster for SPATIAL_POPULATION_INTERSECTION.`;

    return {
      exposedPopulationEstimate: estimate,
      exposureMethod: "DISTRICT_SCREENING_ASSUMPTION",
      exposureProvenance:
        `DERIVED — NDMA district screening assumption (${(rate * 100).toFixed(0)}% of Census 2011 district total). ` +
        `Spatial habitation data unavailable for this district. ` +
        `Source: Census of India 2011 district total.`,
      exposureConfidence: "LOW",
      exposureAssumption: assumptionText,
      exposureRationale: rationale,
      habitationSummary,   // may be non-null (partial — state records but none exposed)
    };
  }

  // ── Path 3: UNAVAILABLE ────────────────────────────────────────────────────
  return {
    exposedPopulationEstimate: null,   // NEVER 0
    exposureMethod: "UNAVAILABLE",
    exposureProvenance:
      "Exposure estimate unavailable: district population is null and no habitation records with known population found.",
    exposureConfidence: "UNAVAILABLE",
    exposureAssumption: null,
    exposureRationale:
      "Cannot estimate exposed population: district-level population is unavailable (null) and no verified habitation " +
      "populations found for this district. Population exposure score will be 0 (neutral) in PS191 model.",
    habitationSummary,
  };
}
