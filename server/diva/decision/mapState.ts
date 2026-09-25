/**
 * ResQ Decision Intelligence Engine V2 — Map State Synchronizer
 * 
 * Rules:
 * 1. Guarantees that Map and Decision Panels render the EXACT same canonical decision.
 * 2. Colors are derived directly from canonicalDecision.tier, never from separate frontend logic.
 * 3. Origin, Destination, Route geometry, and active layer keys are bundled in mapState.
 */

import type { ResQMapState } from "../../../shared/decisionEngine";
import type { ResQHazardAssessment } from "../../../shared/decisionEngine";
import type { ResQExposureAssessment } from "../../../shared/decisionEngine";
import type { ResQRelocationAssessment } from "../../../shared/decisionEngine";
import type { ResQRoutingAssessment } from "../../../shared/decisionEngine";

export function deriveMapState(
  hazard: ResQHazardAssessment,
  exposure: ResQExposureAssessment,
  relocation: ResQRelocationAssessment,
  routing: ResQRoutingAssessment
): ResQMapState {
  const tier = hazard.tier;

  // Canonical Hex Colors
  const tierColor =
    tier === "RED"
      ? "#dc2626"
      : tier === "ORANGE"
      ? "#ea580c"
      : tier === "GREEN"
      ? "#16a34a"
      : "#64748b";

  const originHab = exposure.selectedOriginHabitation;
  const originMarker = {
    coordinates: [originHab.longitude, originHab.latitude] as [number, number],
    label: originHab.name,
    exposureLevel: originHab.exposureLevel,
    population: originHab.population,
  };

  const bestCandidate = relocation.bestCandidate;
  const destinationMarker = bestCandidate
    ? {
        coordinates: [bestCandidate.longitude, bestCandidate.latitude] as [number, number],
        label: bestCandidate.name,
        role: bestCandidate.facilityRole,
        safetyStatus: relocation.destinationSafety.destinationSafetyStatus,
        capacity: bestCandidate.capacity,
      }
    : null;

  const route = routing.routeCoordinates.length > 0
    ? {
        coordinates: routing.routeCoordinates,
        distanceKm: routing.distanceKm,
        durationMinutes: routing.durationMinutes,
        isRoadRoute: routing.isRoadRoute,
        displayBadge: routing.displayBadge,
        status: routing.status,
      }
    : null;

  // Active layer keys based on hazards present
  const activeLayerKeys: string[] = ["boundaries", "terrain", "redZones", "routes", "exposedHabitations", "facilities", "gsiGeology", "gsiTectonics"];
  if (hazard.primaryHazard === "FLOOD" || hazard.secondaryHazards.includes("FLOOD")) {
    activeLayerKeys.push("floodPlains", "cwcGauges");
  }
  if (hazard.primaryHazard === "LANDSLIDE" || hazard.secondaryHazards.includes("LANDSLIDE")) {
    activeLayerKeys.push("landslideEvents");
  }
  if (hazard.primaryHazard === "RIVERBANK_EROSION" || hazard.secondaryHazards.includes("RIVERBANK_EROSION")) {
    activeLayerKeys.push("erosionCorridors");
  }
  if (hazard.primaryHazard === "SEISMIC" || hazard.secondaryHazards.includes("SEISMIC")) {
    activeLayerKeys.push("seismicOfficial");
  }

  const hazardSummary = `${tier} Zone — Primary: ${hazard.primaryHazard} (Score ${hazard.compositeHazardScore}/100)`;

  return {
    riskTier: tier,
    tierColor,
    primaryHazard: hazard.primaryHazard,
    secondaryHazards: hazard.secondaryHazards,
    compositeScore: hazard.compositeHazardScore,
    originMarker,
    destinationMarker,
    route,
    activeLayerKeys,
    hazardSummary,
  };
}
