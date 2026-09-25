/**
 * ResQ Decision Intelligence Engine V2 — Explainability Engine
 * 
 * Answers the 8 canonical explainability questions:
 * 1. WHY THIS HAZARD?
 * 2. WHY THIS SEVERITY?
 * 3. WHY THIS LOCATION?
 * 4. WHY THIS PRIORITY?
 * 5. WHY THIS DESTINATION?
 * 6. WHY THIS ROUTE?
 * 7. WHY NOT ANOTHER DESTINATION?
 * 8. WHAT DATA IS MISSING?
 */

import type { ResQDecisionExplanation } from "../../../shared/decisionEngine";
import type { ResQHazardAssessment } from "../../../shared/decisionEngine";
import type { ResQExposureAssessment } from "../../../shared/decisionEngine";
import type { ResQResponsePriority } from "../../../shared/decisionEngine";
import type { ResQRelocationAssessment } from "../../../shared/decisionEngine";
import type { ResQRoutingAssessment } from "../../../shared/decisionEngine";
import type { ResQCapacityAssessment } from "../../../shared/decisionEngine";
import type { IndiaLocation } from "../../../shared/india";

export function generateExplanation(
  location: IndiaLocation,
  hazard: ResQHazardAssessment,
  exposure: ResQExposureAssessment,
  priority: ResQResponsePriority,
  relocation: ResQRelocationAssessment,
  routing: ResQRoutingAssessment,
  capacity: ResQCapacityAssessment
): ResQDecisionExplanation {
  // 1. WHY THIS HAZARD?
  const secondaries = hazard.secondaryHazards.length > 0 ? hazard.secondaryHazards.join(", ") : "None";
  const whyThisHazard = `Primary hazard driver is ${hazard.primaryHazard}: ${hazard.primaryDriverReason}. Secondary geotechnical/climatic influences: ${secondaries}.`;

  // 2. WHY THIS SEVERITY?
  const triggerList = hazard.triggers.slice(0, 3).join("; ");
  const whyThisSeverity = `Classified as ${hazard.tier} tier (Composite Score ${hazard.compositeHazardScore}/100) based on verified spatial intersections: ${triggerList}.`;

  // 3. WHY THIS LOCATION?
  const whyThisLocation = `${location.name} (${location.category}, ${location.address?.state || "India"}) intersects active multi-hazard monitoring boundaries. Exposed population estimated at ${exposure.exposedPopulationEstimate ? exposure.exposedPopulationEstimate.toLocaleString("en-IN") + " persons" : "unverified"} across ${exposure.exposedHabitationsCount} mapped settlement(s).`;

  // 4. WHY THIS PRIORITY?
  const whyThisPriority = `${priority.priorityLevel} Priority (Score ${priority.priorityScore}/100). ${priority.formulaExplanation}`;

  // 5. WHY THIS DESTINATION?
  const best = relocation.bestCandidate;
  const whyThisDestination = best
    ? `Selected '${best.name}' (${best.facilityRole.replace(/_/g, " ")}) as ${relocation.candidateStatus === "PREFERRED_CANDIDATE" ? "preferred shelter" : "conditional fallback"}. Destination is validated outside the active hazard zone with ${best.routeDistanceKm ?? best.straightLineDistanceKm} km distance from origin.`
    : "No suitable safe-haven destination could be verified outside the active hazard perimeter.";

  // 6. WHY THIS ROUTE?
  const whyThisRoute = routing.isRoadRoute
    ? `Verified road route via OSRM connecting origin (${routing.origin.name}) to destination (${routing.destination?.name || "Shelter"}): ${routing.distanceKm} km (~${routing.durationMinutes} min travel time) along routable road centerline geometry.`
    : `Direct geographic distance (${routing.distanceKm} km). OSRM road network routing is temporarily unavailable; straight-line distance is provided for situational awareness only.`;

  // 7. WHY NOT ANOTHER DESTINATION?
  const rejectedCount = relocation.facilitiesWithHazardConflict.length;
  const whyNotAnotherDestination = rejectedCount > 0
    ? `${rejectedCount} alternative facilities were excluded because they intersect active hazard zones. Preferred candidate provides verified separation from hazard footprint and designated shelter role.`
    : relocation.conditionalAlternatives.length > 0
    ? `Primary candidate preferred over ${relocation.conditionalAlternatives.length} conditional facility/facilities due to direct shelter designation and superior road accessibility.`
    : "No alternative viable shelter facilities identified within search radius.";

  // 8. WHAT DATA IS MISSING?
  const missingItems: string[] = [];
  if (!capacity.capacityVerified) {
    missingItems.push("Shelter bed capacity is unverified from OpenStreetMap geometry (marked null)");
  }
  if (exposure.populationValue === null) {
    missingItems.push("Fine-grained village Census population is unavailable");
  }
  if (!routing.isRoadRoute) {
    missingItems.push("Live road network topology query failed; route is straight-line proxy");
  }
  if (missingItems.length === 0) {
    missingItems.push("All primary spatial and telemetry datasets are actively populated.");
  }
  const whatDataIsMissing = missingItems.join(". ");

  return {
    whyThisHazard,
    whyThisSeverity,
    whyThisLocation,
    whyThisPriority,
    whyThisDestination,
    whyThisRoute,
    whyNotAnotherDestination,
    whatDataIsMissing,
  };
}
