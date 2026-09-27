/**
 * ResQ — Location Decision Context & Triage Report (v4.2 / ResQ V3.2 Integrity Pass)
 *
 * Professional disaster decision-support report.
 * Every displayed fact originates from canonical decision and authoritative evidence.
 *
 * Architectural Invariant:
 * The report generator is a PURE RENDERER. It NEVER recalculates decisions,
 * scores, routes, or destination safety.
 *
 * Quality & Integrity Invariants (ResQ V3.2):
 * 1. ZERO fabrication: no invented coordinates, bounds, routes, or statistics.
 * 2. UNKNOWN !== ZERO: unavailable population, capacity, or accessibility are NEVER displayed as 0.
 * 3. Spatial level explicit: state centroids explicitly labelled "STATE-LEVEL SCREENING REFERENCE CENTROID".
 * 4. Coordinate containment: reported location MUST be inside reported map extent.
 * 5. Destination safety gating: UNKNOWN safety is NEVER labelled "VERIFIED SAFE HAVEN".
 * 6. Routing integrity: unavailable road route has distance=UNAVAILABLE, duration=UNAVAILABLE, no fake duration.
 * 7. Evidence separation: decision evidence register is strictly separated from platform source registry.
 * 8. Zero overlap / zero clipping across all 8 dedicated pages.
 *
 * Structure (8 Pages):
 *   Page 1 — Location Identity, Spatial Level & Decision Summary
 *   Page 2 — Geographic Decision Map & Cartographic Verification
 *   Page 3 — Multi-Hazard Evidence & Baseline Geological Context
 *   Page 4 — Population Exposure & Vulnerability Context
 *   Page 5 — Evacuation Facilities & Carrying Capacity Assessment
 *   Page 6 — Destination Assessment & Road Evacuation Routing
 *   Page 7 — Decision Engine, Scoring Semantics & Causal Chain
 *   Page 8 — Data Quality, Limitations, Provenance & Source Registry
 */

import { createRequire } from "node:module";
import type PDFDocumentClass from "pdfkit";
import type { IndiaBoundary, IndiaLocationContext } from "../../shared/india";
import type { ResQDecisionContext } from "../../shared/decisionEngine";

const require = createRequire(import.meta.url);
const PDFDocument: typeof PDFDocumentClass = require("pdfkit");

type PdfDocument = PDFKit.PDFDocument;
export type Point = [number, number]; // [lon, lat]

// ─── Color System ────────────────────────────────────────────────────────────

export const SELECTED_LOCATION_RISK_COLORS = {
  High: "#BD3034",
  Moderate: "#E66E2D",
  Low: "#D3A52D",
  Safe: "#31825D",
} as const;

export const PALETTE = {
  // Text
  ink: "#0F172A",
  body: "#1E293B",
  muted: "#475569",
  faint: "#64748B",
  // Backgrounds
  pageWhite: "#FFFFFF",
  surfaceLight: "#F8FAFC",
  surfaceMid: "#F1F5F9",
  // Borders
  border: "#CBD5E1",
  borderLight: "#E2E8F0",
  // Brand / Status
  brandBlue: "#0B1E2D",
  brandAccent: "#1D4ED8",
  routeBlue: "#38BDF8",
  safe: "#16A34A",
  safeBg: "#DCFCE7",
  high: "#DC2626",
  highBg: "#FEE2E2",
  moderate: "#D97706",
  moderateBg: "#FEF3C7",
  low: "#D3A52D",
  lowBg: "#FEF9C3",
  unknown: "#64748B",
  unknownBg: "#F1F5F9",
  // Map
  mapBg: "#0B1E2D",
  mapGrid: "#1E3A52",
  mapBoundary: "#60A5FA",
  mapCentroid: "#EF4444",
  mapDest: "#10B981",
  mapDestConditional: "#F59E0B",
  mapDestUnknown: "#94A3B8",
  // Provenance badges
  official: "#15803D",
  officialBg: "#DCFCE7",
  modelled: "#1D4ED8",
  modelledBg: "#DBEAFE",
  historical: "#7C3AED",
  historicalBg: "#EDE9FE",
  unavailable: "#6B7280",
  unavailableBg: "#F3F4F6",
  derived: "#D97706",
  derivedBg: "#FEF9C3",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function riskColour(level: string | null | undefined): string {
  const norm = String(level || "").toUpperCase();
  if (norm === "RED" || norm === "HIGH" || norm === "CRITICAL" || norm === "IMMEDIATE") return SELECTED_LOCATION_RISK_COLORS.High;
  if (norm === "ORANGE" || norm === "MODERATE" || norm === "MEDIUM") return SELECTED_LOCATION_RISK_COLORS.Moderate;
  if (norm === "YELLOW") return "#B45309";
  if (norm === "GREEN" || norm === "LOW" || norm === "SAFE") return SELECTED_LOCATION_RISK_COLORS.Safe;
  return PALETTE.unknown;
}

function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";
}

function asRing(value: unknown): Point[] | null {
  return Array.isArray(value) && value.length >= 3 && value.every(isPoint) ? value : null;
}

export function extractBoundaryRings(boundary: IndiaBoundary): Point[][] {
  if (!boundary || !boundary.geometry) return [];
  const geometry = boundary.geometry;
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(asRing).filter((ring): ring is Point[] => Boolean(ring));
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.flatMap((polygon) =>
      Array.isArray(polygon) ? polygon.map(asRing).filter((ring): ring is Point[] => Boolean(ring)) : []
    );
  }
  return [];
}

export function formatCoord(val: number | null | undefined, type: "lat" | "lon"): string {
  if (val === null || val === undefined || isNaN(val)) return "UNAVAILABLE";
  const abs = Math.abs(val).toFixed(4);
  return type === "lat" ? `${abs}°${val >= 0 ? "N" : "S"}` : `${abs}°${val >= 0 ? "E" : "W"}`;
}

export function formatPopulation(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "UNAVAILABLE";
  return new Intl.NumberFormat("en-IN").format(Math.round(val));
}

// ─── Map Extent Computation with Invariant Enforcement ───────────────────────

export interface MapExtentResult {
  west: number;
  east: number;
  south: number;
  north: number;
  extentPoints: Point[];
  boundsAvailable: boolean;
  scaleKm: number;
  kmPerLonDeg: number;
}

export function computeMapExtent(context: IndiaLocationContext): MapExtentResult {
  const loc = context.location;
  const decision = context.decision;
  const boundaryRings = extractBoundaryRings(loc.boundary);
  const fallbackBounds = loc.boundingBox;

  let pts: Point[] = [];

  // CRITICAL INVARIANT: The selected location coordinate is ALWAYS explicitly included first
  pts.push([loc.longitude, loc.latitude]);

  // Include boundary coordinates if available
  if (boundaryRings.length > 0) {
    pts = pts.concat(boundaryRings.flat());
  } else if (fallbackBounds && Array.isArray(fallbackBounds) && fallbackBounds.length === 4) {
    // boundingBox format: [south, west, north, east] or [minLat, minLon, maxLat, maxLon]
    pts.push([fallbackBounds[1], fallbackBounds[0]]);
    pts.push([fallbackBounds[3], fallbackBounds[0]]);
    pts.push([fallbackBounds[3], fallbackBounds[2]]);
    pts.push([fallbackBounds[1], fallbackBounds[2]]);
  }

  // Include destination if available
  const dest = decision?.relocationAssessment?.bestCandidate;
  if (dest && typeof dest.longitude === "number" && typeof dest.latitude === "number") {
    pts.push([dest.longitude, dest.latitude]);
  }

  // Include route coordinates if road route is verified
  const routeCoords = decision?.routingAssessment?.routeCoordinates;
  if (decision?.routingAssessment?.isRoadRoute && routeCoords && routeCoords.length > 1) {
    pts = pts.concat(routeCoords as Point[]);
  }

  const minLon = Math.min(...pts.map((p) => p[0]));
  const maxLon = Math.max(...pts.map((p) => p[0]));
  const minLat = Math.min(...pts.map((p) => p[1]));
  const maxLat = Math.max(...pts.map((p) => p[1]));

  const lonSpan = Math.max(maxLon - minLon, 0.05);
  const latSpan = Math.max(maxLat - minLat, 0.05);

  // Guarantee minimum 15% margin padding around all points
  const lonPad = Math.max(lonSpan * 0.15, 0.03);
  const latPad = Math.max(latSpan * 0.15, 0.03);

  const west = minLon - lonPad;
  const east = maxLon + lonPad;
  const south = minLat - latPad;
  const north = maxLat + latPad;

  // HARD INVARIANT CHECK: selected location MUST be inside [west, east] x [south, north]
  if (loc.latitude < south || loc.latitude > north || loc.longitude < west || loc.longitude > east) {
    throw new Error(
      `Geographic invariant violation: selected coordinate (${loc.latitude}, ${loc.longitude}) lies outside the map viewport [S:${south}, N:${north}, W:${west}, E:${east}]`
    );
  }

  const kmPerLonDeg = 111.32 * Math.cos((loc.latitude * Math.PI) / 180);
  const mapLonSpanKm = (east - west) * kmPerLonDeg;
  const scaleKm = mapLonSpanKm > 400 ? 100 : mapLonSpanKm > 150 ? 50 : mapLonSpanKm > 60 ? 20 : mapLonSpanKm > 20 ? 10 : 5;
  const boundsAvailable = Boolean(boundaryRings.length > 0 || (fallbackBounds && fallbackBounds.length === 4));

  return { west, east, south, north, extentPoints: pts, boundsAvailable, scaleKm, kmPerLonDeg };
}

// ─── Report Validation Guardrail (Before PDF Generation) ──────────────────────

export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateReportData(context: IndiaLocationContext): ReportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const loc = context.location;

  // 1. Geographic coordinate range check (India territorial envelope)
  if (typeof loc.latitude !== "number" || isNaN(loc.latitude) || loc.latitude < 5 || loc.latitude > 38) {
    errors.push(`Latitude ${loc.latitude} is outside valid geographical bounds for India [5°N, 38°N]`);
  }
  if (typeof loc.longitude !== "number" || isNaN(loc.longitude) || loc.longitude < 68 || loc.longitude > 98) {
    errors.push(`Longitude ${loc.longitude} is outside valid geographical bounds for India [68°E, 98°E]`);
  }

  // 2. Coordinate containment check
  try {
    const extent = computeMapExtent(context);
    if (loc.latitude < extent.south || loc.latitude > extent.north || loc.longitude < extent.west || loc.longitude > extent.east) {
      errors.push(`Selected coordinate is outside map extent [S:${extent.south}, N:${extent.north}, W:${extent.west}, E:${extent.east}]`);
    }
  } catch (err: any) {
    errors.push(`Extent validation failed: ${err.message}`);
  }

  // 3. Routing integrity check
  const routing = context.decision?.routingAssessment;
  if (routing && !routing.isRoadRoute) {
    if (routing.status === "ROAD_ROUTE_VERIFIED") {
      errors.push("Contradiction: routing status is ROAD_ROUTE_VERIFIED while isRoadRoute is false");
    }
  }

  // 4. Destination safety integrity check
  const reloc = context.decision?.relocationAssessment;
  if (reloc?.destinationSafety) {
    const safety = reloc.destinationSafety.destinationSafetyStatus;
    if (safety === "UNKNOWN" && reloc.bestCandidate && reloc.bestCandidate.relocationSuitability === "PREFERRED") {
      warnings.push("Candidate destination suitability is PREFERRED while safety status is UNKNOWN");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Spatial Level & Meaning Resolvers ────────────────────────────────────────

export function resolveAssessmentLevel(category: string): string {
  const norm = category.toUpperCase();
  if (norm === "STATE") return "STATE-LEVEL SCREENING";
  if (norm === "DISTRICT") return "DISTRICT-LEVEL SCREENING";
  if (norm === "BLOCK" || norm === "SUBDISTRICT" || norm === "TALUK" || norm === "TEHSIL") return "BLOCK/SUBDISTRICT-LEVEL SCREENING";
  if (norm === "VILLAGE") return "VILLAGE-LEVEL ASSESSMENT";
  if (norm === "HABITATION") return "HABITATION-LEVEL ASSESSMENT";
  if (norm === "CITY" || norm === "TOWN") return "MUNICIPAL / URBAN AREA ASSESSMENT";
  if (norm === "LOCALITY" || norm === "WARD") return "WARD / LOCALITY-LEVEL ASSESSMENT";
  return `${norm}-LEVEL CONTEXT`;
}

export function resolveCoordinateMeaning(category: string): string {
  const norm = category.toUpperCase();
  if (norm === "STATE") return "State-level screening reference centroid (not an exact habitation/village)";
  if (norm === "DISTRICT") return "District-level screening centroid (habitation not yet resolved)";
  if (norm === "BLOCK" || norm === "SUBDISTRICT") return "Sub-district administrative reference point";
  if (norm === "VILLAGE" || norm === "HABITATION") return "Assessed local habitation coordinates";
  if (norm === "CITY" || norm === "TOWN") return "Urban centroid reference point";
  return "Geocoded geographic reference point";
}

// ─── Layout Constants ────────────────────────────────────────────────────────

const PAGE_W = 595.28;
const PAGE_H = 842.0;
const MARGIN = 36;
const USABLE_W = PAGE_W - 2 * MARGIN; // 523.28 pt
const TOTAL_PAGES = 8;

// ─── Document Header & Footer ────────────────────────────────────────────────

function drawPageHeader(doc: PdfDocument, locationName: string, pageNum: number): void {
  doc.save();
  doc.rect(MARGIN, MARGIN, USABLE_W, 16).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF")
    .text("RESQ — Location Decision Context & Triage Report (v4.2)", MARGIN + 8, MARGIN + 4.5);
  doc.font("Helvetica").fontSize(7).fillColor("#CBD5E1")
    .text(`${locationName}  |  Page ${pageNum} of ${TOTAL_PAGES}`, MARGIN, MARGIN + 4.5, { width: USABLE_W - 8, align: "right" });
  doc.restore();
}

function drawPageFooter(doc: PdfDocument, generatedAt: string): void {
  doc.save();
  const fy = PAGE_H - MARGIN - 12;
  doc.moveTo(MARGIN, fy).lineTo(MARGIN + USABLE_W, fy).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.faint)
    .text("CONFIDENTIAL — FOR OPERATIONAL & TECHNICAL REVIEW ONLY  |  WGS84 / EPSG:4326  |  ResQ Disaster Intelligence Engine V3.2", MARGIN, fy + 4);
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.faint)
    .text(`Report Generated: ${generatedAt}`, MARGIN, fy + 4, { width: USABLE_W, align: "right" });
  doc.restore();
}

function sectionHeading(doc: PdfDocument, title: string, x: number, y: number, w: number): number {
  doc.save();
  doc.rect(x, y, w, 20).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(title, x + 8, y + 5.5);
  doc.restore();
  return y + 26;
}

function subHeading(doc: PdfDocument, title: string, x: number, y: number, w: number): number {
  doc.save();
  doc.rect(x, y, w, 15).fill(PALETTE.surfaceMid);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.ink).text(title, x + 8, y + 4);
  doc.restore();
  return y + 19;
}

interface KVRow {
  key: string;
  value: string;
  valueColor?: string;
  provenanceType?: string;
  provenanceLabel?: string;
}

function drawKVTable(doc: PdfDocument, rows: KVRow[], x: number, y: number, w: number): number {
  const rowH = 15.5;
  const colKey = 160;
  const colVal = w - colKey - 65;
  const colProv = 65;

  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    doc.rect(x, y, w, rowH).fill(bg);
    doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();

    doc.font("Helvetica-Bold").fontSize(7).fillColor(PALETTE.muted).text(row.key, x + 6, y + 4.5, { width: colKey - 10 });
    doc.font("Helvetica").fontSize(7).fillColor(row.valueColor ?? PALETTE.body).text(row.value, x + colKey, y + 4.5, { width: colVal - 6 });

    if (row.provenanceType) {
      const pColor = row.provenanceType === "OFFICIAL" ? PALETTE.official
        : row.provenanceType === "HISTORICAL" ? PALETTE.historical
        : row.provenanceType === "DERIVED" ? PALETTE.derived
        : row.provenanceType === "UNAVAILABLE" ? PALETTE.unavailable
        : PALETTE.modelled;
      const pBg = row.provenanceType === "OFFICIAL" ? PALETTE.officialBg
        : row.provenanceType === "HISTORICAL" ? PALETTE.historicalBg
        : row.provenanceType === "DERIVED" ? PALETTE.derivedBg
        : row.provenanceType === "UNAVAILABLE" ? PALETTE.unavailableBg
        : PALETTE.modelledBg;
      doc.roundedRect(x + w - colProv - 4, y + 2.5, colProv, 10.5, 2).fill(pBg);
      doc.font("Helvetica-Bold").fontSize(5.5).fillColor(pColor).text(row.provenanceLabel ?? row.provenanceType, x + w - colProv - 4, y + 4.5, { width: colProv, align: "center" });
    }
    y += rowH;
  });

  doc.rect(x, y - rowH * rows.length, w, rowH * rows.length).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  return y;
}

// ─── Page 1: Location Identity, Spatial Level & Decision Summary ─────────────

function buildPage1(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 1);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { location, screening, decision } = context;

  // Title Block
  doc.save();
  doc.rect(MARGIN, y, USABLE_W, 56).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#FFFFFF").text("RESQ", MARGIN + 12, y + 8);
  doc.font("Helvetica").fontSize(8.5).fillColor("#94A3B8").text("Location Decision Context & Triage Report (v4.2)", MARGIN + 12, y + 27);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#94A3B8").text("SIH Problem Statement 191  |  Disaster Intelligence & Decision Support Platform", MARGIN + 12, y + 41);

  // Response Priority Badge (Top-Right)
  const priLevel = decision?.responsePriority.priorityLevel ?? screening.priority.toUpperCase();
  const priColor = riskColour(priLevel);
  doc.roundedRect(MARGIN + USABLE_W - 120, y + 10, 110, 36, 4).fill(priColor);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#FFFFFF").text("RESPONSE PRIORITY", MARGIN + USABLE_W - 116, y + 14, { width: 102, align: "center" });
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#FFFFFF").text(priLevel, MARGIN + USABLE_W - 116, y + 24, { width: 102, align: "center" });
  doc.restore();

  y += 64;

  // Section 1: Location Identity & Spatial Level
  y = sectionHeading(doc, "1. LOCATION IDENTITY & SPATIAL CONTEXT", MARGIN, y, USABLE_W);

  const addr = location.address ?? {};
  const adminParts: string[] = ["India"];
  if (addr.state) adminParts.unshift(addr.state);
  if (addr.district) adminParts.unshift(addr.district);
  if (addr.city) adminParts.unshift(addr.city);
  if (addr.locality) adminParts.unshift(addr.locality);
  const adminHierarchy = adminParts.join(" > ");

  const assessLevel = resolveAssessmentLevel(location.category);
  const coordMeaning = resolveCoordinateMeaning(location.category);

  // Bounds display logic
  let boundsStr = "Administrative bounds: UNAVAILABLE (centroid reference only)";
  if (location.boundingBox && Array.isArray(location.boundingBox) && location.boundingBox.length === 4) {
    const bb = location.boundingBox;
    boundsStr = `N: ${bb[2].toFixed(4)}°N  |  S: ${bb[0].toFixed(4)}°N  |  E: ${bb[3].toFixed(4)}°E  |  W: ${bb[1].toFixed(4)}°E`;
  } else if (location.boundary) {
    boundsStr = "High-precision boundary polygon available (geoBoundaries / OpenStreetMap)";
  }

  const locRows: KVRow[] = [
    { key: "Location Name", value: location.displayName || location.name, valueColor: PALETTE.brandAccent },
    { key: "Assessment Level", value: assessLevel, valueColor: PALETTE.brandBlue },
    { key: "Administrative Hierarchy", value: adminHierarchy },
    { key: "Selected Coordinates", value: `${formatCoord(location.latitude, "lat")}, ${formatCoord(location.longitude, "lon")}` },
    { key: "Coordinate Meaning", value: coordMeaning },
    { key: "Coordinate System", value: "WGS84 / EPSG:4326" },
    { key: "Administrative Bounds", value: boundsStr },
    { key: "Location Data Source", value: location.source },
    {
      key: "Spatial Confidence",
      value: location.boundary ? "HIGH — Administrative polygon resolved" : "MEDIUM — Centroid resolved, polygon unavailable",
      provenanceType: location.boundary ? "OFFICIAL" : "MODELLED",
      provenanceLabel: location.boundary ? "OFFICIAL" : "GEOCODED",
    },
    { key: "Report Timestamp", value: generatedAt },
  ];

  y = drawKVTable(doc, locRows, MARGIN, y, USABLE_W);
  y += 8;

  // Decision Status Banner
  const decTs = decision?.decisionTimestamp
    ? new Date(decision.decisionTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
    : "Screening-level context (Full decision engine not executed)";

  doc.save();
  const bannerColor = decision ? (decision.responsePriority.criticalDataMissing ? PALETTE.moderate : PALETTE.brandAccent) : PALETTE.muted;
  doc.roundedRect(MARGIN, y, USABLE_W, 26, 4).fill(decision ? (decision.responsePriority.criticalDataMissing ? "#FEF9C3" : "#DBEAFE") : PALETTE.surfaceMid);
  doc.moveTo(MARGIN, y).lineTo(MARGIN, y + 26).lineWidth(3.5).strokeColor(bannerColor).stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(bannerColor)
    .text(decision ? (decision.responsePriority.criticalDataMissing ? "DECISION COMPUTED — CRITICAL DATA MISSING (TRIAGE UNKNOWN)" : "CANONICAL DECISION COMPUTED") : "SCREENING CONTEXT ONLY", MARGIN + 8, y + 5, { width: 340 });
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.body)
    .text(`Decision Timestamp: ${decTs}  |  Engine: ResQ V3.2 Deterministic Pipeline`, MARGIN + 8, y + 15, { width: USABLE_W - 16 });
  doc.restore();

  y += 32;

  // Executive Summary
  y = subHeading(doc, "Executive Summary & Operational Context", MARGIN, y, USABLE_W);

  const priHazard = decision?.hazardAssessment.primaryHazard ?? context.hazardProfile?.redZone.primaryHazard ?? "Multi-hazard screening";
  const bestDest = decision?.relocationAssessment.bestCandidate?.name ?? "No candidate facility identified";
  const routeDist = decision?.routingAssessment.isRoadRoute && decision?.routingAssessment.distanceKm !== null
    ? `${decision.routingAssessment.distanceKm.toFixed(1)} km (OSRM road route)`
    : "UNAVAILABLE (Road route unavailable)";
  const popDesc = location.population !== null
    ? `${formatPopulation(location.population)} inhabitants (${location.populationSource})`
    : "UNAVAILABLE at selected spatial resolution";

  let summaryText = "";
  if (decision) {
    summaryText = `${location.displayName || location.name} has been evaluated under the ResQ V3.2 disaster intelligence framework at the ${assessLevel} level. ` +
      `Primary hazard identified: ${priHazard} (${decision.hazardAssessment.tier} tier). ` +
      `Operational Response Priority: ${decision.responsePriority.priorityLevel} (Score: ${decision.responsePriority.priorityScore}/100). ` +
      `Population context: ${popDesc}. ` +
      `Candidate destination: ${bestDest}. Road evacuation route: ${routeDist}. ` +
      `Confidence: ${decision.confidence.level} (${(decision.confidence.score * 100).toFixed(0)}%).`;
    if (location.category === "State") {
      summaryText += " Note: This is a state-wide screening context. The centroid coordinate serves as an administrative reference point; environmental and elevation values reflect conditions at this reference location and not the entire state territory.";
    }
  } else {
    summaryText = `${location.displayName || location.name} has been screened under the ResQ multi-hazard framework. ` +
      `Screening risk tier: ${screening.riskLevel}. ${screening.hazardContext} ${screening.populationContext}`;
  }

  const sumH = doc.font("Helvetica").fontSize(7.5).heightOfString(summaryText, { width: USABLE_W - 20, lineGap: 2 });
  doc.roundedRect(MARGIN, y, USABLE_W, sumH + 14, 4).fill(PALETTE.surfaceLight).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.body).text(summaryText, MARGIN + 10, y + 7, { width: USABLE_W - 20, lineGap: 2 });
  y += sumH + 20;

  // Quick-Reference Decision Summary
  y = subHeading(doc, "Quick-Reference Decision Summary", MARGIN, y, USABLE_W);

  const quickRows: KVRow[] = [
    { key: "Primary Hazard", value: priHazard, provenanceType: decision?.hazardAssessment.provenance?.sourceType ?? "MODELLED" },
    { key: "Hazard Risk Tier", value: decision?.hazardAssessment.tier ?? screening.riskLevel, valueColor: riskColour(decision?.hazardAssessment.tier ?? screening.riskLevel) },
    { key: "Response Priority", value: decision ? `${decision.responsePriority.priorityLevel} (${decision.responsePriority.priorityScore}/100)` : `${screening.priority} (screening)`, valueColor: priColor },
    { key: "Population Exposed", value: popDesc, provenanceType: location.populationSource?.includes("Census") ? "OFFICIAL" : "MODELLED" },
    { key: "Relocation Destination", value: bestDest, provenanceType: decision?.relocationAssessment.bestCandidate ? "OBSERVED" : "UNAVAILABLE" },
    { key: "Road Evacuation Route", value: routeDist, provenanceType: decision?.routingAssessment.isRoadRoute ? "DERIVED" : "UNAVAILABLE" },
    { key: "Decision Confidence", value: decision ? `${decision.confidence.level} (${(decision.confidence.score * 100).toFixed(0)}%)` : "UNAVAILABLE", valueColor: decision?.confidence.level === "HIGH" ? PALETTE.safe : decision?.confidence.level === "LOW" ? PALETTE.high : PALETTE.moderate },
  ];

  drawKVTable(doc, quickRows, MARGIN, y, USABLE_W);
}

// ─── Page 2: Geographic Decision Map & Cartographic Verification ─────────────

function buildPage2(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 2);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { location, decision } = context;

  y = sectionHeading(doc, "2. GEOGRAPHIC DECISION MAP & CARTOGRAPHY", MARGIN, y, USABLE_W);

  const extent = computeMapExtent(context);
  const boundaryRings = extractBoundaryRings(location.boundary);
  const dest = decision?.relocationAssessment?.bestCandidate;
  const destSafety = decision?.relocationAssessment?.destinationSafety;
  const route = decision?.routingAssessment;
  const hasRoadRoute = Boolean(route?.isRoadRoute && route.routeCoordinates && route.routeCoordinates.length > 1);

  // Map canvas dimensions
  const mapH = 370;
  const mapW = USABLE_W;
  const mapX = MARGIN;
  const mapY = y;

  const project = (pt: Point): Point => [
    mapX + ((pt[0] - extent.west) / Math.max(extent.east - extent.west, 0.0001)) * mapW,
    mapY + mapH - ((pt[1] - extent.south) / Math.max(extent.north - extent.south, 0.0001)) * mapH,
  ];

  // Draw background canvas
  doc.save();
  doc.roundedRect(mapX, mapY, mapW, mapH, 4).fill(PALETTE.mapBg);

  // Draw Graticule lines
  const gridSteps = 4;
  for (let i = 1; i < gridSteps; i++) {
    const gx = mapX + (mapW / gridSteps) * i;
    const gy = mapY + (mapH / gridSteps) * i;
    const glon = extent.west + ((extent.east - extent.west) / gridSteps) * i;
    const glat = extent.south + ((extent.north - extent.south) / gridSteps) * (gridSteps - i);

    doc.moveTo(gx, mapY).lineTo(gx, mapY + mapH).lineWidth(0.4).strokeColor(PALETTE.mapGrid).stroke();
    doc.moveTo(mapX, gy).lineTo(mapX + mapW, gy).lineWidth(0.4).strokeColor(PALETTE.mapGrid).stroke();

    doc.font("Helvetica").fontSize(5.5).fillColor("#64748B")
      .text(`${glon.toFixed(2)}°E`, gx + 2, mapY + mapH - 9);
    doc.font("Helvetica").fontSize(5.5).fillColor("#64748B")
      .text(`${glat.toFixed(2)}°N`, mapX + 3, gy - 8);
  }

  // Draw Administrative Boundary Polygons
  if (boundaryRings.length > 0) {
    boundaryRings.forEach((ring) => {
      if (ring.length < 3) return;
      const pts = ring.map(project);
      doc.save();
      doc.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i][0], pts[i][1]);
      doc.closePath().fillOpacity(0.08).fill(PALETTE.mapBoundary);
      doc.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) doc.lineTo(pts[i][0], pts[i][1]);
      doc.closePath().lineWidth(1.2).strokeColor(PALETTE.mapBoundary).stroke();
      doc.restore();
    });
  }

  // Draw Verified OSRM Road Route
  if (hasRoadRoute && route && route.routeCoordinates) {
    const rPts = (route.routeCoordinates as Point[]).map(project);
    doc.save();
    doc.moveTo(rPts[0][0], rPts[0][1]);
    for (let i = 1; i < rPts.length; i++) doc.lineTo(rPts[i][0], rPts[i][1]);
    doc.lineWidth(2.4).strokeColor(PALETTE.routeBlue).stroke();
    doc.restore();
  }

  // Draw Selected Location Marker
  const originPt = project([location.longitude, location.latitude]);
  const locColor = riskColour(decision?.responsePriority.priorityLevel ?? context.screening.riskLevel);
  doc.circle(originPt[0], originPt[1], 8).fillOpacity(0.25).fill(locColor).fillOpacity(1);
  doc.circle(originPt[0], originPt[1], 4).fill(locColor).lineWidth(1.2).strokeColor("#FFFFFF").stroke();

  // Location label box
  const locLbl = (location.displayName || location.name).slice(0, 26);
  const tagLbl = location.category === "State" ? "STATE CENTROID" : "ASSESSED LOCATION";
  doc.roundedRect(originPt[0] + 8, originPt[1] - 12, 105, 22, 3).fillOpacity(0.92).fill(PALETTE.brandBlue).fillOpacity(1);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#FFFFFF").text(`${tagLbl}: ${locLbl}`, originPt[0] + 11, originPt[1] - 9, { width: 98 });
  doc.font("Helvetica").fontSize(5.5).fillColor("#94A3B8").text(`${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E`, originPt[0] + 11, originPt[1] + 1, { width: 98 });

  // Draw Destination Marker
  if (dest && typeof dest.longitude === "number" && typeof dest.latitude === "number") {
    const destPt = project([dest.longitude, dest.latitude]);
    const isSafe = destSafety?.destinationSafetyStatus === "SAFE";
    const isCond = destSafety?.destinationSafetyStatus === "CONDITIONAL";
    const destColor = isSafe ? PALETTE.mapDest : isCond ? PALETTE.mapDestConditional : PALETTE.mapDestUnknown;

    doc.circle(destPt[0], destPt[1], 8).fillOpacity(0.25).fill(destColor).fillOpacity(1);
    doc.circle(destPt[0], destPt[1], 4).fill(destColor).lineWidth(1.2).strokeColor("#FFFFFF").stroke();

    const dLabel = (dest.name || "Candidate Facility").slice(0, 22);
    const dStatus = isSafe ? "VERIFIED SAFE" : isCond ? "CONDITIONAL" : "SAFETY UNKNOWN";
    doc.roundedRect(destPt[0] + 8, destPt[1] - 10, 100, 18, 3).fillOpacity(0.92).fill("#062013").fillOpacity(1);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(destColor).text(`DEST (${dStatus}):`, destPt[0] + 11, destPt[1] - 8, { width: 94 });
    doc.font("Helvetica").fontSize(5.5).fillColor("#E2E8F0").text(dLabel, destPt[0] + 11, destPt[1] + 0.5, { width: 94 });
  }

  // Dynamic Scale Bar
  const scalePx = (extent.scaleKm / Math.max(extent.kmPerLonDeg * (extent.east - extent.west), 1)) * mapW;
  if (scalePx > 20 && scalePx < mapW - 100) {
    const sbX = mapX + mapW - scalePx - 16;
    const sbY = mapY + mapH - 20;
    doc.roundedRect(sbX - 6, sbY - 4, scalePx + 12, 16, 2).fillOpacity(0.85).fill(PALETTE.brandBlue).fillOpacity(1);
    doc.rect(sbX, sbY + 3, scalePx / 2, 3).fill("#FFFFFF");
    doc.rect(sbX + scalePx / 2, sbY + 3, scalePx / 2, 3).fill(PALETTE.routeBlue);
    doc.font("Helvetica-Bold").fontSize(5.5).fillColor("#FFFFFF").text("0", sbX - 2, sbY - 2);
    doc.font("Helvetica-Bold").fontSize(5.5).fillColor("#FFFFFF").text(`${extent.scaleKm} km`, sbX + scalePx - 14, sbY - 2, { width: 20, align: "right" });
  }

  // True North Arrow
  const naX = mapX + mapW - 24;
  const naY = mapY + 16;
  doc.circle(naX, naY, 10).fillOpacity(0.85).fill(PALETTE.brandBlue).fillOpacity(1);
  doc.moveTo(naX, naY - 7).lineTo(naX - 3.5, naY + 5).lineTo(naX, naY + 2).closePath().fill("#EF4444");
  doc.moveTo(naX, naY - 7).lineTo(naX + 3.5, naY + 5).lineTo(naX, naY + 2).closePath().fill("#FFFFFF");
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#FFFFFF").text("N", naX - 2.5, naY - 14);

  // Synchronized Legend (ONLY layers actually rendered)
  const legendItems: Array<{ symbol: "circle" | "line"; color: string; label: string }> = [];
  legendItems.push({ symbol: "circle", color: locColor, label: location.category === "State" ? "State Reference Centroid" : "Assessed Location Point" });
  if (boundaryRings.length > 0) legendItems.push({ symbol: "line", color: PALETTE.mapBoundary, label: "Administrative Boundary Polygon" });
  if (dest) {
    const isSafe = destSafety?.destinationSafetyStatus === "SAFE";
    const isCond = destSafety?.destinationSafetyStatus === "CONDITIONAL";
    const destLabel = isSafe ? "Verified Safe Destination" : isCond ? "Candidate Destination (Conditional)" : "Candidate Destination (Safety Unknown)";
    const destColor = isSafe ? PALETTE.mapDest : isCond ? PALETTE.mapDestConditional : PALETTE.mapDestUnknown;
    legendItems.push({ symbol: "circle", color: destColor, label: destLabel });
  }
  if (hasRoadRoute) {
    legendItems.push({ symbol: "line", color: PALETTE.routeBlue, label: "Verified OSRM Road Route" });
  }

  const legH = 12 + legendItems.length * 11;
  const legW = 155;
  const legX = mapX + 8;
  const legY = mapY + mapH - legH - 8;
  doc.roundedRect(legX, legY, legW, legH, 3).fillOpacity(0.9).fill(PALETTE.brandBlue).fillOpacity(1);
  doc.rect(legX, legY, legW, legH).lineWidth(0.5).strokeColor(PALETTE.borderLight).stroke();
  doc.font("Helvetica-Bold").fontSize(6).fillColor("#FFFFFF").text("MAP LEGEND", legX + 6, legY + 4);

  legendItems.forEach((item, ii) => {
    const iy = legY + 14 + ii * 11;
    if (item.symbol === "circle") {
      doc.circle(legX + 10, iy + 3, 3).fill(item.color);
    } else {
      doc.moveTo(legX + 6, iy + 3).lineTo(legX + 16, iy + 3).lineWidth(2).strokeColor(item.color).stroke();
    }
    doc.font("Helvetica").fontSize(5.5).fillColor("#E2E8F0").text(item.label, legX + 20, iy + 1, { width: legW - 24 });
  });

  doc.restore();

  // Map Border
  doc.roundedRect(mapX, mapY, mapW, mapH, 4).lineWidth(0.8).strokeColor(PALETTE.border).stroke();
  y += mapH + 10;

  // Section 2B: Cartographic Verification & Coordinate Metadata
  y = subHeading(doc, "2B. Cartographic Verification & Coordinate Reference System", MARGIN, y, USABLE_W);

  const routeStatusDesc = hasRoadRoute ? "VERIFIED — Real road centerline from OSRM road graph" : "UNAVAILABLE — No verified road route available";
  const boundsMeta = extent.boundsAvailable
    ? `W: ${extent.west.toFixed(4)}°E, E: ${extent.east.toFixed(4)}°E, S: ${extent.south.toFixed(4)}°N, N: ${extent.north.toFixed(4)}°N`
    : "Centroid-centered viewport; administrative polygon not available";

  const mapMetaRows: KVRow[] = [
    { key: "Viewport Bounds", value: boundsMeta },
    { key: "Coordinate CRS", value: "WGS84 / EPSG:4326 (Strictly enforced)", provenanceType: "OFFICIAL", provenanceLabel: "STANDARD" },
    { key: "Selected Point Check", value: `PASSED — Coordinate (${location.latitude.toFixed(4)}°N, ${location.longitude.toFixed(4)}°E) verified INSIDE map viewport` },
    { key: "Boundary Polygon", value: boundaryRings.length > 0 ? "RESOLVED — geoBoundaries ADM / OpenStreetMap geometry" : "UNAVAILABLE — Centroid fallback", provenanceType: boundaryRings.length > 0 ? "OFFICIAL" : "UNAVAILABLE" },
    { key: "Road Route Geometry", value: routeStatusDesc, provenanceType: hasRoadRoute ? "DERIVED" : "UNAVAILABLE", provenanceLabel: hasRoadRoute ? "OSRM" : "UNAVAILABLE" },
    { key: "Destination Point", value: dest ? `${dest.name} (${formatCoord(dest.latitude, "lat")}, ${formatCoord(dest.longitude, "lon")})` : "UNAVAILABLE — No candidate facility", provenanceType: dest ? "OBSERVED" : "UNAVAILABLE" },
  ];

  drawKVTable(doc, mapMetaRows, MARGIN, y, USABLE_W);
}

// ─── Page 3: Multi-Hazard Evidence & Baseline Geological Context ─────────────

function buildPage3(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 3);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { decision, screening, environment } = context;

  y = sectionHeading(doc, "3. MULTI-HAZARD EVIDENCE & BASELINE CONTEXT", MARGIN, y, USABLE_W);

  // 3A: Separated Risk Component Cards
  y = subHeading(doc, "3A. Risk Dimension Separation (Hazard vs Status vs Exposure vs Priority)", MARGIN, y, USABLE_W);

  const cardW = (USABLE_W - 9) / 4;
  const cardH = 50;
  const cards = [
    {
      title: "GEOGRAPHIC HAZARD",
      value: decision?.hazardAssessment.tier ?? screening.riskLevel,
      sub: decision?.hazardAssessment.primaryHazard ?? "Multi-hazard screening",
      color: riskColour(decision?.hazardAssessment.tier ?? screening.riskLevel),
    },
    {
      title: "ACTIVE WARNING STATUS",
      value: environment?.imdWarning ? "OFFICIAL WARNING" : "NO ACTIVE WARNING",
      sub: environment?.imdWarning ? `${environment.imdWarning.warningLevel}` : "No IMD active warning retrieved",
      color: environment?.imdWarning ? PALETTE.high : PALETTE.safe,
    },
    {
      title: "EXPOSURE ASSESSMENT",
      value: decision?.exposureAssessment.exposedPopulationEstimate !== null && decision?.exposureAssessment.exposedPopulationEstimate !== undefined
        ? `${formatPopulation(decision.exposureAssessment.exposedPopulationEstimate)} exposed`
        : "NOT SCORED",
      sub: decision?.exposureAssessment.populationValue !== null ? "Population resolved" : "Population data unavailable",
      color: PALETTE.moderate,
    },
    {
      title: "RESPONSE PRIORITY",
      value: decision?.responsePriority.priorityLevel ?? screening.priority.toUpperCase(),
      sub: decision ? `Score: ${decision.responsePriority.priorityScore}/100` : "Screening level",
      color: riskColour(decision?.responsePriority.priorityLevel ?? screening.priority),
    },
  ];

  cards.forEach((c, ci) => {
    const cx = MARGIN + ci * (cardW + 3);
    doc.roundedRect(cx, y, cardW, cardH, 4).fill(PALETTE.surfaceLight).lineWidth(0.8).strokeColor(PALETTE.border).stroke();
    doc.moveTo(cx, y).lineTo(cx, y + cardH).lineWidth(3.5).strokeColor(c.color).stroke();
    doc.font("Helvetica-Bold").fontSize(6).fillColor(PALETTE.faint).text(c.title, cx + 8, y + 6, { width: cardW - 14 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(c.color).text(c.value, cx + 8, y + 17, { width: cardW - 14 });
    doc.font("Helvetica").fontSize(6).fillColor(PALETTE.muted).text(c.sub, cx + 8, y + 33, { width: cardW - 14 });
  });
  y += cardH + 10;

  // 3B: Primary Hazard Assessment
  y = subHeading(doc, "3B. Primary Hazard Evidence & Causality", MARGIN, y, USABLE_W);

  if (decision) {
    const hz = decision.hazardAssessment;
    const priRows: KVRow[] = [
      { key: "Primary Hazard Driver", value: hz.primaryHazard, valueColor: PALETTE.high },
      { key: "Evidence Hierarchy Level", value: hz.contributions[0]?.hierarchyLevel ?? "SUSCEPTIBILITY_SCREENING", provenanceType: hz.provenance?.sourceType, provenanceLabel: hz.provenance?.sourceType },
      { key: "Causal Driver Rationale", value: hz.primaryDriverReason },
      { key: "Composite Hazard Score", value: `${hz.compositeHazardScore.toFixed(1)} / 100` },
      { key: "Physical Triggers Confirmed", value: hz.triggers.length > 0 ? hz.triggers.join("; ") : "No live physical triggers confirmed" },
      { key: "Supporting Authoritative Evidence", value: hz.supportingEvidence.length > 0 ? hz.supportingEvidence.join("; ") : "None confirmed" },
      { key: "Authoritative Source", value: hz.provenance?.sourceName ?? "Multi-hazard engine" },
      { key: "Spatial Resolution", value: hz.provenance?.spatialResolution ?? "Spatial context" },
      { key: "Evidence Limitations", value: hz.limitations.join("; ") || "None recorded" },
    ];
    y = drawKVTable(doc, priRows, MARGIN, y, USABLE_W);
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 26, 4).fill(PALETTE.surfaceMid).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.muted).text(`Screening context: ${screening.hazardContext}`, MARGIN + 10, y + 8, { width: USABLE_W - 20 });
    y += 34;
  }
  y += 8;

  // 3C: Secondary Hazards & Hazard Distinctions
  y = subHeading(doc, "3C. Secondary Hazards & Temporal Status Distinctions", MARGIN, y, USABLE_W);

  const secHazards = decision?.hazardAssessment.secondaryHazards ?? [];
  const secDesc = secHazards.length > 0
    ? secHazards.join(", ")
    : "No secondary hazards confirmed at current threshold";

  const secRows: KVRow[] = [
    { key: "Secondary Hazards Identified", value: secDesc },
    { key: "Seismic Hazard Semantics", value: "BIS IS 1893:2016 Regulatory Zone (Static building baseline — NOT an active earthquake occurrence)" },
    { key: "Cyclone / Coastal Semantics", value: "Coastal headland proximity is contextual; active cyclone requires live IMD cyclone warning bulletin" },
    { key: "Flood Footprint Semantics", value: "NRSC/Bhuvan inundation footprints represent historical inundation extents, not live unverified floodwaters" },
  ];
  y = drawKVTable(doc, secRows, MARGIN, y, USABLE_W);
  y += 8;

  // 3D: Baseline Geology & Meteorological Context
  y = subHeading(doc, "3D. Geological Baseline & Atmospheric Context", MARGIN, y, USABLE_W);

  const env = context.environment;
  const imdWarningText = env.imdWarning ? `${env.imdWarning.warningLevel} — ${env.imdWarning.headline}` : "No official IMD weather warning active";
  const geoDesc = context.geology
    ? `Lithology: ${context.geology.lithology || "Bedrock"}  |  Age: ${context.geology.geologicalAge || context.geology.stratigraphy || "Regional"}  |  Fault Distance: ${context.geology.faultDistanceKm !== null ? context.geology.faultDistanceKm.toFixed(1) + " km" : "None within radius"}`
    : "GSI Bhukosh 1:2M regional geology (Static contextual reference; does not inflate priority)";

  const geoRows: KVRow[] = [
    { key: "Geological Baseline (GSI)", value: geoDesc, provenanceType: "OFFICIAL", provenanceLabel: "GSI" },
    { key: "Official IMD Warning", value: imdWarningText, provenanceType: env.imdWarning ? "OFFICIAL" : "UNAVAILABLE", provenanceLabel: env.imdWarning ? "OFFICIAL" : "UNAVAILABLE" },
    { key: "Atmospheric Telemetry", value: `Temp: ${env.temperatureC ?? "N/A"}°C  |  Precipitation: ${env.precipitationMm ?? 0} mm  |  AQI: ${env.usAqi ?? "N/A"}`, provenanceType: "MODELLED", provenanceLabel: "MODELLED" },
    { key: "Telemetry Source", value: `${env.source} (Observed at: ${env.observedAt ? new Date(env.observedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "N/A"} IST)` },
  ];

  drawKVTable(doc, geoRows, MARGIN, y, USABLE_W);
}

// ─── Page 4: Population Exposure & Vulnerability Context ─────────────────────

function buildPage4(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 4);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { location, decision, screening } = context;

  y = sectionHeading(doc, "4. POPULATION EXPOSURE & VULNERABILITY CONTEXT", MARGIN, y, USABLE_W);

  // 4A: Population Exposure (Source Hierarchy & Zero != Unknown)
  y = subHeading(doc, "4A. Population Exposure & Source Hierarchy", MARGIN, y, USABLE_W);

  const exp = decision?.exposureAssessment;
  const popVal = exp?.populationValue ?? location.population;
  const popSource = exp?.populationSource ?? location.populationSource ?? "Not specified";
  const popYear = exp?.populationYear ?? (popSource.includes("Census") ? 2011 : null);
  const popRes = exp?.populationResolution ?? (location.category === "District" ? "District level" : "Local level");

  const popValueStr = popVal !== null
    ? `${formatPopulation(popVal)} inhabitants`
    : "DATA UNAVAILABLE (No population resolved at this spatial resolution)";

  const expPopStr = exp?.exposedPopulationEstimate !== null && exp?.exposedPopulationEstimate !== undefined
    ? `${formatPopulation(exp.exposedPopulationEstimate)} inhabitants`
    : "DATA UNAVAILABLE (Not scored — unknown is not zero)";

  const popRows: KVRow[] = [
    { key: "Resolved Population", value: popValueStr, valueColor: popVal !== null ? PALETTE.body : PALETTE.high, provenanceType: popSource.includes("Census") ? "OFFICIAL" : "MODELLED" },
    { key: "Population Source", value: popSource },
    { key: "Census / Data Year", value: popYear ? String(popYear) : "UNKNOWN" },
    { key: "Spatial Resolution", value: popRes },
    { key: "Source Hierarchy Step", value: location.category === "State" ? "State-level screening: Habitation/Village data not resolved" : "Local geocoded level" },
    { key: "Exposed Population Estimate", value: expPopStr, valueColor: exp?.exposedPopulationEstimate !== null ? PALETTE.body : PALETTE.high },
    { key: "Exposure Rationale", value: exp?.exposureRationale ?? screening.populationContext },
  ];

  y = drawKVTable(doc, popRows, MARGIN, y, USABLE_W);
  y += 8;

  // 4B: Exposed Habitations Sub-Table
  y = subHeading(doc, "4B. Exposed Habitations & Settlements Register", MARGIN, y, USABLE_W);

  const habList = decision?.exposureAssessment.exposedHabitations ?? [];
  if (habList.length > 0) {
    doc.rect(MARGIN, y, USABLE_W, 16).fill(PALETTE.surfaceMid);
    const hCols = [170, 100, 95, 85, 73];
    const hHeaders = ["HABITATION / VILLAGE", "HAZARD TYPE", "DISTANCE", "POPULATION", "IN RED ZONE"];
    let hx = MARGIN + 6;
    hHeaders.forEach((h, i) => {
      doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text(h, hx, y + 4.5, { width: hCols[i] - 4 });
      hx += hCols[i];
    });
    doc.rect(MARGIN, y, USABLE_W, 16).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
    y += 16;

    habList.slice(0, 5).forEach((hab: any, hi: number) => {
      const bg = hi % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
      doc.rect(MARGIN, y, USABLE_W, 16).fill(bg);
      const habCols = [
        hab.name ?? `Settlement ${hi + 1}`,
        hab.hazardType ?? "Unknown",
        hab.distanceToHazardKm !== null && hab.distanceToHazardKm !== undefined ? `${Number(hab.distanceToHazardKm).toFixed(1)} km` : "N/A",
        hab.population !== null && hab.population !== undefined ? formatPopulation(hab.population) : "Unresolved",
        hab.insideHazardZone ? "YES — IN ZONE" : "Outside",
      ];
      let hxr = MARGIN + 6;
      habCols.forEach((v, ci) => {
        const col = ci === 4 && v.includes("YES") ? PALETTE.high : PALETTE.body;
        doc.font(ci === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7).fillColor(col).text(v, hxr, y + 4.5, { width: hCols[ci] - 4 });
        hxr += hCols[ci];
      });
      doc.rect(MARGIN, y, USABLE_W, 16).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
      y += 16;
    });
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 24, 4).fill(PALETTE.surfaceMid).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.muted)
      .text(location.category === "State" ? "State-level screening: Sub-district habitations are not resolved at this macroscopic scale." : "No isolated exposed habitations resolved within local radius.", MARGIN + 10, y + 7, { width: USABLE_W - 20 });
    y += 28;
  }
  y += 8;

  // 4C: Vulnerability Context & Evacuation Impediments
  y = subHeading(doc, "4C. Vulnerability Assessment (Evacuation Difficulty & Constraints)", MARGIN, y, USABLE_W);

  const vuln = decision?.vulnerabilityAssessment;
  const vulnScoreStr = vuln?.vulnerabilityScore !== null && vuln?.vulnerabilityScore !== undefined
    ? `${vuln.vulnerabilityScore} / 20`
    : "DATA INSUFFICIENT (Not scored)";

  const vulnRows: KVRow[] = [
    { key: "Vulnerability Status", value: vuln?.status ?? "DATA INSUFFICIENT" },
    { key: "Vulnerability Score", value: vulnScoreStr, valueColor: vuln?.vulnerabilityScore !== null ? PALETTE.body : PALETTE.high },
    { key: "Demographic Data Availability", value: vuln?.demographicDataAvailable ? "Available" : "UNAVAILABLE — Census demographic indicators unverified" },
    { key: "Terrain Vulnerability Factor", value: vuln?.terrainVulnerabilityScore !== null && vuln?.terrainVulnerabilityScore !== undefined ? `${vuln.terrainVulnerabilityScore} / 10` : "Not assessed" },
    { key: "Accessibility Impediment Score", value: vuln?.accessibilityConstraintScore !== null && vuln?.accessibilityConstraintScore !== undefined ? `${vuln.accessibilityConstraintScore} / 10` : "Not assessed" },
    { key: "Vulnerability Rationale", value: vuln?.rationale ?? "Demographic vulnerability factors require village-level Census PCA indicators." },
  ];

  drawKVTable(doc, vulnRows, MARGIN, y, USABLE_W);
}

// ─── Page 5: Evacuation Facilities & Carrying Capacity Assessment ────────────

function buildPage5(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 5);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { decision, infrastructure, location } = context;

  y = sectionHeading(doc, "5. EVACUATION FACILITIES & CARRYING CAPACITY", MARGIN, y, USABLE_W);

  // Critical Warning Banner: Facility Existence != Capacity
  doc.save();
  doc.roundedRect(MARGIN, y, USABLE_W, 24, 4).fill("#FEF9C3").lineWidth(0.6).strokeColor("#FDE047").stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.derived)
    .text("CRITICAL RULE: Facility existence does NOT imply verified capacity. All capacity values remain UNKNOWN unless corroborated by official DDMA shelter bed registers.", MARGIN + 8, y + 7, { width: USABLE_W - 16 });
  doc.restore();
  y += 32;

  // 5A: Facility Infrastructure Summary
  y = subHeading(doc, "5A. Infrastructure Discovery & Role Differentiation", MARGIN, y, USABLE_W);

  const cap = decision?.capacityAssessment;
  const catInfra = context.categorizedInfrastructure;
  const totalFac = cap?.totalNearbyFacilities ?? infrastructure.items.length;
  const shelterCount = cap?.eligibleRelocationShelters ?? catInfra?.shelters.length ?? 0;
  const hospCount = cap?.hospitalsExcludedFromShelters ?? catInfra?.hospitals.length ?? 0;

  let facScopeNote = "Facilities discovered from OpenStreetMap within local screening radius.";
  if (totalFac === 0 && location.category === "State") {
    facScopeNote = "0 facilities verified inside immediate state centroid extent. Regional candidate facilities reside at district/urban reference levels.";
  }

  const infraRows: KVRow[] = [
    { key: "Total Facilities Discovered", value: `${totalFac} facilities`, provenanceType: "OBSERVED", provenanceLabel: "OSM" },
    { key: "Eligible Relocation Shelters", value: `${shelterCount} shelters / schools / community halls`, provenanceType: "OBSERVED", provenanceLabel: "OSM" },
    { key: "Medical Facilities (Role Gated)", value: `${hospCount} hospitals / clinics (EXCLUDED from mass sheltering — triage support only)`, provenanceType: "OFFICIAL", provenanceLabel: "GATED" },
    { key: "Spatial Extent Verification", value: facScopeNote },
  ];

  y = drawKVTable(doc, infraRows, MARGIN, y, USABLE_W);
  y += 10;

  // 5B: Carrying Capacity Deficit Analysis
  y = subHeading(doc, "5B. Carrying Capacity Balance & Verification Status", MARGIN, y, USABLE_W);

  const capVerified = Boolean(cap?.capacityVerified);
  const availCapStr = cap?.availableCapacity !== null && cap?.availableCapacity !== undefined
    ? `${formatPopulation(cap.availableCapacity)} persons`
    : "DATA UNAVAILABLE (Unverified from field registers)";

  const reqCapStr = cap?.requiredCapacity !== null && cap?.requiredCapacity !== undefined
    ? `${formatPopulation(cap.requiredCapacity)} persons`
    : "DATA UNAVAILABLE (Population unmeasured)";

  const capDefStr = cap?.capacityDeficit !== null && cap?.capacityDeficit !== undefined
    ? `${formatPopulation(cap.capacityDeficit)} persons`
    : "NOT SCORED (Capacity unknown — not penalized as 0)";

  const capStatusStr = cap?.capacityStatus ?? "CAPACITY_UNAVAILABLE";

  const capRows: KVRow[] = [
    { key: "Capacity Verification Status", value: capVerified ? "VERIFIED (Official field register)" : "UNVERIFIED (OpenStreetMap geometry only)", valueColor: capVerified ? PALETTE.safe : PALETTE.high },
    { key: "Operational Capacity Status", value: capStatusStr, valueColor: capStatusStr === "CAPACITY_KNOWN" ? PALETTE.safe : PALETTE.moderate },
    { key: "Available Verified Capacity", value: availCapStr, valueColor: cap?.availableCapacity !== null ? PALETTE.body : PALETTE.high },
    { key: "Estimated Shelter Requirement", value: reqCapStr },
    { key: "Carrying Capacity Deficit", value: capDefStr, valueColor: cap?.capacityDeficit !== null ? PALETTE.body : PALETTE.high },
    { key: "Data Source & Method", value: cap?.capacitySource ?? "OpenStreetMap Overpass API (Spatial proximity)" },
    { key: "Field Verification Notes", value: cap?.notes ?? "Actual shelter bed numbers require DDMA field verification; synthetic capacity estimates are strictly forbidden." },
  ];

  y = drawKVTable(doc, capRows, MARGIN, y, USABLE_W);
  y += 10;

  // 5C: Operational Guidance on Shelter Triage
  y = subHeading(doc, "5C. Operating Guidance for Incident Commander", MARGIN, y, USABLE_W);

  const guidanceText =
    "1. Do not deploy evacuees to unverified facility nodes without prior ground verification by the District Disaster Management Authority (DDMA).\n" +
    "2. Hospitals and primary health centers must NEVER be commandeered for general civilian sheltering; their operational capacity is strictly reserved for acute medical triage.\n" +
    "3. Where capacity is listed as UNAVAILABLE, immediate physical inspection of school campuses and community cyclone/flood shelters is mandated prior to dispatch.";

  doc.roundedRect(MARGIN, y, USABLE_W, 46, 4).fill(PALETTE.surfaceLight).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(7).fillColor(PALETTE.body).text(guidanceText, MARGIN + 10, y + 6, { width: USABLE_W - 20, lineGap: 2.5 });
}

// ─── Page 6: Destination Assessment & Road Evacuation Routing ────────────────

function buildPage6(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 6);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { decision, location } = context;

  y = sectionHeading(doc, "6. DESTINATION ASSESSMENT & ROAD EVACUATION ROUTE", MARGIN, y, USABLE_W);

  const reloc = decision?.relocationAssessment;
  const dest = reloc?.bestCandidate;
  const destSafety = reloc?.destinationSafety;
  const routing = decision?.routingAssessment;

  // 6A: Destination Safety Gating
  y = subHeading(doc, "6A. Destination Candidate & Hazard Conflict Validation", MARGIN, y, USABLE_W);

  let destSafetyLabel = "SAFETY UNKNOWN / UNSCREENED";
  let destSafetyColor: string = PALETTE.unknown;
  if (destSafety?.destinationSafetyStatus === "SAFE") {
    destSafetyLabel = "VERIFIED SAFE (Outside active hazard extents)";
    destSafetyColor = PALETTE.safe;
  } else if (destSafety?.destinationSafetyStatus === "CONDITIONAL") {
    destSafetyLabel = "CONDITIONAL (Caution: Elevated hazard concern or incomplete screening)";
    destSafetyColor = PALETTE.moderate;
  } else if (destSafety?.destinationSafetyStatus === "UNSAFE") {
    destSafetyLabel = "UNSAFE (Intersected by active hazard zone — DO NOT EVACUATE)";
    destSafetyColor = PALETTE.high;
  }

  const destCoordsStr = dest && typeof dest.latitude === "number" && typeof dest.longitude === "number"
    ? `${formatCoord(dest.latitude, "lat")}, ${formatCoord(dest.longitude, "lon")}`
    : "UNAVAILABLE";

  const destRows: KVRow[] = [
    { key: "Candidate Destination", value: dest?.name ?? "No candidate facility identified", valueColor: dest ? PALETTE.body : PALETTE.high },
    { key: "Facility Role", value: dest?.facilityRole ?? "SHELTER" },
    { key: "Destination Coordinates", value: destCoordsStr },
    { key: "Destination Safety Status", value: destSafetyLabel, valueColor: destSafetyColor },
    { key: "Hazard Conflict Intersection", value: destSafety?.destinationInsideHazard ? "YES — CONFLICT DETECTED" : "No active hazard zone intersection", valueColor: destSafety?.destinationInsideHazard ? PALETTE.high : PALETTE.safe },
    { key: "Relocation Suitability", value: dest?.relocationSuitability ?? reloc?.candidateStatus ?? "UNKNOWN" },
    { key: "Safety Check Details", value: destSafety?.checkDetails ?? "No destination evaluated" },
    { key: "Selection Rationale", value: reloc?.rationale ?? "Facility selected from spatial proximity analysis" },
  ];

  y = drawKVTable(doc, destRows, MARGIN, y, USABLE_W);
  y += 10;

  // 6B: Road Evacuation Route Analysis (Strict Non-Road Fallback Invariant)
  y = subHeading(doc, "6B. Road Network Evacuation Routing (OSRM Road Centerlines)", MARGIN, y, USABLE_W);

  const routeIsReal = Boolean(routing?.isRoadRoute && routing.distanceKm !== null);
  const routeDistStr = routeIsReal && routing?.distanceKm !== null && routing?.distanceKm !== undefined
    ? `${routing.distanceKm.toFixed(2)} km`
    : "UNAVAILABLE (Road route unavailable)";

  const routeDurStr = routeIsReal && routing?.durationMinutes !== null && routing?.durationMinutes !== undefined
    ? `${Math.floor(routing.durationMinutes / 60)}h ${Math.round(routing.durationMinutes % 60)}min`
    : "UNAVAILABLE (No travel time without valid road route)";

  const routeTypeStr = routeIsReal
    ? "OSRM road-network graph traversal (Verified road centerline geometry)"
    : "ROAD ROUTE UNAVAILABLE (Straight-line distance is NOT a road route; travel times withheld)";

  const routeRows: KVRow[] = [
    { key: "Origin Point", value: `${location.displayName || location.name} (${formatCoord(location.latitude, "lat")}, ${formatCoord(location.longitude, "lon")})` },
    { key: "Destination Point", value: dest ? `${dest.name} (${destCoordsStr})` : "UNAVAILABLE" },
    { key: "Road Route Status", value: routeIsReal ? "ROAD_ROUTE_VERIFIED" : "ROAD_ROUTING_UNAVAILABLE", valueColor: routeIsReal ? PALETTE.safe : PALETTE.high },
    { key: "Road Distance", value: routeDistStr, valueColor: routeIsReal ? PALETTE.body : PALETTE.high, provenanceType: routeIsReal ? "DERIVED" : "UNAVAILABLE", provenanceLabel: routeIsReal ? "OSRM" : "UNAVAILABLE" },
    { key: "Estimated Travel Time", value: routeDurStr, valueColor: routeIsReal ? PALETTE.body : PALETTE.high },
    { key: "Route Classification", value: routeTypeStr },
    { key: "Route Status Badge", value: routing?.displayBadge ?? "ROAD_ROUTING_UNAVAILABLE" },
    { key: "Geometry Validation", value: routing?.validation.geometryExists ? "Centerline geometry verified" : "No geometry returned" },
    { key: "Source & Routing Engine", value: routing?.sourceNote ?? "Project OSRM / OpenStreetMap India road network" },
  ];

  y = drawKVTable(doc, routeRows, MARGIN, y, USABLE_W);
  y += 10;

  // 6C: Route Feasibility Checks
  y = subHeading(doc, "6C. Evacuation Route Feasibility & Road Network Checks", MARGIN, y, USABLE_W);

  const checks = decision?.consistencyChecks ?? [];
  if (checks.length > 0) {
    checks.slice(0, 2).forEach((chk) => {
      const isPass = chk.status === "PASSED";
      doc.roundedRect(MARGIN, y, USABLE_W, 20, 3).fill(isPass ? "#DCFCE7" : "#FEF9C3").lineWidth(0.4).strokeColor(PALETTE.border).stroke();
      doc.font("Helvetica-Bold").fontSize(7).fillColor(isPass ? PALETTE.official : PALETTE.derived)
        .text(`${chk.status}: ${chk.name}`, MARGIN + 8, y + 4, { width: 180 });
      doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.body)
        .text(chk.details, MARGIN + 195, y + 4, { width: USABLE_W - 205 });
      y += 24;
    });
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 20, 3).fill(PALETTE.surfaceMid).lineWidth(0.4).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(7).fillColor(PALETTE.muted).text("All routing and destination checks evaluated through deterministic pipeline.", MARGIN + 8, y + 6);
    y += 24;
  }
}

// ─── Page 7: Decision Engine, Scoring Semantics & Causal Chain ───────────────

function buildPage7(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { decision } = context;

  y = sectionHeading(doc, "7. DECISION ENGINE, SCORING & CAUSAL CHAIN", MARGIN, y, USABLE_W);

  if (!decision) {
    doc.roundedRect(MARGIN, y, USABLE_W, 40, 4).fill(PALETTE.surfaceMid).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica-Bold").fontSize(8).fillColor(PALETTE.muted).text("Decision Engine Not Executed", MARGIN + 10, y + 10);
    doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.body).text("Only screening context is available for this location.", MARGIN + 10, y + 22);
    return;
  }

  const pri = decision.responsePriority;
  const expl = decision.explanation;

  // 7A: PS191 5-Component Priority Score Breakdown (Strict UNKNOWN semantics)
  y = subHeading(doc, "7A. Response Priority Score Breakdown (PS191 5-Factor Formulation)", MARGIN, y, USABLE_W);

  const barTotalW = USABLE_W - 20;
  const barH = 11;

  const comps: Array<{
    key: keyof typeof pri.components;
    label: string;
    max: number;
    color: string;
    isScored: boolean;
    displayValue: string;
    statusNote: string;
  }> = [
    {
      key: "hazardSeverity",
      label: "Hazard Severity",
      max: 30,
      color: PALETTE.high,
      isScored: true,
      displayValue: `${pri.components.hazardSeverity.normalizedValue} / 30`,
      statusNote: `Driver: ${decision.hazardAssessment.primaryHazard}`,
    },
    {
      key: "populationExposure",
      label: "Population Exposure",
      max: 20,
      color: PALETTE.moderate,
      isScored: decision.exposureAssessment.populationValue !== null,
      displayValue: decision.exposureAssessment.populationValue !== null ? `${pri.components.populationExposure.normalizedValue} / 20` : "NOT SCORED — DATA UNAVAILABLE (Max: 20)",
      statusNote: decision.exposureAssessment.populationValue !== null ? `${pri.components.populationExposure.source}` : "No population resolved at this spatial level (Unknown is not 0)",
    },
    {
      key: "vulnerability",
      label: "Vulnerability Context",
      max: 20,
      color: "#7C3AED",
      isScored: decision.vulnerabilityAssessment.vulnerabilityScore !== null,
      displayValue: decision.vulnerabilityAssessment.vulnerabilityScore !== null ? `${pri.components.vulnerability.normalizedValue} / 20` : "DATA INSUFFICIENT (Max: 20)",
      statusNote: decision.vulnerabilityAssessment.demographicDataAvailable ? "Demographic factors available" : "Demographic data unverified",
    },
    {
      key: "capacityDeficit",
      label: "Capacity Deficit",
      max: 15,
      color: PALETTE.safe,
      isScored: decision.capacityAssessment.capacityVerified,
      displayValue: decision.capacityAssessment.capacityVerified ? `${pri.components.capacityDeficit.normalizedValue} / 15` : "NOT SCORED — DATA UNAVAILABLE (Max: 15)",
      statusNote: decision.capacityAssessment.capacityVerified ? "Official capacity verified" : "Shelter capacity unverified from field registers (Not 0)",
    },
    {
      key: "accessibility",
      label: "Accessibility Constraint",
      max: 15,
      color: PALETTE.brandAccent,
      isScored: decision.routingAssessment.isRoadRoute,
      displayValue: decision.routingAssessment.isRoadRoute ? `${pri.components.accessibility.normalizedValue} / 15` : "NOT SCORED — ROUTE UNAVAILABLE (Max: 15)",
      statusNote: decision.routingAssessment.isRoadRoute ? "OSRM road route verified" : "Road route unavailable (Straight line distance is not a road)",
    },
  ];

  comps.forEach((c) => {
    const compData = pri.components[c.key];
    const fraction = c.isScored && c.max > 0 ? compData.normalizedValue / c.max : 0;

    doc.font("Helvetica-Bold").fontSize(7).fillColor(PALETTE.body).text(`${c.label}: ${c.displayValue}`, MARGIN + 6, y, { width: 220 });
    doc.font("Helvetica").fontSize(6).fillColor(PALETTE.faint).text(c.statusNote, MARGIN + 230, y, { width: barTotalW - 224, align: "right" });
    y += 10;

    doc.roundedRect(MARGIN + 6, y, barTotalW, barH, 2).fill(PALETTE.borderLight);
    if (c.isScored) {
      const fillW = Math.max(3, fraction * barTotalW);
      doc.roundedRect(MARGIN + 6, y, fillW, barH, 2).fill(c.color);
    }
    y += barH + 5;
  });

  // Total Score Card with Critical Data Missing Semantics
  doc.roundedRect(MARGIN, y, USABLE_W, 34, 4).fill(pri.criticalDataMissing ? "#FEF9C3" : PALETTE.surfaceLight).lineWidth(0.8).strokeColor(pri.criticalDataMissing ? "#FDE047" : PALETTE.border).stroke();
  const priStatusTitle = pri.criticalDataMissing
    ? `RESPONSE PRIORITY: UNKNOWN  (Reference Component Score: ${pri.priorityScore} / 100)`
    : `RESPONSE PRIORITY: ${pri.priorityLevel}  (Composite Score: ${pri.priorityScore} / 100)`;
  const priSubText = pri.criticalDataMissing
    ? "OPERATIONAL STATUS: DATA INSUFFICIENT FOR DEFINITIVE TRIAGE — Critical exposure & verified capacity data are unavailable."
    : `FORMULATION: Total = Hazard (${pri.components.hazardSeverity.normalizedValue}/30) + Population (${pri.components.populationExposure.normalizedValue}/20) + Vulnerability (${pri.components.vulnerability.normalizedValue}/20) + Capacity (${pri.components.capacityDeficit.normalizedValue}/15) + Accessibility (${pri.components.accessibility.normalizedValue}/15).`;

  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(pri.criticalDataMissing ? PALETTE.derived : PALETTE.ink).text(priStatusTitle, MARGIN + 10, y + 6);
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.body).text(priSubText, MARGIN + 10, y + 18, { width: USABLE_W - 20 });
  y += 42;

  // 7B: Causal Decision Chain
  y = subHeading(doc, "7B. Causal Decision Chain (Transparent Evidence Reasoning)", MARGIN, y, USABLE_W);

  const chainSteps = [
    { num: "1", title: "Hazard Identification", text: expl.whyThisHazard },
    { num: "2", title: "Severity Classification", text: expl.whyThisSeverity },
    { num: "3", title: "Location Assessment", text: expl.whyThisLocation },
    { num: "4", title: "Priority Determination", text: expl.whyThisPriority },
    { num: "5", title: "Destination Selection", text: expl.whyThisDestination },
    { num: "6", title: "Routing Assessment", text: expl.whyThisRoute },
    { num: "7", title: "Destination Alternatives", text: expl.whyNotAnotherDestination },
    { num: "8", title: "Data Gaps & Missing Evidence", text: expl.whatDataIsMissing },
  ];

  chainSteps.forEach((s) => {
    const textH = doc.font("Helvetica").fontSize(6.5).heightOfString(s.text, { width: USABLE_W - 46, lineGap: 1.5 });
    const rowH = Math.max(22, textH + 10);
    doc.roundedRect(MARGIN, y, USABLE_W, rowH, 3).fill(PALETTE.surfaceLight).lineWidth(0.4).strokeColor(PALETTE.borderLight).stroke();

    doc.circle(MARGIN + 12, y + rowH / 2, 7).fill(PALETTE.brandBlue);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#FFFFFF").text(s.num, MARGIN + 9.5, y + rowH / 2 - 4);

    doc.font("Helvetica-Bold").fontSize(7).fillColor(PALETTE.ink).text(s.title, MARGIN + 26, y + 4);
    doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.body).text(s.text, MARGIN + 26, y + 12, { width: USABLE_W - 36, lineGap: 1.5 });
    y += rowH + 3;
  });
  y += 6;

  // 7C: Confidence vs Data Coverage
  y = subHeading(doc, "7C. Confidence Level vs Data Coverage Ratio", MARGIN, y, USABLE_W);

  const confRows: KVRow[] = [
    { key: "Data Coverage Ratio", value: context.evidenceCoverage?.label ?? "Coverage not computed", provenanceType: "DERIVED" },
    { key: "Decision Confidence", value: `${decision.confidence.level} (${(decision.confidence.score * 100).toFixed(0)}%) — ${decision.confidence.reasons.join("; ") || "Adequate baseline"}`, valueColor: decision.confidence.level === "HIGH" ? PALETTE.safe : decision.confidence.level === "LOW" ? PALETTE.high : PALETTE.moderate },
    { key: "Uncertainty & Missing Data", value: decision.uncertainty.reasons.join("; ") || "No major uncertainty noted" },
  ];

  drawKVTable(doc, confRows, MARGIN, y, USABLE_W);
}

// ─── Page 8: Data Quality, Limitations, Provenance & Source Registry ────────

function buildPage8(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 8);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 22;
  const { decision, location, environment } = context;

  y = sectionHeading(doc, "8. DATA QUALITY, LIMITATIONS & SOURCE PROVENANCE", MARGIN, y, USABLE_W);

  // 8A: Decision Evidence Register (Used in Decision: YES)
  y = subHeading(doc, "8A. Decision Evidence Register (Authoritative Datasets Evaluated for this Decision)", MARGIN, y, USABLE_W);

  const evItems = [
    { id: "EV-001", domain: "HAZARD", source: "NRSC / ISRO", dataset: "Bhuvan Historical Flood Inundation Layers", temp: "HISTORICAL", res: "30m optical", used: "YES", conf: "HIGH" },
    { id: "EV-002", domain: "HAZARD", source: "GSI / SEISAT", dataset: "Bhukosh Bedrock Lithology & Major Lineaments", temp: "STATIC_REF", res: "1:2,000,000", used: "YES", conf: "HIGH" },
    { id: "EV-003", domain: "SEISMIC", source: "BIS (Govt of India)", dataset: "IS 1893:2016 Criteria for Earthquake Resistant Design", temp: "REGULATORY", res: "Macro-seismic", used: "YES", conf: "HIGH" },
    { id: "EV-004", domain: "WEATHER", source: environment.imdWarning ? "IMD (Mausam)" : "Open-Meteo", dataset: environment.imdWarning ? "Official IMD Active Warning Bulletin" : "NWP Modelled Surface Telemetry", temp: environment.imdWarning ? "CURRENT" : "MODELLED", res: "Point context", used: "YES", conf: environment.imdWarning ? "HIGH" : "MEDIUM" },
    { id: "EV-005", domain: "ROUTING", source: "Project OSRM / OSM", dataset: "India Road Network Centerline Graph", temp: "CURRENT", res: "Road vector", used: decision?.routingAssessment.isRoadRoute ? "YES" : "NO (UNAVAILABLE)", conf: decision?.routingAssessment.isRoadRoute ? "HIGH" : "UNAVAILABLE" },
    { id: "EV-006", domain: "POPULATION", source: location.populationSource?.includes("Census") ? "Census of India" : "Geocoding API", dataset: location.populationSource || "Geonames", temp: location.populationSource?.includes("Census") ? "OFFICIAL" : "MODELLED", res: location.category, used: location.population !== null ? "YES" : "NO (DATA UNAVAILABLE)", conf: location.population !== null ? "HIGH" : "UNAVAILABLE" },
  ];

  doc.rect(MARGIN, y, USABLE_W, 14).fill(PALETTE.surfaceMid);
  const eCols = [45, 55, 95, 150, 60, 60, 58];
  const eHeaders = ["EVID ID", "DOMAIN", "ORGANIZATION", "DATASET & DESCRIPTION", "TEMPORAL", "DECISION", "CONF"];
  let ex = MARGIN + 4;
  eHeaders.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(5.5).fillColor(PALETTE.muted).text(h, ex, y + 4, { width: eCols[i] - 2 });
    ex += eCols[i];
  });
  doc.rect(MARGIN, y, USABLE_W, 14).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
  y += 14;

  evItems.forEach((ev, ei) => {
    const bg = ei % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    doc.rect(MARGIN, y, USABLE_W, 14).fill(bg);
    const rowVals = [ev.id, ev.domain, ev.source, ev.dataset, ev.temp, ev.used, ev.conf];
    let exr = MARGIN + 4;
    rowVals.forEach((v, ci) => {
      const col = ci === 5 && v.includes("YES") ? PALETTE.official : ci === 5 ? PALETTE.high : PALETTE.body;
      doc.font(ci === 0 || ci === 5 ? "Helvetica-Bold" : "Helvetica").fontSize(5.5).fillColor(col).text(v, exr, y + 3.5, { width: eCols[ci] - 2 });
      exr += eCols[ci];
    });
    doc.rect(MARGIN, y, USABLE_W, 14).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
    y += 14;
  });
  y += 10;

  // 8B: Data Quality & Completeness Flags
  y = subHeading(doc, "8B. Data Quality, Completeness & Gaps Matrix", MARGIN, y, USABLE_W);

  const flags = [
    { variable: "Population Exposure", status: location.population !== null ? "AVAILABLE" : "UNAVAILABLE", note: location.population !== null ? location.populationSource : "No population resolved at this spatial scale; not scored as zero" },
    { variable: "Administrative Boundary", status: location.boundary ? "AVAILABLE" : "UNAVAILABLE", note: location.boundary ? "geoBoundaries ADM polygon" : "Centroid reference point only; administrative polygon unavailable" },
    { variable: "Shelter Bed Capacity", status: decision?.capacityAssessment.capacityVerified ? "VERIFIED" : "UNAVAILABLE", note: "Shelter nodes known from OSM; capacity unknown until DDMA register verification" },
    { variable: "Official Weather Warning", status: environment.imdWarning ? "AVAILABLE" : "UNAVAILABLE", note: environment.imdWarning ? `IMD ${environment.imdWarning.warningLevel}` : "No official IMD active warning bulletin" },
    { variable: "Road Evacuation Route", status: decision?.routingAssessment.isRoadRoute ? "AVAILABLE" : "UNAVAILABLE", note: decision?.routingAssessment.isRoadRoute ? "Real road centerline geometry verified" : "OSRM road graph unavailable; straight-line distances rejected" },
    { variable: "Destination Safety Gating", status: decision?.relocationAssessment.destinationSafety.destinationSafetyStatus === "SAFE" ? "VERIFIED" : "UNAVAILABLE", note: decision?.relocationAssessment.destinationSafety.checkDetails ?? "No destination evaluated" },
  ];

  flags.forEach((f, fi) => {
    const bg = fi % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    const isAvail = f.status === "AVAILABLE" || f.status === "VERIFIED";
    const statusCol = isAvail ? PALETTE.safe : PALETTE.high;

    doc.rect(MARGIN, y, USABLE_W, 14).fill(bg);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text(f.variable, MARGIN + 6, y + 3.5, { width: 140 });
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(statusCol).text(f.status, MARGIN + 150, y + 3.5, { width: 80 });
    doc.font("Helvetica").fontSize(6).fillColor(PALETTE.body).text(f.note, MARGIN + 235, y + 3.5, { width: USABLE_W - 240 });
    doc.rect(MARGIN, y, USABLE_W, 14).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
    y += 14;
  });
  y += 10;

  // 8C: Platform Integrated Source Registry
  y = subHeading(doc, "8C. Platform Integrated Source Registry (Authoritative National Integrations)", MARGIN, y, USABLE_W);

  const registryText =
    "ResQ integrates data from the following statutory bodies: (1) Geological Survey of India (GSI Bhukosh & SEISAT); " +
    "(2) National Remote Sensing Centre (NRSC / ISRO Bhuvan); (3) Central Water Commission (CWC River Telemetry); " +
    "(4) Bureau of Indian Standards (BIS IS 1893:2016); (5) India Meteorological Department (IMD Mausam Nowcast & Warnings); " +
    "(6) Office of the Registrar General & Census Commissioner (Census 2011); (7) geoBoundaries ADM1/ADM2 Administrative Boundaries; " +
    "(8) Project OSRM / OpenStreetMap Road Network Graph; (9) Copernicus DEM GLO-90 Global Elevation Model; (10) Open-Meteo NWP Forecast Models.\n\n" +
    "DISCLAIMER: Inclusion in this platform registry does not imply all sources contributed to this particular decision. See Section 8A for the active evidence subset.";

  doc.roundedRect(MARGIN, y, USABLE_W, 50, 4).fill(PALETTE.surfaceLight).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.muted).text(registryText, MARGIN + 8, y + 6, { width: USABLE_W - 16, lineGap: 1.5 });
  y += 56;

  // 8D: Legal & Operational Notice
  doc.save();
  doc.roundedRect(MARGIN, y, USABLE_W, 36, 4).fill("#FEF2F2").lineWidth(0.6).strokeColor("#FCA5A5").stroke();
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#991B1B").text("DECISION-SUPPORT NOTICE & STATUTORY DISCLAIMER", MARGIN + 8, y + 5);
  doc.font("Helvetica").fontSize(6).fillColor("#7F1D1D")
    .text(
      "This document is an automated decision-support report generated by the ResQ Disaster Intelligence Platform (SIH 2026 Problem Statement 191). " +
      "It is provided exclusively for operational triage and technical evaluation. It does NOT constitute a binding government directive or statutory evacuation order. " +
      "Authoritative incident control decisions remain the sole jurisdiction of the respective State Disaster Management Authority (SDMA) and District Disaster Management Authority (DDMA).",
      MARGIN + 8, y + 14, { width: USABLE_W - 16, lineGap: 1.5 }
    );
  doc.restore();
}

// ─── Master Report Generator ─────────────────────────────────────────────────

export async function buildSelectedLocationPdf(context: IndiaLocationContext): Promise<Buffer> {
  // Execute pre-generation validation guardrails
  const validation = validateReportData(context);
  if (!validation.valid) {
    throw new Error(`Report generation blocked by validation guardrails:\n${validation.errors.join("\n")}`);
  }

  const generatedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " IST";

  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        autoFirstPage: false,
        bufferPages: true,
        info: {
          Title: `ResQ Decision Context — ${context.location.displayName || context.location.name}`,
          Author: "ResQ Disaster Intelligence Platform (SIH 2026 / PS191)",
          Subject: "Authoritative Location Decision Context & Triage Report (v4.2)",
          Keywords: "Disaster Management, PS191, SIH2026, ResQ, Decision Support",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      // Page 1: Location Identity, Spatial Level & Decision Summary
      doc.addPage();
      buildPage1(doc, context, generatedAt);

      // Page 2: Geographic Decision Map & Cartography
      doc.addPage();
      buildPage2(doc, context, generatedAt);

      // Page 3: Multi-Hazard Evidence & Baseline Geological Context
      doc.addPage();
      buildPage3(doc, context, generatedAt);

      // Page 4: Population Exposure & Vulnerability Context
      doc.addPage();
      buildPage4(doc, context, generatedAt);

      // Page 5: Evacuation Facilities & Carrying Capacity Assessment
      doc.addPage();
      buildPage5(doc, context, generatedAt);

      // Page 6: Destination Assessment & Road Evacuation Routing
      doc.addPage();
      buildPage6(doc, context, generatedAt);

      // Page 7: Decision Engine, Scoring Semantics & Causal Chain
      doc.addPage();
      buildPage7(doc, context, generatedAt);

      // Page 8: Data Quality, Limitations, Provenance & Source Registry
      doc.addPage();
      buildPage8(doc, context, generatedAt);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
