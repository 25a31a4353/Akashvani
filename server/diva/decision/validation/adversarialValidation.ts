/**
 * ResQ Decision Intelligence Engine V3.1 — Adversarial Validation Suite
 * 
 * Tests the decision engine against edge cases, counter-intuitive scenarios,
 * and deliberate adversarial assumptions to prove the engine makes evidence-based
 * decisions without simplistic heuristics or benchmark overfitting.
 */

import { computeCanonicalDecision } from "../pipeline";
import { buildMultiHazardProfile } from "../../hazards/engine";
import { selectSafeHaven } from "../safeHavenEngine";
import { evaluateRoadRoute } from "../routingEngine";
import type { EvacuationFacility } from "../../../../shared/hazards";

export interface AdversarialTestResult {
  category: "FLOOD" | "LANDSLIDE" | "SEISMIC" | "CYCLONE" | "GEOLOGY" | "POPULATION" | "FACILITY" | "ROUTING";
  name: string;
  description: string;
  passed: boolean;
  details: string;
}

export async function runAdversarialValidationSuite(): Promise<{
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  results: AdversarialTestResult[];
}> {
  const results: AdversarialTestResult[] = [];

  // =========================================================================
  // 1. FLOOD ADVERSARIAL TESTS
  // =========================================================================

  // Test 1.1: High elevation does NOT automatically make a location flood-safe if in a verified flood corridor (e.g. Sangli at 550m MSL)
  {
    const hpSangli = buildMultiHazardProfile({
      latitude: 16.85,
      longitude: 74.58,
      stateCode: "MH",
      district: "Sangli",
      elevationMeters: 550, // High elevation plateau
      slopeDegrees: 2,
    });
    const dec = await computeCanonicalDecision({
      location: {
        id: "adv-flood-high-elev",
        name: "Sangli Flood Corridor",
        displayName: "Sangli, Maharashtra",
        category: "City",
        latitude: 16.85,
        longitude: 74.58,
        population: 250000,
        populationSource: "Census",
        boundingBox: null,
        boundary: null,
        address: { state: "MH", city: "Sangli" },
        source: "Adversarial",
      },
      hazardProfile: hpSangli,
      evidenceCoverage: { availableCount: 7, totalCount: 8, coverageRatio: 0.88, label: "7/8", categories: [] },
    });
    const isFloodIdentified = dec.hazardAssessment.primaryHazard === "FLOOD" || dec.hazardAssessment.secondaryHazards.includes("FLOOD");
    const isElevatedTier = dec.hazardAssessment.tier === "RED" || dec.hazardAssessment.tier === "ORANGE";
    const passed = isFloodIdentified && isElevatedTier;
    results.push({
      category: "FLOOD",
      name: "High Elevation Verified Flood Corridor",
      description: "High elevation (550m) inside verified river basin flood plain must not be classified as LOW/GREEN purely due to elevation.",
      passed,
      details: `Tier: ${dec.hazardAssessment.tier}, Primary: ${dec.hazardAssessment.primaryHazard}`,
    });
  }

  // Test 1.2: River proximity alone without flood plain or low relief does NOT create critical flood risk
  {
    const hpMountainRiver = buildMultiHazardProfile({
      latitude: 31.10,
      longitude: 77.17, // Shimla mountain ridge
      stateCode: "HP",
      district: "Shimla",
      elevationMeters: 2200,
      slopeDegrees: 35,
    });
    const dec = await computeCanonicalDecision({
      location: {
        id: "adv-mountain-ridge",
        name: "Shimla Ridge",
        displayName: "Shimla, Himachal Pradesh",
        category: "City",
        latitude: 31.10,
        longitude: 77.17,
        population: 170000,
        populationSource: "Census",
        boundingBox: null,
        boundary: null,
        address: { state: "HP" },
        source: "Adversarial",
      },
      hazardProfile: hpMountainRiver,
      evidenceCoverage: { availableCount: 7, totalCount: 8, coverageRatio: 0.88, label: "7/8", categories: [] },
    });
    // On a 35° mountain ridge, primary hazard should be Landslide/Seismic, not Flood
    const passed = dec.hazardAssessment.primaryHazard !== "FLOOD";
    results.push({
      category: "FLOOD",
      name: "Mountain Ridge Non-Flood Discrimination",
      description: "Steep mountain ridge (35° slope, 2200m elevation) must not evaluate to primary FLOOD hazard.",
      passed,
      details: `Primary hazard: ${dec.hazardAssessment.primaryHazard}, Flood status: ${hpMountainRiver.flood.status}`,
    });
  }

  // Test 1.3: Absence of evidence must NOT become GREEN/SAFE
  {
    const hpSparse = buildMultiHazardProfile({ latitude: 22.0, longitude: 80.0, stateCode: "MP" });
    const decEmpty = await computeCanonicalDecision({
      location: {
        id: "adv-missing-data",
        name: "Unsurveyed Location",
        displayName: "Unsurveyed Remote Point",
        category: "Place",
        latitude: 22.0,
        longitude: 80.0,
        population: null,
        populationSource: "UNAVAILABLE",
        boundingBox: null,
        boundary: null,
        address: { state: "MP" },
        source: "Adversarial",
      },
      hazardProfile: hpSparse,
      evidenceCoverage: { availableCount: 2, totalCount: 8, coverageRatio: 0.25, label: "2/8 categories available", categories: [] },
    });
    // With 25% coverage, confidence must be LOW and population must remain null
    const passed = decEmpty.confidence.level === "LOW" && decEmpty.exposureAssessment.populationValue === null;
    results.push({
      category: "FLOOD",
      name: "Sparse Data Confidence Degradation",
      description: "When evidence coverage is sparse (25%), confidence level must degrade to LOW and missing data must not turn into fake population.",
      passed,
      details: `Confidence: ${decEmpty.confidence.level}, Score: ${decEmpty.confidence.score}, Population: ${decEmpty.exposureAssessment.populationValue}`,
    });
  }

  // =========================================================================
  // 2. LANDSLIDE ADVERSARIAL TESTS
  // =========================================================================

  // Test 2.1: Steep terrain alone in a non-landslide shield craton does NOT trigger CRITICAL landslide without regional susceptibility/events
  {
    const hpShieldEscarpment = buildMultiHazardProfile({
      latitude: 13.0,
      longitude: 78.5, // Stable Deccan shield quarry/escarpment
      stateCode: "KA",
      district: "Kolar",
      elevationMeters: 800,
      slopeDegrees: 28,
    });
    const passed = hpShieldEscarpment.landslide.status !== "CRITICAL";
    results.push({
      category: "LANDSLIDE",
      name: "Steep Terrain Non-Himalayan Shield Discrimination",
      description: "Localized steep slope (28°) in stable shield (Kolar) without ISRO hilly ranking must not become CRITICAL landslide.",
      passed,
      details: `Landslide status: ${hpShieldEscarpment.landslide.status}, Susceptibility: ${hpShieldEscarpment.landslide.susceptibilityClass}`,
    });
  }

  // Test 2.2: GSI susceptibility is distinct from observed landslide events
  {
    const hpWayanad = buildMultiHazardProfile({
      latitude: 11.5385,
      longitude: 76.1825, // Chooralmala ground zero
      stateCode: "KL",
      district: "Wayanad",
      slopeDegrees: 28,
      elevationMeters: 920,
    });
    const hasEvent = hpWayanad.landslide.nearestEvent !== null && (hpWayanad.landslide.nearestEvent.distanceKm ?? 99) <= 2;
    const isCritical = hpWayanad.landslide.status === "CRITICAL";
    const passed = hasEvent && isCritical;
    results.push({
      category: "LANDSLIDE",
      name: "Observed Landslide Ground-Zero Proximity Recognition",
      description: "Within 2km of documented catastrophic event (Chooralmala 2024), observed event evidence is explicitly captured.",
      passed,
      details: `Nearest event: ${hpWayanad.landslide.nearestEvent?.name} (${hpWayanad.landslide.nearestEvent?.distanceKm} km)`,
    });
  }

  // =========================================================================
  // 3. SEISMIC ADVERSARIAL TESTS
  // =========================================================================

  // Test 3.1: BIS Seismic Zone is labeled as regulatory engineering baseline, not an active earthquake rupture
  {
    const hpAssam = buildMultiHazardProfile({
      latitude: 26.18,
      longitude: 91.74,
      stateCode: "AS",
      district: "Kamrup",
    });
    const isZoneV = hpAssam.seismic.zone === "ZONE_V";
    const isRegulatory = hpAssam.seismic.regulatoryStatus === "OFFICIAL_REGULATORY_BASELINE";
    const passed = isZoneV && isRegulatory;
    results.push({
      category: "SEISMIC",
      name: "BIS Seismic Regulatory Baseline Semantics",
      description: "BIS Zone V must be clearly identified as an official regulatory engineering baseline, not an active rupture event.",
      passed,
      details: `Zone: ${hpAssam.seismic.zone}, RegulatoryStatus: ${hpAssam.seismic.regulatoryStatus}`,
    });
  }

  // =========================================================================
  // 4. CYCLONE ADVERSARIAL TESTS
  // =========================================================================

  // Test 4.1: Coastal location alone without low elevation or active track does NOT trigger CRITICAL cyclone
  {
    const hpHighCoast = buildMultiHazardProfile({
      latitude: 17.75,
      longitude: 83.35,
      stateCode: "AP",
      district: "Visakhapatnam",
      elevationMeters: 180, // High coastal hill (Kailasagiri)
      isCoastalState: true,
    });
    const isNotCritical = hpHighCoast.cyclone.status !== "CRITICAL";
    const passed = isNotCritical;
    results.push({
      category: "CYCLONE",
      name: "Elevated Coastal Headland Non-Surge Discrimination",
      description: "High elevation coastal ridge (180m MSL) must not receive CRITICAL cyclone surge status.",
      passed,
      details: `Cyclone status: ${hpHighCoast.cyclone.status}, Elevation: ${hpHighCoast.cyclone.elevationMeters}m`,
    });
  }

  // =========================================================================
  // 5. POPULATION ADVERSARIAL TESTS
  // =========================================================================

  // Test 5.1: Missing / unavailable population remains strictly null and is never coerced to 0
  {
    const decNullPop = await computeCanonicalDecision({
      location: {
        id: "adv-null-pop",
        name: "Remote Forest Hamlet",
        displayName: "Remote Forest Hamlet, India",
        category: "Place",
        latitude: 20.5,
        longitude: 82.0,
        population: null,
        populationSource: "UNAVAILABLE",
        boundingBox: null,
        boundary: null,
        address: { state: "CT" },
        source: "Adversarial",
      },
      hazardProfile: buildMultiHazardProfile({ latitude: 20.5, longitude: 82.0, stateCode: "CT" }),
      evidenceCoverage: { availableCount: 6, totalCount: 8, coverageRatio: 0.75, label: "6/8", categories: [] },
    });
    const passed = decNullPop.exposureAssessment.populationValue === null &&
      (decNullPop.exposureAssessment.populationResolution === "Unavailable" || decNullPop.exposureAssessment.exposureMethod === "UNAVAILABLE");
    results.push({
      category: "POPULATION",
      name: "Strict Null Population Semantics",
      description: "When population is unverified, populationValue must remain null and population resolution must be Unavailable (never 0 or LOW).",
      passed,
      details: `populationValue: ${decNullPop.exposureAssessment.populationValue}, resolution: ${decNullPop.exposureAssessment.populationResolution}, method: ${decNullPop.exposureAssessment.exposureMethod}`,
    });
  }

  // =========================================================================
  // 6. FACILITY & DESTINATION SAFETY ADVERSARIAL TESTS
  // =========================================================================

  // Test 6.1: Hospital must NEVER be selected as a general mass evacuation shelter
  {
    const mockFacilities: EvacuationFacility[] = [
      {
        facilityId: "FAC-HOSP-01",
        name: "Apex Super Specialty Hospital",
        facilityRole: "HOSPITAL_MEDICAL_SUPPORT",
        relocationSuitability: "PREFERRED",
        latitude: 11.70,
        longitude: 76.15,
        straightLineDistanceKm: 2.5,
        capacity: 300,
        capacitySource: "OSM",
        capacityConfidence: "MEDIUM",
        facilityHazardTier: "LOW",
        facilityHazardScore: 10,
        hazardScreeningNote: "Clear of hazards",
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Road connected",
        provenance: "OSM Healthcare",
        source: "OSM",
        lastUpdated: null,
      },
      {
        facilityId: "FAC-SHELTER-01",
        name: "District Community High School",
        facilityRole: "SCHOOL_EVACUATION_SUPPORT",
        relocationSuitability: "PREFERRED",
        latitude: 11.72,
        longitude: 76.17,
        straightLineDistanceKm: 4.8,
        capacity: 1200,
        capacitySource: "OSM",
        capacityConfidence: "MEDIUM",
        facilityHazardTier: "LOW",
        facilityHazardScore: 12,
        hazardScreeningNote: "Clear of hazards",
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Road connected",
        provenance: "OSM Education",
        source: "OSM",
        lastUpdated: null,
      },
    ];
    const assessment = selectSafeHaven(mockFacilities, "CRITICAL");
    const passed = assessment.bestCandidate?.facilityId === "FAC-SHELTER-01" &&
      assessment.bestCandidate?.facilityRole !== "HOSPITAL_MEDICAL_SUPPORT";
    results.push({
      category: "FACILITY",
      name: "Hospital Role Exclusion for Mass Evacuation",
      description: "Even when hospital is geographically closer (2.5 km vs 4.8 km), general shelter role must select community/school shelter.",
      passed,
      details: `Selected: ${assessment.bestCandidate?.name} (${assessment.bestCandidate?.facilityRole})`,
    });
  }

  // Test 6.2: Facility inside an active RED hazard zone must be rejected as UNSAFE
  {
    const mockFacilitiesWithHazard: EvacuationFacility[] = [
      {
        facilityId: "FAC-FLOOD-SHELTER",
        name: "Riverbank Relief Shed (Inside Flood Plain)",
        facilityRole: "EMERGENCY_SHELTER",
        relocationSuitability: "UNSUITABLE",
        latitude: 27.48,
        longitude: 94.92,
        straightLineDistanceKm: 1.2,
        capacity: 500,
        capacitySource: "OSM",
        capacityConfidence: "LOW",
        facilityHazardTier: "RED", // Inside hazard zone
        facilityHazardScore: 85,
        hazardScreeningNote: "Inside active flood zone",
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Inundated access",
        provenance: "OSM Emergency",
        source: "OSM",
        lastUpdated: null,
      },
      {
        facilityId: "FAC-SAFE-SHELTER",
        name: "Higher Ground Multi-Purpose Shelter",
        facilityRole: "EMERGENCY_SHELTER",
        relocationSuitability: "PREFERRED",
        latitude: 27.52,
        longitude: 95.05,
        straightLineDistanceKm: 14.5,
        capacity: 2500,
        capacitySource: "ASDMA Verified",
        capacityConfidence: "HIGH",
        facilityHazardTier: "LOW",
        facilityHazardScore: 15,
        hazardScreeningNote: "Clear of hazards, safe zone",
        distanceType: "STRAIGHT_LINE",
        estimatedTravelTimeMinutes: null,
        accessibilityNote: "Paved highway access",
        provenance: "ASDMA Shelter Database",
        source: "ASDMA",
        lastUpdated: "2026-06-01",
      },
    ];
    const assessment = selectSafeHaven(mockFacilitiesWithHazard, "CRITICAL");
    const passed = assessment.bestCandidate?.facilityId === "FAC-SAFE-SHELTER" &&
      assessment.destinationSafety.destinationSafetyStatus === "SAFE" &&
      assessment.facilitiesWithHazardConflict.some(f => f.facilityId === "FAC-FLOOD-SHELTER");
    results.push({
      category: "FACILITY",
      name: "Hazard Conflict Destination Safety Gating",
      description: "Facility inside RED hazard zone must be flagged as conflict and rejected in favor of verified safe facility on higher ground.",
      passed,
      details: `BestCandidate: ${assessment.bestCandidate?.name}, HazardConflicts: ${assessment.facilitiesWithHazardConflict.length}`,
    });
  }

  // =========================================================================
  // 7. ROUTING ADVERSARIAL TESTS
  // =========================================================================

  // Test 7.1: Straight-line fallback is NEVER presented as a road route
  {
    const origin = { name: "Remote Village", latitude: 28.5, longitude: 96.0 };
    const destination = { name: "Safe Haven", latitude: 28.7, longitude: 96.2, role: "Shelter" };
    // evaluateRoadRoute with remote/offline points triggers fallback
    const routing = await evaluateRoadRoute(origin, destination);
    const passed = routing.isRoadRoute === false || routing.status === "ROAD_ROUTE_VERIFIED";
    // If fallback, isRoadRoute MUST be false and displayBadge must indicate fallback
    const fallbackCorrect = routing.isRoadRoute ? true : (routing.displayBadge.includes("NOT A ROAD ROUTE") || routing.status === "DIRECT_DISTANCE_FALLBACK");
    results.push({
      category: "ROUTING",
      name: "Strict Non-Road Route Disclaimers on Fallback",
      description: "When road routing is unavailable, direct distance fallback must set isRoadRoute=false and clearly state it is not a road route.",
      passed: passed && fallbackCorrect,
      details: `Status: ${routing.status}, isRoadRoute: ${routing.isRoadRoute}, Badge: ${routing.displayBadge}`,
    });
  }

  // Test 7.2: Unsafe destination does NOT receive an actionable evacuation route
  {
    const routingNoDest = await evaluateRoadRoute(
      { name: "Origin Town", latitude: 12.0, longitude: 76.0 },
      null // No safe destination validated
    );
    const passed = routingNoDest.status === "ROAD_ROUTING_UNAVAILABLE" &&
      routingNoDest.routeCoordinates.length === 0 &&
      routingNoDest.isRoadRoute === false;
    results.push({
      category: "ROUTING",
      name: "No-Destination Routing Gating",
      description: "When no valid safe destination is selected, routing status must be ROAD_ROUTING_UNAVAILABLE with empty coordinates.",
      passed,
      details: `Status: ${routingNoDest.status}, Coordinates count: ${routingNoDest.routeCoordinates.length}`,
    });
  }

  const passedTests = results.filter(r => r.passed).length;
  const allPassed = passedTests === results.length;

  return {
    allPassed,
    totalTests: results.length,
    passedTests,
    results,
  };
}
