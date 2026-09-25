/**
 * ResQ Decision Intelligence Engine V2 — Safe-Haven Selection & Destination Safety Engine
 * 
 * Rules:
 * 1. DESTINATION SAFETY VALIDATION: Verifies that the destination facility itself
 *    is NOT located inside an active hazard footprint (e.g. flood corridor, steep landslide slope).
 * 2. Role Gating: Excludes hospitals from general relocation shelters (medical support only).
 * 3. Never chooses a destination merely because it is geographically nearest.
 * 4. Deterministic Tie-Breaking (Section 43):
 *    (1) Safety status
 *    (2) Verified capacity
 *    (3) Road travel time
 *    (4) Road distance
 *    (5) Facility suitability
 *    (6) Stable facility ID
 */

import type {
  ResQRelocationAssessment,
  DestinationSafetyCheck,
} from "../../../shared/decisionEngine";
import type {
  EvacuationFacility,
  CandidateStatus,
  RelocationSuitability,
  RedZoneTier,
} from "../../../shared/hazards";
import { RELOCATION_ELIGIBLE_ROLES, RELOCATION_CONDITIONAL_ROLES } from "../../../shared/hazards";

export function selectSafeHaven(
  facilities: EvacuationFacility[],
  originHazardLevel: string = "CRITICAL"
): ResQRelocationAssessment {
  if (!facilities || facilities.length === 0) {
    const defaultCheck: DestinationSafetyCheck = {
      destinationName: "No Facilities Found",
      destinationInsideHazard: false,
      destinationHazardTier: "UNSCREENED",
      destinationHazardScore: null,
      destinationSafetyStatus: "UNKNOWN",
      checkDetails: "No nearby emergency facilities discovered within search radius.",
    };

    return {
      candidateStatus: "NO_CANDIDATE",
      bestCandidate: null,
      destinationSafety: defaultCheck,
      conditionalAlternatives: [],
      facilitiesWithHazardConflict: [],
      nearestFacilities: [],
      rationale: "No emergency facilities mapped within search perimeter.",
    };
  }

  // 1. Filter out hospitals from general shelter consideration
  const nonHospitalFacilities = facilities.filter(
    f => f.facilityRole !== "HOSPITAL_MEDICAL_SUPPORT"
  );

  // 2. Identify facilities with hazard conflicts (unsuitable because inside hazard zone)
  const facilitiesWithHazardConflict = nonHospitalFacilities.filter(
    f => f.relocationSuitability === "UNSUITABLE" || f.facilityHazardTier === "RED"
  );

  // 3. Partition into PREFERRED candidates vs CONDITIONAL fallbacks
  const preferredCandidates = nonHospitalFacilities.filter(
    f =>
      f.relocationSuitability === "PREFERRED" &&
      RELOCATION_ELIGIBLE_ROLES.includes(f.facilityRole) &&
      f.facilityHazardTier !== "RED"
  );

  const conditionalAlternatives = nonHospitalFacilities.filter(
    f =>
      (f.relocationSuitability === "CONDITIONAL" ||
        RELOCATION_CONDITIONAL_ROLES.includes(f.facilityRole)) &&
      f.facilityHazardTier !== "RED" &&
      f.relocationSuitability !== "UNSUITABLE"
  );

  // 4. Deterministic sorting with multi-criteria tie-breaking (Section 43)
  const sortCandidates = (a: EvacuationFacility, b: EvacuationFacility): number => {
    // 1. Safety status: PREFERRED over CONDITIONAL
    const suitScore = (s: RelocationSuitability) => s === "PREFERRED" ? 2 : s === "CONDITIONAL" ? 1 : 0;
    const suitDiff = suitScore(b.relocationSuitability) - suitScore(a.relocationSuitability);
    if (suitDiff !== 0) return suitDiff;

    // 2. Verified capacity: higher capacity first
    const capA = a.capacity ?? 0;
    const capB = b.capacity ?? 0;
    if (capA !== capB) return capB - capA;

    // 3. Travel time: lower travel time first (if routing available)
    if (a.estimatedTravelTimeMinutes != null && b.estimatedTravelTimeMinutes != null) {
      if (a.estimatedTravelTimeMinutes !== b.estimatedTravelTimeMinutes) {
        return a.estimatedTravelTimeMinutes - b.estimatedTravelTimeMinutes;
      }
    }

    // 4. Road / straight-line distance: closer first
    const distA = a.routeDistanceKm ?? a.straightLineDistanceKm;
    const distB = b.routeDistanceKm ?? b.straightLineDistanceKm;
    if (distA !== distB) return distA - distB;

    // 5. Facility role: EMERGENCY_SHELTER over RELIEF_CENTRE over SCHOOL
    const roleScore = (r: string) => r === "EMERGENCY_SHELTER" ? 3 : r === "RELIEF_CENTRE" ? 2 : 1;
    const roleDiff = roleScore(b.facilityRole) - roleScore(a.facilityRole);
    if (roleDiff !== 0) return roleDiff;

    // 6. Stable facility ID tie-breaker
    return a.facilityId.localeCompare(b.facilityId);
  };

  preferredCandidates.sort(sortCandidates);
  conditionalAlternatives.sort(sortCandidates);

  let bestCandidate: EvacuationFacility | null = null;
  let candidateStatus: CandidateStatus = "NO_CANDIDATE";

  if (preferredCandidates.length > 0) {
    bestCandidate = preferredCandidates[0];
    candidateStatus = "PREFERRED_CANDIDATE";
  } else if (conditionalAlternatives.length > 0) {
    bestCandidate = conditionalAlternatives[0];
    candidateStatus = "CONDITIONAL_FALLBACK";
  } else if (nonHospitalFacilities.length > 0) {
    candidateStatus = "NO_PREFERRED_CANDIDATE";
  } else {
    candidateStatus = "NO_CANDIDATE";
  }

  // 5. Build Destination Safety Validation Report
  let destinationSafety: DestinationSafetyCheck;
  if (bestCandidate) {
    const isInsideHazard = bestCandidate.facilityHazardTier === "RED" || bestCandidate.relocationSuitability === "UNSUITABLE";
    const safetyStatus: DestinationSafetyCheck["destinationSafetyStatus"] = isInsideHazard
      ? "UNSAFE"
      : bestCandidate.relocationSuitability === "PREFERRED"
      ? "SAFE"
      : bestCandidate.relocationSuitability === "CONDITIONAL"
      ? "CONDITIONAL"
      : "UNKNOWN";

    const checkDetails = safetyStatus === "SAFE"
      ? `Validated safe: Facility '${bestCandidate.name}' is outside active ${originHazardLevel} hazard footprints and designated for emergency evacuation.`
      : safetyStatus === "CONDITIONAL"
      ? `Conditional safety: Facility '${bestCandidate.name}' is outside primary hazard zone but has partial data or auxiliary role (${bestCandidate.facilityRole}).`
      : `SAFETY CONFLICT: Facility '${bestCandidate.name}' intersects active hazard zone and cannot be used for safe evacuation.`;

    destinationSafety = {
      destinationName: bestCandidate.name,
      destinationInsideHazard: isInsideHazard,
      destinationHazardTier: bestCandidate.facilityHazardTier,
      destinationHazardScore: bestCandidate.facilityHazardScore,
      destinationSafetyStatus: safetyStatus,
      checkDetails,
    };
  } else {
    destinationSafety = {
      destinationName: "None Selected",
      destinationInsideHazard: false,
      destinationHazardTier: "UNSCREENED",
      destinationHazardScore: null,
      destinationSafetyStatus: "UNKNOWN",
      checkDetails: "No eligible emergency shelters found meeting safety and role criteria.",
    };
  }

  const rationale = bestCandidate
    ? `Selected '${bestCandidate.name}' (${bestCandidate.facilityRole.replace(/_/g, " ")}) as ${candidateStatus === "PREFERRED_CANDIDATE" ? "preferred safe haven" : "conditional fallback"}. Destination validated outside active hazard zone; ${bestCandidate.routeDistanceKm ?? bestCandidate.straightLineDistanceKm} km from origin.`
    : "No suitable safe-haven destination could be verified outside the active hazard zone.";

  return {
    candidateStatus,
    bestCandidate,
    destinationSafety,
    conditionalAlternatives,
    facilitiesWithHazardConflict,
    nearestFacilities: facilities.slice(0, 5),
    rationale,
  };
}
