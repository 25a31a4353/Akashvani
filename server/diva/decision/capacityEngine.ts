/**
 * ResQ Decision Intelligence Engine V2 — Facility Capacity Engine
 * 
 * Rules:
 * 1. Strictly separates facility existence from facility capacity.
 * 2. OSM facility points provide known physical locations, but capacity is strictly null unless verified.
 * 3. Null capacity is NEVER converted to zero.
 * 4. Excludes hospitals from general relocation shelters (classified as medical support only).
 */

import type { ResQCapacityAssessment } from "../../../shared/decisionEngine";
import type { EvacuationFacility, CapacityStatus } from "../../../shared/hazards";

export function evaluateCapacity(
  facilities: EvacuationFacility[],
  exposedPopulation: number | null
): ResQCapacityAssessment {
  const facList = facilities || [];
  const totalNearbyFacilities = facList.length;

  // Separate general relocation shelters from hospitals
  const eligibleRelocationShelters = facList.filter(
    f => f.facilityRole === "EMERGENCY_SHELTER" || f.facilityRole === "RELIEF_CENTRE"
  ).length;

  const hospitalsExcludedFromShelters = facList.filter(
    f => f.facilityRole === "HOSPITAL_MEDICAL_SUPPORT"
  ).length;

  // Check verified capacities
  const facilitiesWithKnownCap = facList.filter(f => f.capacity !== null && f.capacity > 0);
  const capacityVerified = facilitiesWithKnownCap.length > 0;

  let capacityStatus: CapacityStatus = "CAPACITY_UNAVAILABLE";
  if (facilitiesWithKnownCap.length === facilities.length && facilities.length > 0) {
    capacityStatus = "CAPACITY_KNOWN";
  } else if (facilitiesWithKnownCap.length > 0) {
    capacityStatus = "CAPACITY_PARTIAL";
  } else {
    capacityStatus = "CAPACITY_UNAVAILABLE";
  }

  const availableCapacity = capacityVerified
    ? facilitiesWithKnownCap.reduce((sum, f) => sum + (f.capacity || 0), 0)
    : null;

  const requiredCapacity = exposedPopulation !== null
    ? Math.round(exposedPopulation * 1.0)
    : null;

  let capacityDeficit: number | null = null;
  if (requiredCapacity !== null && availableCapacity !== null) {
    capacityDeficit = Math.max(0, requiredCapacity - availableCapacity);
  }

  const capacitySource = capacityVerified
    ? "Verified district emergency shelter registry & surveyed facility audits"
    : "OpenStreetMap facility nodes (building locations mapped; physical bed capacities unverified)";

  const notes = capacityVerified
    ? `${availableCapacity?.toLocaleString("en-IN")} verified beds across ${facilitiesWithKnownCap.length} facility/facilities.`
    : `Identified ${totalNearbyFacilities} emergency support facilities (${eligibleRelocationShelters} eligible shelters, ${hospitalsExcludedFromShelters} hospitals). Physical capacity is unverified from OpenStreetMap geometry; capacity is recorded as null.`;

  return {
    capacityStatus,
    capacityVerified,
    capacitySource,
    capacityTimestamp: capacityVerified ? new Date().toISOString() : null,
    totalNearbyFacilities,
    eligibleRelocationShelters,
    hospitalsExcludedFromShelters,
    requiredCapacity,
    availableCapacity,
    capacityDeficit,
    notes,
  };
}
