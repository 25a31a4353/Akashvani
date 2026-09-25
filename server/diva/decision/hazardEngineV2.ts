/**
 * ResQ Decision Intelligence Engine V2 — Hazard Engine V2
 * 
 * Replaces simplistic weighted averaging with a structured hazard evidence engine.
 * 
 * Rules:
 * 1. Explicit Hazard Hierarchy:
 *    A. ACTIVE OFFICIAL WARNING (Highest priority)
 *    B. ACTIVE OBSERVED HAZARD (e.g. CWC Gauge in Danger)
 *    C. CURRENT OFFICIAL FORECAST (e.g. IMD Heavy Rainfall Forecast)
 *    D. RECENT OBSERVED EVENT (e.g. Recent 24h accumulation)
 *    E. HISTORICAL EVENT (e.g. Historical flood footprints, ISRO landslide events)
 *    F. SUSCEPTIBILITY / SCREENING (e.g. DEM slope > 25°, GSI geomorphology)
 *    G. STATIC REGULATORY REFERENCE (e.g. BIS IS 1893:2016 Seismic Zone V, GSI 1:2M geology)
 * 
 * 2. Correlated Evidence Deduplication:
 *    Correlated datasets (e.g. CWC river gauge + satellite flood footprint) are grouped
 *    and deduplicated to prevent artificial score inflation.
 * 
 * 3. Separation of Regulatory Baselines from Active Hazards:
 *    BIS Zone V is an engineering baseline, NEVER an active earthquake.
 *    GSI lithology and fault proximity provide geotechnical context, NEVER mapped directly to RED.
 */

import type {
  DecisionTier,
  EvidenceHierarchyLevel,
  HazardEvidenceContribution,
  ResQHazardAssessment,
} from "../../../shared/decisionEngine";
import type {
  HazardType,
  HazardLevel,
  MultiHazardProfile,
} from "../../../shared/hazards";
import type { DataProvenance, GeologyContext } from "../../../shared/multiState";
import type { EnvironmentalContext } from "../../../shared/india";

export function evaluateHazardV2(
  profile: MultiHazardProfile,
  environment?: EnvironmentalContext,
  geology?: GeologyContext | null
): ResQHazardAssessment {
  const contributions: HazardEvidenceContribution[] = [];
  const triggers: string[] = [];
  const sourceGroupScores: Record<string, number> = {};

  const addContribution = (item: {
    hazard: HazardType;
    score: number;
    hierarchyLevel: EvidenceHierarchyLevel;
    evidenceSourceGroup: string;
    reason: string;
    trigger: string;
    provenance: DataProvenance;
  }) => {
    // Deduplication logic: within the same evidenceSourceGroup, take the maximum score
    const existingGroupMax = sourceGroupScores[item.evidenceSourceGroup] || 0;
    const isDeduplicated = item.score <= existingGroupMax;

    if (!isDeduplicated) {
      sourceGroupScores[item.evidenceSourceGroup] = item.score;
    }

    contributions.push({
      ...item,
      isDeduplicated,
    });

    triggers.push(item.trigger);
  };

  // ─── 1. FLOOD EVALUATION ───────────────────────────────────────────────────
  const flood = profile.flood;
  const isCwcDanger = flood.nearestCwcGauge && flood.nearestCwcGauge.status === "DANGER";
  const isCwcWarning = flood.nearestCwcGauge && flood.nearestCwcGauge.status === "WARNING";

  if (isCwcDanger) {
    addContribution({
      hazard: "FLOOD",
      score: 60,
      hierarchyLevel: "ACTIVE_OBSERVED_HAZARD",
      evidenceSourceGroup: "flood_inundation_group",
      reason: `CWC river gauge '${flood.nearestCwcGauge!.stationName}' on ${flood.nearestCwcGauge!.river} has breached official DANGER level (${flood.nearestCwcGauge!.currentLevelMeters}m MSL)`,
      trigger: `[CWC_GAUGE_DANGER] Active Observed Flood: CWC station ${flood.nearestCwcGauge!.stationName} in DANGER status`,
      provenance: flood.provenance,
    });
  } else if (isCwcWarning) {
    addContribution({
      hazard: "FLOOD",
      score: 42,
      hierarchyLevel: "ACTIVE_OBSERVED_HAZARD",
      evidenceSourceGroup: "flood_inundation_group",
      reason: `CWC river gauge '${flood.nearestCwcGauge!.stationName}' on ${flood.nearestCwcGauge!.river} at WARNING level`,
      trigger: `[CWC_GAUGE_WARNING] Elevated River Telemetry: CWC station ${flood.nearestCwcGauge!.stationName} at WARNING status`,
      provenance: flood.provenance,
    });
  }

  if (flood.insideHistoricalFloodExtent) {
    const floodScore = flood.status === "CRITICAL" ? 55 : 35;
    addContribution({
      hazard: "FLOOD",
      score: floodScore,
      hierarchyLevel: "HISTORICAL_EVENT",
      evidenceSourceGroup: "flood_inundation_group",
      reason: "Location intersects verified multi-year satellite flood inundation corridor (ISRO/CWC)",
      trigger: `[HISTORICAL_FLOODPLAIN] ${flood.status === "CRITICAL" ? "Critical" : "High"} Flood Footprint: Inside annual riverine flood corridor`,
      provenance: flood.provenance,
    });
  } else if (flood.status === "MODERATE") {
    addContribution({
      hazard: "FLOOD",
      score: 18,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "flood_inundation_group",
      reason: "Regional riverine floodplain buffer screening",
      trigger: "[FLOOD_BUFFER] Moderate Flood Exposure: Regional floodplain buffer",
      provenance: flood.provenance,
    });
  }

  // ─── 2. LANDSLIDE EVALUATION ───────────────────────────────────────────────
  const landslide = profile.landslide;
  const hasSteepSlope = (landslide.slopeDegrees ?? 0) >= 25;
  const isTopRankedDistrict = landslide.districtRank !== null && landslide.districtRank <= 15;
  const isNearHistoricalGroundZero = landslide.nearestEvent && (landslide.nearestEvent.distanceKm ?? 999) <= 12;

  if (landslide.status === "CRITICAL") {
    addContribution({
      hazard: "LANDSLIDE",
      score: 60,
      hierarchyLevel: isNearHistoricalGroundZero ? "HISTORICAL_EVENT" : "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "landslide_geotechnical_group",
      reason: `Steep terrain (${landslide.slopeDegrees ?? "—"}° slope) combined with high-risk ISRO Landslide Atlas ranking (#${landslide.districtRank ?? "—"}/147)${isNearHistoricalGroundZero ? ` within ${landslide.nearestEvent!.distanceKm}km of historical event (${landslide.nearestEvent!.name})` : ""}`,
      trigger: `[CRITICAL_LANDSLIDE] Critical Landslide Hazard: Steep slope (${landslide.slopeDegrees ?? "—"}°) in ISRO Rank #${landslide.districtRank ?? "—"} hill tract`,
      provenance: landslide.provenance,
    });
  } else if (landslide.status === "HIGH") {
    addContribution({
      hazard: "LANDSLIDE",
      score: 40,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "landslide_geotechnical_group",
      reason: `ISRO high susceptibility tier or steep hill slope (${landslide.slopeDegrees ?? "—"}°)`,
      trigger: `[HIGH_LANDSLIDE] High Landslide Susceptibility: ISRO ${landslide.susceptibilityClass} classification`,
      provenance: landslide.provenance,
    });
  } else if (landslide.status === "MODERATE") {
    addContribution({
      hazard: "LANDSLIDE",
      score: 15,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "landslide_geotechnical_group",
      reason: "Hilly terrain buffer screening",
      trigger: "[LANDSLIDE_BUFFER] Moderate Landslide Exposure: Hilly terrain buffer",
      provenance: landslide.provenance,
    });
  }

  // ─── 3. RIVERBANK EROSION EVALUATION ───────────────────────────────────────
  const erosion = profile.erosion;
  if (erosion.status === "CRITICAL") {
    addContribution({
      hazard: "RIVERBANK_EROSION",
      score: 50,
      hierarchyLevel: "ACTIVE_OBSERVED_HAZARD",
      evidenceSourceGroup: "erosion_group",
      reason: `Inside active 250m bank migration corridor of ${erosion.riverSystem ?? "river"}`,
      trigger: `[ACTIVE_EROSION_CORRIDOR] Critical Bank Erosion: Inside active 250m channel migration corridor of ${erosion.riverSystem ?? "river"}`,
      provenance: erosion.provenance,
    });
  } else if (erosion.status === "HIGH") {
    addContribution({
      hazard: "RIVERBANK_EROSION",
      score: 30,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "erosion_group",
      reason: `Within 800m of migrating ${erosion.riverSystem ?? "river"} reach`,
      trigger: `[EROSION_BUFFER] High Bank Erosion Warning: Within 800m of migrating ${erosion.riverSystem ?? "river"} reach`,
      provenance: erosion.provenance,
    });
  }

  // ─── 4. CYCLONE & COASTAL SURGE EVALUATION ─────────────────────────────────
  const cyclone = profile.cyclone;
  if (cyclone.status === "CRITICAL") {
    addContribution({
      hazard: "CYCLONE",
      score: 45,
      hierarchyLevel: "HISTORICAL_EVENT",
      evidenceSourceGroup: "cyclone_coastal_group",
      reason: `Low-elevation shoreline (${cyclone.elevationMeters ?? "—"}m MSL) within 50 km of severe historical cyclone landfall corridor`,
      trigger: `[CYCLONE_COASTAL_SURGE] Critical Coastal Surge Hazard: Low-elevation shoreline (${cyclone.elevationMeters ?? "—"}m) within 50 km of historical landfall`,
      provenance: cyclone.provenance,
    });
  } else if (cyclone.status === "HIGH") {
    addContribution({
      hazard: "CYCLONE",
      score: 30,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "cyclone_coastal_group",
      reason: `Coastal proximity (${cyclone.distanceToCoastKm ?? "—"} km) in active historical storm track zone`,
      trigger: `[CYCLONE_BUFFER] High Cyclone Exposure: Coastal proximity (${cyclone.distanceToCoastKm ?? "—"} km) in storm track zone`,
      provenance: cyclone.provenance,
    });
  } else if (cyclone.status === "MODERATE") {
    addContribution({
      hazard: "CYCLONE",
      score: 12,
      hierarchyLevel: "SUSCEPTIBILITY_SCREENING",
      evidenceSourceGroup: "cyclone_coastal_group",
      reason: "Moderate maritime and coastal influence buffer",
      trigger: "[CYCLONE_MODERATE] Moderate Maritime / Cyclone influence",
      provenance: cyclone.provenance,
    });
  }

  // ─── 5. SEISMIC REGULATORY BASELINE (BIS IS 1893:2016) ─────────────────────
  // Explicitly classified as STATIC_REGULATORY_REFERENCE.
  // Represents building design standards, NEVER an active earthquake rupture!
  const seismic = profile.seismic;
  if (seismic.zone === "ZONE_V") {
    addContribution({
      hazard: "SEISMIC",
      score: 28,
      hierarchyLevel: "STATIC_REGULATORY_REFERENCE",
      evidenceSourceGroup: "seismic_regulatory_group",
      reason: "Regulatory Seismic Zone V macro-zone baseline (BIS IS 1893:2016, Zone Factor Z=0.36, MSK IX+; engineering design standard, not an active earthquake)",
      trigger: "[SEISMIC_ZONE_V] Regulatory Seismic Zone V: Highest earthquake damage design standard (Z=0.36; engineering baseline)",
      provenance: seismic.provenance,
    });
  } else if (seismic.zone === "ZONE_IV") {
    addContribution({
      hazard: "SEISMIC",
      score: 16,
      hierarchyLevel: "STATIC_REGULATORY_REFERENCE",
      evidenceSourceGroup: "seismic_regulatory_group",
      reason: "Regulatory Seismic Zone IV macro-zone baseline (BIS IS 1893:2016, Zone Factor Z=0.24, MSK VIII; engineering design standard)",
      trigger: "[SEISMIC_ZONE_IV] Regulatory Seismic Zone IV: High earthquake damage design standard (Z=0.24; engineering baseline)",
      provenance: seismic.provenance,
    });
  }

  // ─── 6. GEOLOGY & TECTONIC FAULT CONTEXT (GSI BHUKOSH) ─────────────────────
  // Supporting geotechnical evidence. Does NOT assign arbitrary high scores.
  if (geology?.available) {
    if (geology.faultDistanceKm !== null && geology.faultDistanceKm <= 15) {
      addContribution({
        hazard: "SEISMIC",
        score: 12,
        hierarchyLevel: "STATIC_REGULATORY_REFERENCE",
        evidenceSourceGroup: "seismic_regulatory_group", // Deduplicated against BIS baseline if BIS is higher
        reason: `GSI Bhukosh Seismotectonic Atlas: Proximity (${geology.faultDistanceKm} km) to mapped tectonic fault/lineament (${geology.nearestFaultName || "Unnamed Fault"})`,
        trigger: `[GSI_TECTONIC_PROXIMITY] GSI Tectonic Context: ${geology.faultDistanceKm} km to ${geology.nearestFaultName || "mapped fault lineament"}`,
        provenance: {
          sourceName: "Geological Survey of India (GSI) Seismotectonic Atlas",
          sourceUrl: "https://livingatlas.esri.in/server1/rest/services/Geology/Tectonics/FeatureServer/2",
          sourceType: "OFFICIAL",
          observedAt: geology.retrievedAt,
          confidence: "HIGH",
          provenanceLabel: "GSI 1:2M Seismotectonic Atlas of India",
        },
      });
    }
  }

  // ─── 7. EXTREME RAINFALL & IMD OFFICIAL WARNINGS ───────────────────────────
  const rainfall = profile.rainfall;
  const imdWarning = environment?.imdWarning;

  if (imdWarning && (imdWarning.warningLevel === "WARNING" || imdWarning.warningColor?.toLowerCase() === "red")) {
    addContribution({
      hazard: "EXTREME_RAINFALL",
      score: 55,
      hierarchyLevel: "ACTIVE_OFFICIAL_WARNING",
      evidenceSourceGroup: "atmospheric_warning_group",
      reason: `Official IMD Nowcast/Warning: ${imdWarning.headline}`,
      trigger: `[IMD_OFFICIAL_WARNING] ${imdWarning.warningLevel} ALERT: ${imdWarning.headline}`,
      provenance: {
        sourceName: "India Meteorological Department (IMD)",
        sourceType: "OFFICIAL",
        observedAt: imdWarning.issuedAt,
        confidence: "HIGH",
        provenanceLabel: "IMD Official Warning Bulletin",
      },
    });
  } else if (rainfall.status === "CRITICAL") {
    addContribution({
      hazard: "EXTREME_RAINFALL",
      score: 35,
      hierarchyLevel: "CURRENT_OFFICIAL_FORECAST",
      evidenceSourceGroup: "atmospheric_warning_group",
      reason: `IMD Extremely Heavy Rainfall recorded/predicted (${rainfall.currentRainfallMm} mm/day)`,
      trigger: `[CRITICAL_RAINFALL] Extremely Heavy Rainfall (${rainfall.currentRainfallMm} mm/day)`,
      provenance: rainfall.provenance,
    });
  } else if (rainfall.status === "HIGH") {
    addContribution({
      hazard: "EXTREME_RAINFALL",
      score: 20,
      hierarchyLevel: "CURRENT_OFFICIAL_FORECAST",
      evidenceSourceGroup: "atmospheric_warning_group",
      reason: `Very Heavy Rainfall recorded/predicted (${rainfall.currentRainfallMm} mm/day)`,
      trigger: `[HIGH_RAINFALL] Very Heavy Rainfall (${rainfall.currentRainfallMm} mm/day)`,
      provenance: rainfall.provenance,
    });
  }

  // ─── 8. EXTREME HEAT ───────────────────────────────────────────────────────
  const heat = profile.heat;
  if (heat.status === "CRITICAL") {
    addContribution({
      hazard: "EXTREME_HEAT",
      score: 25,
      hierarchyLevel: "ACTIVE_OBSERVED_HAZARD",
      evidenceSourceGroup: "thermal_stress_group",
      reason: `Severe Heatwave: Current temperature ${heat.currentTemperatureC}°C exceeds critical threshold`,
      trigger: `[SEVERE_HEATWAVE] Severe Heatwave (${heat.currentTemperatureC}°C)`,
      provenance: heat.provenance,
    });
  }

  // ─── COMPOSITE SCORE CALCULATION WITH DEDUPLICATION ───────────────────────
  // Sum non-deduplicated group maximums
  let baseScore = 20; // Baseline calm conditions
  for (const groupScore of Object.values(sourceGroupScores)) {
    baseScore += groupScore;
  }

  const compositeHazardScore = Math.max(10, Math.min(100, baseScore));

  // Determine Primary Hazard & Secondary Hazards deterministically
  const sortedContributions = [...contributions].sort((a, b) => b.score - a.score);
  const primaryEntry = sortedContributions[0];
  const primaryHazard: HazardType = primaryEntry ? primaryEntry.hazard : "FLOOD";
  const primaryDriverReason: string = primaryEntry
    ? primaryEntry.reason
    : "Standard baseline conditions with no critical multi-hazard thresholds triggered";

  const secondaryEntries = sortedContributions.filter(c => c.hazard !== primaryHazard && !c.isDeduplicated);
  const secondaryHazards: HazardType[] = Array.from(new Set(secondaryEntries.map(e => e.hazard)));
  const supportingEvidence: string[] = secondaryEntries.map(e => `${e.hazard}: ${e.reason}`);

  // Determine Decision Tier
  let tier: DecisionTier = "GREEN";
  if (
    compositeHazardScore >= 75 ||
    flood.status === "CRITICAL" ||
    landslide.status === "CRITICAL" ||
    erosion.status === "CRITICAL" ||
    (imdWarning && (imdWarning.warningLevel === "WARNING" || imdWarning.warningColor?.toLowerCase() === "red")) ||
    (seismic.zone === "ZONE_V" && (erosion.status === "HIGH" || flood.status === "HIGH"))
  ) {
    tier = "RED";
  } else if (
    compositeHazardScore >= 55 ||
    flood.status === "HIGH" ||
    landslide.status === "HIGH" ||
    cyclone.status === "HIGH" ||
    erosion.status === "HIGH" ||
    (imdWarning && (imdWarning.warningLevel === "ALERT" || imdWarning.warningColor?.toLowerCase() === "orange"))
  ) {
    tier = "ORANGE";
  } else {
    tier = "GREEN";
  }

  return {
    tier,
    compositeHazardScore,
    primaryHazard,
    primaryDriverReason,
    secondaryHazards,
    supportingEvidence,
    triggers,
    contributions,
    specificExposures: {
      flood,
      landslide,
      cyclone,
      seismic,
      erosion,
      rainfall,
      drought: profile.drought,
      heat,
      geology: geology ?? profile.geology,
    },
    provenance: {
      sourceName: "ResQ Multi-Hazard Evidence Engine V2",
      sourceUrl: "https://github.com/Akashvani-Platform/Akashvani",
      sourceType: "DERIVED",
      observedAt: new Date().toISOString(),
      spatialResolution: "Multi-source evidence-backed spatial intersection",
      temporalCoverage: "Live IMD/CWC monitoring & authoritative historical baselines",
      confidence: "HIGH",
      provenanceLabel: "ResQ canonical multi-hazard evidence evaluation",
    },
    limitations: [
      "Hazard evaluation is deterministic screening based on verified spatial datasets.",
      "BIS regulatory seismic zones represent structural engineering design standards, not an active earthquake rupture.",
      "GSI geology and fault lineaments provide supporting geotechnical context; they do not dictate hazard scores in isolation.",
      "Correlated evidence sources are deduplicated to avoid score inflation.",
    ],
  };
}
