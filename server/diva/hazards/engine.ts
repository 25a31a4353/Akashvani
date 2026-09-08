/**
 * Akashvani Phase 3.2B — Multi-Hazard Intelligence & Red-Zone Engine
 * 
 * Core PS 191 Pipeline:
 * HAZARD EVIDENCE → HAZARD EXPOSURE → RED ZONE IDENTIFICATION → HABITATION EXPOSURE
 * 
 * Invariants:
 * 1. Missing data is never converted to zero risk.
 * 2. Habitation population is strictly null when unverified.
 * 3. All outputs retain clear provenance and explainability.
 */

import type {
  HabitationExposure,
  HazardLevel,
  HazardObservation,
  HazardType,
  MultiHazardProfile,
  RedZoneAssessment,
  RedZoneTier,
} from "../../../shared/hazards";
import type { DataProvenance } from "../../../shared/multiState";
import { getStateByCode, getStateByName } from "../../../shared/india";

import {
  CWC_GAUGE_STATIONS,
  CWC_PROVENANCE,
  HISTORICAL_FLOOD_POLYGONS,
  resolveFloodExposure,
} from "./data/cwcHydrology";
import {
  HISTORICAL_LANDSLIDE_EVENTS,
  ISRO_DISTRICT_RANKINGS,
  LANDSLIDE_ATLAS_PROVENANCE,
  LANDSLIDE_EVENT_PROVENANCE,
  resolveLandslideExposure,
} from "./data/landslideAtlas";
import {
  CYCLONE_PROVENANCE,
  HISTORICAL_CYCLONE_TRACKS,
  resolveCycloneExposure,
} from "./data/cycloneTracks";
import {
  SEISMIC_PROVENANCE,
  SEISMIC_ZONE_POLYGONS,
  resolveSeismicExposure,
} from "./data/seismicZones";
import {
  ACTIVE_EROSION_CORRIDORS,
  DROUGHT_PROVENANCE,
  EROSION_PROVENANCE,
  HEAT_PROVENANCE,
  RAINFALL_PROVENANCE,
  resolveDroughtExposure,
  resolveExtremeHeatExposure,
  resolveExtremeRainfallExposure,
  resolveRiverbankErosionExposure,
} from "./data/coastalErosionDrought";
import {
  TARGET_STATE_HABITATIONS,
  type HabitationRecord,
} from "./data/habitations";
import { getFacilityMapLayer } from "./facilityDiscovery";
import { classifyHabitationExposure } from "./spatialExposure";

export {
  resolveSeismicExposure,
  resolveLandslideExposure,
  resolveFloodExposure,
  resolveCycloneExposure,
  resolveRiverbankErosionExposure,
  resolveDroughtExposure,
  resolveExtremeHeatExposure,
  resolveExtremeRainfallExposure,
  SEISMIC_ZONE_POLYGONS,
  HISTORICAL_LANDSLIDE_EVENTS,
  ISRO_DISTRICT_RANKINGS,
  CWC_GAUGE_STATIONS,
  HISTORICAL_FLOOD_POLYGONS,
  HISTORICAL_CYCLONE_TRACKS,
  ACTIVE_EROSION_CORRIDORS,
  TARGET_STATE_HABITATIONS,
};


function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

const RED_ZONE_PROVENANCE: DataProvenance = {
  sourceName: "Akashvani Spatial Multi-Hazard Red-Zone Engine (PS 191)",
  sourceUrl: "https://github.com/Akashvani-Platform/Akashvani",
  sourceType: "DERIVED",
  observedAt: new Date().toISOString(),
  spatialResolution: "Evidence-backed spatial exposure intersection (10m–500m criteria)",
  temporalCoverage: "Multi-source verified historical baselines & live monitoring feeds",
  confidence: "HIGH",
  provenanceLabel: "Akashvani multi-hazard evidence-backed red zone screening",
};

/**
 * Determine Red-Zone Status from Empirical Hazard Evidence
 */
export function evaluateRedZone(
  flood: ReturnType<typeof resolveFloodExposure>,
  landslide: ReturnType<typeof resolveLandslideExposure>,
  cyclone: ReturnType<typeof resolveCycloneExposure>,
  seismic: ReturnType<typeof resolveSeismicExposure>,
  erosion: ReturnType<typeof resolveRiverbankErosionExposure>,
  rainfall: ReturnType<typeof resolveExtremeRainfallExposure>,
  heat: ReturnType<typeof resolveExtremeHeatExposure>,
  drought: ReturnType<typeof resolveDroughtExposure>
): RedZoneAssessment {
  const triggers: string[] = [];
  let score = 20; // Baseline low risk score
  const hazardContributions: Array<{ hazard: HazardType; score: number; reason: string; trigger: string }> = [];

  // 1. Flood Criteria
  if (flood.status === "CRITICAL") {
    score += 55;
    const trigger = "[HISTORICAL_FLOODPLAIN] Critical Flood Hazard: Located inside annual riverine flood inundation corridor with low elevation";
    triggers.push(trigger);
    hazardContributions.push({ hazard: "FLOOD", score: 55, reason: "Located inside annual riverine flood inundation corridor and CWC flood watch network", trigger });
  } else if (flood.status === "HIGH") {
    score += 35;
    const trigger = "[HISTORICAL_FLOODPLAIN] High Flood Risk: Inside multi-year flood plain or within 15 km of river gauge with low terrain relief";
    triggers.push(trigger);
    hazardContributions.push({ hazard: "FLOOD", score: 35, reason: "Inside multi-year flood plain or proximal to monitored CWC river gauge", trigger });
  } else if (flood.status === "MODERATE") {
    score += 18;
    triggers.push("Moderate Flood Exposure: Regional floodplain buffer");
    hazardContributions.push({ hazard: "FLOOD", score: 18, reason: "Regional riverine floodplain buffer", trigger: "Moderate Flood Exposure: Regional floodplain buffer" });
  }

  // 2. Landslide Criteria
  if (landslide.status === "CRITICAL") {
    score += 60;
    const trigger = `[CRITICAL_LANDSLIDE_HAZARD] Critical Landslide Hazard: Steep slope (${landslide.slopeDegrees ?? "—"}°) in high-vulnerability hill zone`;
    if (landslide.nearestEvent && (landslide.nearestEvent.distanceKm ?? 999) <= 12) {
      triggers.push(`[HISTORICAL_LANDSLIDE_IMPACT] Landslide ground zero: within ${landslide.nearestEvent.distanceKm} km of catastrophic event (${landslide.nearestEvent.name})`);
    }
    if (landslide.districtRank && landslide.districtRank <= 15) {
      triggers.push(`[ISRO_LANDSLIDE_RANK_TOP15] ISRO Landslide Atlas Rank #${landslide.districtRank}/147 in India`);
    }
    triggers.push(trigger);
    hazardContributions.push({ hazard: "LANDSLIDE", score: 60, reason: `Steep slope (${landslide.slopeDegrees ?? "—"}°) and ISRO Landslide Atlas Rank #${landslide.districtRank ?? "—"}/147`, trigger });
  } else if (landslide.status === "HIGH") {
    score += 40;
    const trigger = `[HIGH_LANDSLIDE_HAZARD] High Landslide Susceptibility: ISRO ${landslide.susceptibilityClass} tier or slope >= 25°`;
    if (landslide.districtRank && landslide.districtRank <= 15) {
      triggers.push(`[ISRO_LANDSLIDE_RANK_TOP15] ISRO Landslide Atlas Rank #${landslide.districtRank}/147`);
    }
    triggers.push(trigger);
    hazardContributions.push({ hazard: "LANDSLIDE", score: 40, reason: `ISRO high susceptibility tier and slope >= 25°`, trigger });
  } else if (landslide.status === "MODERATE") {
    score += 15;
    triggers.push("Moderate Landslide Exposure: Hilly terrain buffer");
    hazardContributions.push({ hazard: "LANDSLIDE", score: 15, reason: "Hilly terrain buffer", trigger: "Moderate Landslide Exposure: Hilly terrain buffer" });
  }

  // 3. Riverbank Erosion Criteria (Dedicated Layer)
  if (erosion.status === "CRITICAL") {
    score += 50;
    const trigger = `[ACTIVE_EROSION_CORRIDOR] Critical Riverbank Erosion: Inside active 250m bank migration corridor of ${erosion.riverSystem ?? "river"}`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "RIVERBANK_EROSION", score: 50, reason: `Active 250m bank migration corridor of ${erosion.riverSystem ?? "river"}`, trigger });
  } else if (erosion.status === "HIGH") {
    score += 30;
    const trigger = `[ACTIVE_EROSION_CORRIDOR] High Bank Erosion Warning: Within 800m of migrating ${erosion.riverSystem ?? "river"} reach`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "RIVERBANK_EROSION", score: 30, reason: `Within 800m of migrating ${erosion.riverSystem ?? "river"} reach`, trigger });
  }

  // 4. Cyclone & Coastal Criteria
  if (cyclone.status === "CRITICAL") {
    score += 45;
    const trigger = `[CYCLONE_COASTAL_SURGE] Critical Coastal Surge Hazard: Low-elevation shoreline (${cyclone.elevationMeters ?? "—"}m) within 50 km of severe cyclone landfall (Fine-grained cyclone hazard footprint unavailable; based on IMD/IBTrACS historical coastal buffer)`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "CYCLONE", score: 45, reason: `Low-elevation shoreline (${cyclone.elevationMeters ?? "—"}m) within 50 km of severe cyclone landfall`, trigger });
  } else if (cyclone.status === "HIGH") {
    score += 30;
    const trigger = `[CYCLONE_COASTAL_SURGE] High Cyclone Exposure: Coastal proximity (${cyclone.distanceToCoastKm ?? "—"} km) in active storm track zone (Fine-grained cyclone hazard footprint unavailable; based on IMD/IBTrACS historical coastal buffer)`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "CYCLONE", score: 30, reason: `Coastal proximity (${cyclone.distanceToCoastKm ?? "—"} km) in active storm track zone`, trigger });
  } else if (cyclone.status === "MODERATE") {
    score += 12;
    triggers.push("Moderate Maritime / Cyclone influence (Fine-grained cyclone hazard footprint unavailable)");
    hazardContributions.push({ hazard: "CYCLONE", score: 12, reason: "Moderate maritime / coastal influence", trigger: "Moderate Maritime / Cyclone influence" });
  }

  // 5. Seismic Criteria (BIS IS 1893:2016) — Engineering / Regulatory Baseline
  if (seismic.zone === "ZONE_V") {
    score += 28;
    const trigger = "[SEISMIC_ZONE_V] Regulatory Seismic Zone V: Highest earthquake damage risk (Zone factor Z=0.36, MSK IX+; engineering/regulatory baseline, not an observed rupture footprint)";
    triggers.push(trigger);
    hazardContributions.push({ hazard: "SEISMIC", score: 28, reason: "Regulatory Seismic Zone V macro-zone baseline (BIS IS 1893:2016, Z=0.36)", trigger });
  } else if (seismic.zone === "ZONE_IV") {
    score += 16;
    const trigger = "[SEISMIC_ZONE_IV] Regulatory Seismic Zone IV: High earthquake damage risk (Zone factor Z=0.24, MSK VIII; engineering/regulatory baseline)";
    triggers.push(trigger);
    hazardContributions.push({ hazard: "SEISMIC", score: 16, reason: "Regulatory Seismic Zone IV macro-zone baseline (BIS IS 1893:2016, Z=0.24)", trigger });
  }

  // 6. Extreme Rainfall Criteria
  if (rainfall.status === "CRITICAL") {
    score += 35;
    const trigger = `Critical Rainfall: IMD Extremely Heavy Rainfall recorded (${rainfall.currentRainfallMm} mm/day)`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "EXTREME_RAINFALL", score: 35, reason: `IMD Extremely Heavy Rainfall (${rainfall.currentRainfallMm} mm/day)`, trigger });
  } else if (rainfall.status === "HIGH") {
    score += 20;
    const trigger = `Very Heavy Rainfall: ${rainfall.currentRainfallMm} mm/day recorded`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "EXTREME_RAINFALL", score: 20, reason: `Very Heavy Rainfall (${rainfall.currentRainfallMm} mm/day)`, trigger });
  }

  // 7. Extreme Heat Criteria
  if (heat.status === "CRITICAL") {
    score += 25;
    const trigger = `Severe Heatwave: Current temperature ${heat.currentTemperatureC}°C exceeds critical threshold`;
    triggers.push(trigger);
    hazardContributions.push({ hazard: "EXTREME_HEAT", score: 25, reason: `Severe Heatwave (${heat.currentTemperatureC}°C)`, trigger });
  }

  // Sort hazard contributions by score descending to deterministically choose primary & secondaries
  hazardContributions.sort((a, b) => b.score - a.score);

  const primaryEntry = hazardContributions[0];
  const primaryHazard: HazardType = primaryEntry ? primaryEntry.hazard : "FLOOD";
  const primaryDriverReason: string = primaryEntry
    ? primaryEntry.reason
    : "Standard baseline conditions with no critical multi-hazard thresholds triggered";

  const secondaryEntries = hazardContributions.slice(1);
  const secondaryHazards: HazardType[] = Array.from(new Set(secondaryEntries.map(e => e.hazard)));
  const supportingEvidence: string[] = secondaryEntries.map(e => `${e.hazard}: ${e.reason}`);

  // Clamp final score
  const finalScore = Math.max(10, Math.min(100, score));

  let status: RedZoneTier = "LOW";
  if (finalScore >= 75 || flood.status === "CRITICAL" || landslide.status === "CRITICAL" || erosion.status === "CRITICAL" || (seismic.zone === "ZONE_V" && (erosion.status === "HIGH" || flood.status === "HIGH"))) {
    status = "RED";
  } else if (finalScore >= 55 || flood.status === "HIGH" || landslide.status === "HIGH" || cyclone.status === "HIGH" || erosion.status === "HIGH") {
    status = "ORANGE";
  } else if (finalScore >= 35 || flood.status === "MODERATE" || landslide.status === "MODERATE" || seismic.zone === "ZONE_V") {
    status = "YELLOW";
  } else {
    status = "LOW";
  }

  const explainability = triggers.length > 0
    ? `Classified as ${status} Zone based on ${triggers.length} verified geographic evidence triggers: ${triggers.slice(0, 2).join("; ")}.`
    : "Standard baseline conditions with no critical multi-hazard thresholds triggered.";

  return {
    status,
    tier: status,
    isRedZone: status === "RED",
    score: finalScore,
    compositeScore: finalScore,
    primaryHazard,
    secondaryHazards,
    primaryDriverReason,
    supportingEvidence,
    triggers,
    explanation: explainability,
    explainability,
    confidence: "HIGH",
    provenance: RED_ZONE_PROVENANCE,
    limitations: [
      "Red zone classification is deterministic multi-hazard screening based on verified spatial datasets.",
      "Regulatory seismic zones represent engineering design standards, not an active earthquake rupture footprint.",
      "Where fine-grained physical footprints are unavailable (e.g. cyclone surge, landslide micro-zones), assessments rely on authoritative historical buffers and station observations.",
      "It does not replace local emergency alerts or building structural safety assessments.",
    ],
  };
}

/**
 * Build a Comprehensive MultiHazardProfile for a given location
 */
export function buildMultiHazardProfile(options: {
  locationName?: string;
  latitude: number;
  longitude: number;
  stateCode?: string;
  stateName?: string;
  district?: string;
  districtName?: string;
  slopeDegrees?: number | null;
  elevationMeters?: number | null;
  currentRainfallMm?: number | null;
  forecastMaxMm?: number | null;
  currentTemperatureC?: number | null;
  isCoastalState?: boolean;
}): MultiHazardProfile {
  let resolvedStateCode = options.stateCode;
  let resolvedStateName = options.stateName;
  if (!resolvedStateCode && resolvedStateName) {
    const found = getStateByName(resolvedStateName);
    if (found) resolvedStateCode = found.code;
  } else if (resolvedStateCode && !resolvedStateName) {
    const found = getStateByCode(resolvedStateCode);
    if (found) resolvedStateName = found.name;
  }
  const stateCode = resolvedStateCode ?? "IN";
  const stateName = resolvedStateName ?? "India";

  const district = options.district ?? options.districtName ?? null;
  const locationName = options.locationName ?? (district ? `${district}, ${stateName}` : stateName);
  const isCoastalState = options.isCoastalState ?? (["AP", "MH", "OD", "TN", "KL", "GJ", "WB", "GA"].includes(stateCode.toUpperCase()));

  const {
    latitude,
    longitude,
    slopeDegrees,
    elevationMeters,
    currentRainfallMm,
    forecastMaxMm,
    currentTemperatureC,
  } = options;

  // Resolve all individual hazard exposures
  const flood = resolveFloodExposure(latitude, longitude, stateCode, district ?? undefined, currentRainfallMm, elevationMeters);
  const landslide = resolveLandslideExposure(latitude, longitude, stateCode, district ?? undefined, slopeDegrees, elevationMeters);
  const cyclone = resolveCycloneExposure(latitude, longitude, stateCode, isCoastalState, elevationMeters);
  const seismic = resolveSeismicExposure(latitude, longitude, stateCode, district ?? undefined);
  const erosion = resolveRiverbankErosionExposure(latitude, longitude, stateCode, district ?? undefined);
  const rainfall = resolveExtremeRainfallExposure(currentRainfallMm ?? null, forecastMaxMm ?? null);
  const drought = resolveDroughtExposure(latitude, longitude, stateCode, district ?? undefined);
  const heat = resolveExtremeHeatExposure(latitude, longitude, stateCode, district ?? undefined, currentTemperatureC);


  // Evaluate multi-hazard Red Zone
  const redZone = evaluateRedZone(flood, landslide, cyclone, seismic, erosion, rainfall, heat, drought);

  // Build common HazardObservation models
  const toScore = (lvl: HazardLevel): number => lvl === "CRITICAL" ? 90 : lvl === "HIGH" ? 70 : lvl === "MODERATE" ? 45 : lvl === "LOW" ? 15 : 0;

  const observations: Record<HazardType, HazardObservation> = {
    FLOOD: {
      hazardType: "FLOOD",
      hazardLevel: flood.status,
      rawNumericValue: flood.riverDistanceKm,
      rawUnit: "km to nearest river",
      normalizedScore: toScore(flood.status),
      distanceToFeatureKm: flood.riverDistanceKm,
      provenance: flood.provenance,
      limitations: ["Based on CWC station network and multi-year satellite inundation extents"],
    },
    LANDSLIDE: {
      hazardType: "LANDSLIDE",
      hazardLevel: landslide.status,
      rawNumericValue: landslide.districtRank,
      rawUnit: "ISRO vulnerability rank / 147",
      normalizedScore: toScore(landslide.status),
      distanceToFeatureKm: landslide.nearestEvent?.distanceKm ?? null,
      provenance: landslide.provenance,
      limitations: ["ISRO Landslide Atlas 2023 macro-zonation and historical event radii"],
    },
    CYCLONE: {
      hazardType: "CYCLONE",
      hazardLevel: cyclone.status,
      rawNumericValue: cyclone.distanceToCoastKm,
      rawUnit: "km to coastline",
      normalizedScore: toScore(cyclone.status),
      distanceToFeatureKm: cyclone.distanceToTrackKm,
      provenance: cyclone.provenance,
      limitations: ["Historical best tracks (1891–2023) and coastal buffer calculation"],
    },
    SEISMIC: {
      hazardType: "SEISMIC",
      hazardLevel: seismic.status,
      rawNumericValue: seismic.zoneFactor,
      rawUnit: "Zone Factor (Z)",
      normalizedScore: seismic.zoneFactor * 250, // 0.36 -> 90, 0.24 -> 60, 0.16 -> 40, 0.10 -> 25
      distanceToFeatureKm: null,
      provenance: seismic.provenance,
      limitations: ["Bureau of Indian Standards IS 1893:2016 regulatory macro-zonation"],
    },
    RIVERBANK_EROSION: {
      hazardType: "RIVERBANK_EROSION",
      hazardLevel: erosion.status,
      rawNumericValue: erosion.distanceToBankKm,
      rawUnit: "km to eroding riverbank",
      normalizedScore: toScore(erosion.status),
      distanceToFeatureKm: erosion.distanceToBankKm,
      provenance: erosion.provenance,
      limitations: ["Brahmaputra Board & Bihar FMISC mapped active bankline migration reaches"],
    },
    EXTREME_RAINFALL: {
      hazardType: "EXTREME_RAINFALL",
      hazardLevel: rainfall.status,
      rawNumericValue: rainfall.currentRainfallMm,
      rawUnit: "mm/day",
      normalizedScore: toScore(rainfall.status),
      distanceToFeatureKm: null,
      provenance: rainfall.provenance,
      limitations: ["Live Open-Meteo numerical prediction mapped to IMD classification criteria"],
    },
    DROUGHT: {
      hazardType: "DROUGHT",
      hazardLevel: drought.status,
      rawNumericValue: drought.dstClimateVulnerabilityScore,
      rawUnit: "DST vulnerability index (0-1)",
      normalizedScore: drought.dstClimateVulnerabilityScore ? Math.round(drought.dstClimateVulnerabilityScore * 100) : null,
      distanceToFeatureKm: null,
      provenance: drought.provenance,
      limitations: ["Department of Science & Technology Common Framework district index"],
    },
    EXTREME_HEAT: {
      hazardType: "EXTREME_HEAT",
      hazardLevel: heat.status,
      rawNumericValue: heat.climatologicalDaysAbove40CPerYear,
      rawUnit: "days/year >40°C",
      normalizedScore: toScore(heat.status),
      distanceToFeatureKm: null,
      provenance: heat.provenance,
      limitations: ["IMD 50-year climatological normals for meteorological stations"],
    },
    WILDFIRE: {
      hazardType: "WILDFIRE",
      hazardLevel: "LOW",
      rawNumericValue: null,
      rawUnit: null,
      normalizedScore: 10,
      distanceToFeatureKm: null,
      provenance: {
        sourceName: "Forest Survey of India (FSI) Fire Danger Rating System",
        sourceType: "OFFICIAL",
        observedAt: null,
        confidence: "LOW",
        provenanceLabel: "Baseline FSI forest cover context (thermal anomalies not active)",
      },
      limitations: ["Active SNPP thermal anomalies are not integrated in Phase 3.2B core"],
    },
  };

  // Find exposed habitations within proximity (e.g. within 35 km)
  const hazardClass: "RED" | "ORANGE" | "GREEN" =
    redZone.status === "RED" ? "RED" : (redZone.status === "ORANGE" || redZone.status === "YELLOW") ? "ORANGE" : "GREEN";
  const exposedHabitations = findExposedHabitations(
    latitude,
    longitude,
    35,
    stateCode,
    district ?? undefined,
    hazardClass,
    redZone.primaryHazard
  );


  // Calculate data completeness
  const verifiedCount = [
    flood.nearestRiver !== null,
    landslide.districtRank !== null || landslide.slopeDegrees !== null,
    cyclone.distanceToCoastKm !== null,
    seismic.zoneFactor > 0,
    rainfall.currentRainfallMm !== null,
  ].filter(Boolean).length;

  const dataCompletenessPercent = Math.round((verifiedCount / 5) * 100);

  return {
    locationName,
    stateCode,
    stateName,
    district: district ?? null,
    latitude,
    longitude,
    redZone,
    observations,
    hazards: Object.values(observations),
    flood,
    landslide,
    cyclone,
    seismic,
    erosion,
    rainfall,
    drought,
    heat,
    exposedHabitations,
    dataCompletenessPercent,
    updatedAt: new Date().toISOString(),
  };
}


/**
 * Find and Evaluate Exposed Habitations (PS 191 Core Requirement)
 *
 * Phase 3.4 upgrade: uses semantic hazard-type matching from classifyHabitationExposure
 * instead of the Phase 3.3 crude 10km insideHazardZone radius heuristic.
 * insideHazardZone is now derived from EXPOSED/PARTIALLY_EXPOSED classification.
 */
export function findExposedHabitations(
  lat: number,
  lon: number,
  radiusKm = 50,
  stateCode?: string,
  district?: string,
  hazardClassification?: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE",
  primaryHazardHint?: string
): HabitationExposure[] {
  const matching: HabitationRecord[] = [];

  // Filter habitations within radius or in same district/state
  TARGET_STATE_HABITATIONS.forEach(hab => {
    const dist = haversineDistanceKm(lat, lon, hab.latitude, hab.longitude);
    const sameDistrict = district && hab.district.toLowerCase() === district.toLowerCase();
    const sameState = stateCode && hab.stateCode.toUpperCase() === stateCode.toUpperCase();

    if (dist <= radiusKm || sameDistrict || (dist <= 80 && sameState)) {
      matching.push(hab);
    }
  });

  return matching.map(hab => {
    const distKm = haversineDistanceKm(lat, lon, hab.latitude, hab.longitude);

    // Phase 3.4: Semantic exposure classification — replaces 10km radius heuristic
    const resolvedDistrict = district ?? hab.district;
    const resolvedState = stateCode ?? hab.stateCode;
    const resolvedClassification = hazardClassification ?? "UNAVAILABLE";
    const exposureStatus = classifyHabitationExposure(
      hab,
      resolvedDistrict,
      resolvedState,
      resolvedClassification,
      primaryHazardHint
    );
    const insideHazard = exposureStatus === "EXPOSED" || exposureStatus === "PARTIALLY_EXPOSED";

    // Proximity-based level (for UI display; not used in exposure sum)
    let exposureLevel: HabitationExposure["exposureLevel"] = "LOW";
    if (exposureStatus === "EXPOSED") {
      if (distKm <= 5) exposureLevel = "CRITICAL";
      else if (distKm <= 15) exposureLevel = "HIGH";
      else exposureLevel = "MODERATE";
    } else if (exposureStatus === "PARTIALLY_EXPOSED") {
      exposureLevel = "MODERATE";
    } else if (exposureStatus === "UNKNOWN") {
      exposureLevel = "LOW";
    }

    // Infer primary hazard type from primaryExposures keywords
    let hazardType: HazardType = "FLOOD";
    if (hab.primaryExposures.some(p => p.toLowerCase().includes("landslide") || p.toLowerCase().includes("debris"))) {
      hazardType = "LANDSLIDE";
    } else if (hab.primaryExposures.some(p => p.toLowerCase().includes("cyclone") || p.toLowerCase().includes("surge"))) {
      hazardType = "CYCLONE";
    } else if (hab.primaryExposures.some(p => p.toLowerCase().includes("erosion"))) {
      hazardType = "RIVERBANK_EROSION";
    } else if (hab.primaryExposures.some(p => p.toLowerCase().includes("heat") || p.toLowerCase().includes("drought"))) {
      hazardType = "EXTREME_HEAT";
    }

    const evidence: string[] = [
      `Habitation located ${distKm.toFixed(1)} km from selected search center`,
      `Exposure classification: ${exposureStatus} (Phase 3.4 semantic hazard-type matching)`,
      `Primary recorded local exposure: ${hab.primaryExposures.join(", ")}`,
      hab.population !== null
        ? `Official Census 2011 population: ${hab.population.toLocaleString("en-IN")} inhabitants (${hab.households ?? "—"} households)`
        : "Census population is not verified for this sub-locality and is strictly null",
    ];

    return {
      habitationId: hab.id,
      name: hab.name,
      state: hab.state,
      stateCode: hab.stateCode,
      district: hab.district,
      latitude: hab.latitude,
      longitude: hab.longitude,
      population: hab.population, // STRICTLY null when unverified — NEVER 0
      hazardType,
      exposureLevel,
      distanceToHazardKm: distKm,
      insideHazardZone: insideHazard,
      hazardEvidence: evidence,
      provenance: {
        sourceName: hab.source,
        sourceType: "OFFICIAL",
        observedAt: "2011-03-01T00:00:00.000Z",
        confidence: "HIGH",
        provenanceLabel: "Census of India & SDMA village disaster management directories",
      },
      confidence: "HIGH",
    };
  });
}

/**
 * Generate Complete GeoJSON FeatureCollections for MapLibre Visualizations
 */
export function getHazardMapLayers() {
  // 1. BIS Seismic Zones (Polygons)
  const seismicFeatures = SEISMIC_ZONE_POLYGONS.map(zone => ({
    type: "Feature" as const,
    properties: {
      id: `seismic-${zone.zone.toLowerCase()}`,
      name: zone.name,
      zone: zone.zone,
      zoneFactor: zone.zoneFactor,
      pgaG: zone.pgaG,
      intensity: zone.intensity,
      provenance: "BIS IS 1893:2016",
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: zone.coordinates,
    },
  }));

  // 2. CWC Hydrological Stations (Points)
  const cwcFeatures = CWC_GAUGE_STATIONS.map(gauge => ({
    type: "Feature" as const,
    properties: {
      id: gauge.stationId,
      name: gauge.stationName,
      river: gauge.river,
      basin: gauge.basin,
      warningLevel: gauge.warningLevelMeters,
      dangerLevel: gauge.dangerLevelMeters,
      hfl: gauge.hflMeters,
      provenance: "CWC Flood Forecasting System",
    },
    geometry: {
      type: "Point" as const,
      coordinates: [gauge.longitude, gauge.latitude],
    },
  }));

  // 3. Historical Landslide Events (Points)
  const landslideFeatures = HISTORICAL_LANDSLIDE_EVENTS.map(ev => ({
    type: "Feature" as const,
    properties: {
      id: ev.id,
      name: ev.name,
      year: ev.year,
      state: ev.state,
      district: ev.district,
      fatalities: ev.fatalities,
      trigger: ev.trigger,
      provenance: ev.source,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [ev.longitude, ev.latitude],
    },
  }));

  // 4. Historical Cyclone Tracks (LineStrings)
  const cycloneFeatures = HISTORICAL_CYCLONE_TRACKS.map(track => ({
    type: "Feature" as const,
    properties: {
      id: track.id,
      name: track.name,
      year: track.year,
      category: track.category,
      maxWindKmph: track.maxSustainedWindKmph,
      landfallLocation: track.landfallLocation,
      provenance: "NOAA IBTrACS / IMD Best Track",
    },
    geometry: {
      type: "LineString" as const,
      coordinates: track.coordinates,
    },
  }));

  // 5. Historical Flood Inundation Plains (Polygons)
  const floodFeatures = HISTORICAL_FLOOD_POLYGONS.map(poly => ({
    type: "Feature" as const,
    properties: {
      id: poly.id,
      name: poly.name,
      basin: poly.basin,
      stateCode: poly.stateCode,
      frequencyTier: poly.frequencyTier,
      provenance: "NRSC / Bhuvan Flood Hazard Atlas",
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: poly.coordinates,
    },
  }));

  // 6. Riverbank Erosion Corridors (LineStrings)
  const erosionFeatures = ACTIVE_EROSION_CORRIDORS.map(corridor => ({
    type: "Feature" as const,
    properties: {
      id: corridor.id,
      name: corridor.segmentName,
      river: corridor.riverSystem,
      district: corridor.district,
      bufferMeters: corridor.criticalBufferMeters,
      provenance: "Brahmaputra Board & WRD",
    },
    geometry: {
      type: "LineString" as const,
      coordinates: corridor.coordinates,
    },
  }));

  // 7. Exposed Habitations (Points)
  const habitationFeatures = TARGET_STATE_HABITATIONS.map(hab => ({
    type: "Feature" as const,
    properties: {
      id: hab.id,
      name: hab.name,
      state: hab.state,
      district: hab.district,
      population: hab.population, // Strictly null if unverified
      populationSource: hab.population !== null ? "CENSUS_2011" : "UNVERIFIED",
      exposures: hab.primaryExposures.join(", "),
      provenance: "Census 2011 / SDMA",
    },
    geometry: {
      type: "Point" as const,
      coordinates: [hab.longitude, hab.latitude],
    },
  }));

  return {
    seismicZones: { type: "FeatureCollection" as const, features: seismicFeatures },
    cwcGauges: { type: "FeatureCollection" as const, features: cwcFeatures },
    landslideEvents: { type: "FeatureCollection" as const, features: landslideFeatures },
    cycloneTracks: { type: "FeatureCollection" as const, features: cycloneFeatures },
    floodZones: { type: "FeatureCollection" as const, features: floodFeatures },
    floodplains: { type: "FeatureCollection" as const, features: floodFeatures },
    erosionCorridors: { type: "FeatureCollection" as const, features: erosionFeatures },
    habitations: { type: "FeatureCollection" as const, features: habitationFeatures },
    facilities: getFacilityMapLayer(),
  };
}

