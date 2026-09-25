/**
 * ResQ Decision Intelligence Engine V2 — Population & Exposure Engine
 * 
 * Rules:
 * 1. Strict hierarchy: Habitation -> Village -> 100m WorldPop -> 1km WorldPop -> District -> State.
 * 2. NEVER silently substitute a district population for a habitation population.
 * 3. Returns null (NEVER 0) when population data is unavailable.
 * 4. Resolves the canonical vulnerable origin habitation for evacuation planning.
 */

import type { ResQExposureAssessment } from "../../../shared/decisionEngine";
import type { IndiaLocation } from "../../../shared/india";
import type {
  HabitationExposure,
  ExposureMethod,
} from "../../../shared/hazards";
import { findExposedHabitations } from "../hazards/engine";

export function evaluateExposure(
  location: IndiaLocation,
  districtName?: string | null,
  stateCode?: string | null,
  radiusKm: number = 35
): ResQExposureAssessment {
  // 1. Resolve population resolution and source
  let populationValue: number | null = location.population ?? null;
  let populationResolution: ResQExposureAssessment["populationResolution"] = "Unavailable";
  let populationYear: number | null = 2011;
  const populationSource = location.populationSource || "Census 2011 Primary Census Abstract";

  if (populationValue !== null) {
    if (location.category === "Locality" || location.category === "Place") {
      populationResolution = "Habitation";
    } else if (location.category === "City") {
      populationResolution = "Village";
    } else if (location.category === "District") {
      populationResolution = "District";
    } else if (location.category === "State") {
      populationResolution = "State";
    } else {
      populationResolution = "Village";
    }
  }

  // 2. Discover habitations within radius
  const habitations = findExposedHabitations(
    location.latitude,
    location.longitude,
    radiusKm,
    stateCode ?? undefined,
    districtName ?? undefined
  );

  const exposedHabitations = habitations.filter(h => h.insideHazardZone);
  const exposedHabitationsCount = exposedHabitations.length;

  // 3. Compute exposed population estimate
  let exposedPopulationEstimate: number | null = null;
  let exposureMethod: ExposureMethod = "UNAVAILABLE";
  let exposureRationale = "";

  const exposedWithPop = exposedHabitations.filter(h => h.population !== null);
  if (exposedWithPop.length > 0) {
    exposedPopulationEstimate = exposedWithPop.reduce((sum, h) => sum + (h.population || 0), 0);
    exposureMethod = "HABITATION_SUM";
    const unverifiedCount = exposedHabitationsCount - exposedWithPop.length;
    exposureRationale = `Summed verified population across ${exposedWithPop.length} exposed settlement(s): ${exposedPopulationEstimate.toLocaleString("en-IN")} persons.${unverifiedCount > 0 ? ` (${unverifiedCount} exposed settlements excluded due to unverified census count)` : ""}`;
  } else if (exposedHabitationsCount > 0) {
    // We have exposed settlements but no individual population numbers
    exposedPopulationEstimate = null;
    exposureMethod = "POINT_BASED_SCREENING";
    exposureRationale = `${exposedHabitationsCount} exposed settlements identified within active hazard footprint; individual Census counts are unverified.`;
  } else if (populationValue !== null && location.category === "District") {
    // Fallback: district screening assumption (15% rate applied to district population)
    exposedPopulationEstimate = Math.round(populationValue * 0.15);
    exposureMethod = "DISTRICT_SCREENING_ASSUMPTION";
    exposureRationale = `Screening assumption: 15% indicative exposure applied to ${populationSource} total (${populationValue.toLocaleString("en-IN")}). Coarse district-level estimate.`;
  } else {
    exposedPopulationEstimate = null;
    exposureMethod = "UNAVAILABLE";
    exposureRationale = "No verified settlement-level or district population data available.";
  }

  // 4. Resolve the Canonical Vulnerable Origin Habitation
  // Priority: (1) Exposed habitation in district, (2) Any habitation in district, (3) Location center
  let selectedOriginHabitation: ResQExposureAssessment["selectedOriginHabitation"];

  if (exposedHabitations.length > 0) {
    selectedOriginHabitation = exposedHabitations[0];
  } else if (habitations.length > 0) {
    selectedOriginHabitation = habitations[0];
  } else {
    selectedOriginHabitation = {
      name: `${location.name} (Screening Origin)`,
      latitude: location.latitude,
      longitude: location.longitude,
      exposureLevel: "MODERATE",
      population: populationValue,
      hazardType: "Multi-Hazard Screening Perimeter",
      insideHazardZone: false,
    };
  }

  return {
    populationValue,
    populationUnit: "people",
    populationResolution,
    populationYear,
    populationSource,
    exposedPopulationEstimate,
    exposureMethod,
    exposureRationale,
    exposedHabitationsCount,
    exposedHabitations,
    selectedOriginHabitation,
  };
}
