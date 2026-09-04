/**
 * Akashvani Phase 3.2C — PS191 Spatial Risk Classification Layer
 *
 * Derives RED / ORANGE / GREEN / UNAVAILABLE polygon features from the
 * existing Phase 3.2B multi-hazard engine, mapped onto REAL geographic
 * administrative district boundaries (geoBoundaries India ADM2 / Kerala ADM2).
 *
 * NO synthetic, circular, or buffer polygons are used.
 *
 * Design invariants:
 * 1. Classification source of truth = existing RedZoneAssessment (Phase 3.2B).
 * 2. Geometry = REAL published district boundary polygons (geoBoundaries ADM2).
 * 3. Entire district area polygon is filled with the classification color.
 * 4. GREEN requires genuine LOW-tier evidence. Missing data → UNAVAILABLE.
 * 5. Spatial resolution is explicitly labeled as "DISTRICT".
 */

import { ALL_REAL_DISTRICTS, type RealDistrictRecord, findRealDistrict } from "./data/realDistricts";
import { buildMultiHazardProfile } from "./engine";
import type { RedZoneTier } from "../../../shared/hazards";

// ─── Presentation classification type ────────────────────────────────────────

export type PresentationClass = "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE";

// ─── Central colour constants (all map rendering uses these, never ad-hoc) ──

export const CLASSIFICATION_FILL_COLORS: Record<PresentationClass, string> = {
  RED: "#c62828",
  ORANGE: "#e65100",
  GREEN: "#2e7d32",
  UNAVAILABLE: "rgba(0,0,0,0)", // transparent — neutral/unclassified
};

export const CLASSIFICATION_LINE_COLORS: Record<PresentationClass, string> = {
  RED: "#b71c1c",
  ORANGE: "#bf360c",
  GREEN: "#1b5e20",
  UNAVAILABLE: "rgba(0,0,0,0)",
};

export const CLASSIFICATION_FILL_OPACITY = 0.40;
export const CLASSIFICATION_LINE_WIDTH = 2.0;

export const CLASSIFICATION_TIER_LABELS: Record<PresentationClass, string> = {
  RED: "Critical / priority red zone",
  ORANGE: "Significant concern / attention required",
  GREEN: "Lower assessed concern based on available evidence",
  UNAVAILABLE: "Insufficient evidence for classification",
};

// ─── Tier → Presentation class mapping ───────────────────────────────────────

/**
 * Maps the existing Phase 3.2B RedZoneTier to a presentation class.
 *
 * YELLOW is presented as ORANGE: in disaster management context,
 * YELLOW still warrants elevated attention and should not appear green.
 * GREEN is ONLY emitted when the tier is genuinely LOW.
 * Missing/unknown data produces UNAVAILABLE (never GREEN).
 */
export function tierToPresentation(tier?: RedZoneTier | string | null): PresentationClass {
  switch (tier) {
    case "RED":    return "RED";
    case "ORANGE": return "ORANGE";
    case "YELLOW": return "ORANGE";
    case "LOW":    return "GREEN";
    default:       return "UNAVAILABLE";
  }
}

// ─── Classification feature type ─────────────────────────────────────────────

export interface ClassificationFeatureProperties {
  [key: string]: unknown;
  areaId: string;
  areaName: string;
  areaType: "DISTRICT";
  state: string;
  stateCode: string;
  district: string;
  classification: PresentationClass;
  redZoneTier: RedZoneTier;
  score: number;
  dominantHazards: string[];
  deterministicTriggers: string[];
  evidenceStatus: "OFFICIAL" | "DERIVED" | "UNAVAILABLE";
  provenance: string;
  spatialResolution: "DISTRICT";
  population?: number | null;
  explanation: string;
  limitations: string;
}

export interface ClassificationFeature {
  type: "Feature";
  properties: ClassificationFeatureProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

export type ClassificationFeatureCollection = {
  type: "FeatureCollection";
  features: ClassificationFeature[];
};

// ─── Core classification function ─────────────────────────────────────────────

/**
 * Classifies a real administrative district using the Phase 3.2B engine
 * and maps the classification onto the district's actual boundary geometry.
 */
export function classifyDistrict(district: RealDistrictRecord): ClassificationFeature | null {
  let profile;
  try {
    profile = buildMultiHazardProfile({
      locationName: district.district,
      latitude: district.latitude,
      longitude: district.longitude,
      stateCode: district.stateCode,
      district: district.district,
    });
  } catch {
    return null;
  }

  const { redZone } = profile;
  const classification = tierToPresentation(redZone.tier);

  // Dominant hazards = all hazard types that reached CRITICAL or HIGH
  const dominantHazards = profile.hazards
    .filter((obs) => obs.hazardLevel === "CRITICAL" || obs.hazardLevel === "HIGH")
    .map((obs) => obs.hazardType);

  // Evidence status: if any observation is OFFICIAL, treat as OFFICIAL
  const hasOfficial = profile.hazards.some((obs) => obs.provenance.sourceType === "OFFICIAL");
  const evidenceStatus: ClassificationFeatureProperties["evidenceStatus"] =
    classification === "UNAVAILABLE"
      ? "UNAVAILABLE"
      : hasOfficial
      ? "OFFICIAL"
      : "DERIVED";

  return {
    type: "Feature",
    properties: {
      areaId: district.id,
      areaName: `${district.district} District`,
      areaType: "DISTRICT",
      state: district.state,
      stateCode: district.stateCode,
      district: district.district,
      classification,
      redZoneTier: redZone.tier,
      score: redZone.score,
      dominantHazards,
      deterministicTriggers: redZone.triggers,
      evidenceStatus,
      provenance: `Phase 3.2B multi-hazard engine (${redZone.provenance.sourceName}) · Geometry: ${district.source}`,
      spatialResolution: "DISTRICT",
      population: district.population ?? null,
      explanation: redZone.explanation,
      limitations:
        "Official district administrative boundary from geoBoundaries ADM2 / Census 2011. " +
        "Classification reflects district-wide multi-hazard exposure intersection and regulatory zones.",
    },
    geometry: district.geometry as ClassificationFeature["geometry"],
  };
}

// ─── Full classification layer ────────────────────────────────────────────────

/**
 * Generates the complete PS191 Risk Classification GeoJSON FeatureCollection
 * using REAL geographic district boundaries across target states.
 *
 * Each feature has the real district boundary polygon filled with its
 * assessed color (RED, ORANGE, GREEN).
 */
export function getClassificationLayer(): ClassificationFeatureCollection {
  const features: ClassificationFeature[] = [];
  for (const district of ALL_REAL_DISTRICTS) {
    const feat = classifyDistrict(district);
    if (feat) {
      features.push(feat);
    }
  }
  return { type: "FeatureCollection", features };
}

export { findRealDistrict };
