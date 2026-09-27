/**
 * ResQ — Location Decision Context Report (v4)
 *
 * Professional disaster-management decision document.
 * All rendered values are consumed from the canonical IndiaLocationContext /
 * ResQDecisionContext objects.  The renderer NEVER recalculates decisions.
 *
 * Structure (7 pages):
 *   Page 1 — Cover / Location Identity / Executive Summary
 *   Page 2 — Geographic Decision Map
 *   Page 3 — Decision Context Summary + Hazard Assessment
 *   Page 4 — Exposure, Vulnerability & Evacuation Capacity
 *   Page 5 — Safe Destination & Road Route
 *   Page 6 — Why This Decision? (Causal Narrative + Priority Breakdown)
 *   Page 7 — Data Quality, Limitations & Source Provenance
 */

import { createRequire } from "node:module";
import type PDFDocumentClass from "pdfkit";
import type { IndiaBoundary, IndiaLocationContext } from "../../shared/india";
import type { ResQDecisionContext } from "../../shared/decisionEngine";

const require = createRequire(import.meta.url);
const PDFDocument: typeof PDFDocumentClass = require("pdfkit");

type PdfDocument = PDFKit.PDFDocument;
type Point = [number, number];

// ─── Colour System ───────────────────────────────────────────────────────────

export const SELECTED_LOCATION_RISK_COLORS = {
  High: "#BD3034",
  Moderate: "#E66E2D",
  Low: "#D3A52D",
  Safe: "#31825D",
} as const;

const PALETTE = {
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
  moderate: "#D97706",
  low: "#D3A52D",
  // Map
  mapBg: "#0D2137",
  mapGrid: "#1E3A52",
  mapBoundary: "#60A5FA",
  // Provenance badge colours
  official: "#15803D",
  officialBg: "#DCFCE7",
  modelled: "#1D4ED8",
  modelledBg: "#DBEAFE",
  historical: "#7C3AED",
  historicalBg: "#EDE9FE",
  unavailable: "#6B7280",
  unavailableBg: "#F3F4F6",
  live: "#DC2626",
  liveBg: "#FEE2E2",
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
  return "#64748B";
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

function safeText(value: string | number | null | undefined, fallback = "Unavailable"): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatPopulation(n: number | null | undefined): string {
  if (n === null || n === undefined) return "UNAVAILABLE";
  return Number(n).toLocaleString("en-IN");
}

function formatCoord(val: number, pos: "lat" | "lon"): string {
  const dir = pos === "lat" ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
  return `${Math.abs(val).toFixed(6) + "\u00b0"} ${dir}`;
}

function freshnessLabel(f: string | null | undefined): string {
  if (!f) return "UNKNOWN";
  return f.replace("_", " ");
}

function provenanceBadgeColors(type: string): { fg: string; bg: string } {
  const t = (type || "").toUpperCase();
  if (t === "OFFICIAL") return { fg: PALETTE.official, bg: PALETTE.officialBg };
  if (t === "MODELLED") return { fg: PALETTE.modelled, bg: PALETTE.modelledBg };
  if (t === "HISTORICAL") return { fg: PALETTE.historical, bg: PALETTE.historicalBg };
  if (t === "OBSERVED") return { fg: PALETTE.live, bg: PALETTE.liveBg };
  if (t === "DERIVED") return { fg: PALETTE.derived, bg: PALETTE.derivedBg };
  return { fg: PALETTE.unavailable, bg: PALETTE.unavailableBg };
}

// ─── Layout Constants ─────────────────────────────────────────────────────────

const A4_WIDTH = 595;   // pt
const A4_HEIGHT = 842;  // pt
const MARGIN = 40;
const USABLE_W = A4_WIDTH - MARGIN * 2;
const PAGE_CONTENT_H = A4_HEIGHT - MARGIN * 2 - 30; // reserve 30pt for footer

// ─── Page Header / Footer ─────────────────────────────────────────────────────

function drawPageHeader(doc: PdfDocument, locationName: string, page: number, total: number) {
  const y = MARGIN - 20;
  doc.save();
  doc.rect(MARGIN, y, USABLE_W, 16).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#FFFFFF")
    .text("RESQ  |  LOCATION DECISION CONTEXT REPORT", MARGIN + 6, y + 4, { width: USABLE_W / 2 });
  doc.font("Helvetica").fontSize(7).fillColor("#94A3B8")
    .text(`${locationName}`, MARGIN + USABLE_W / 2, y + 4, { width: USABLE_W / 2 - 40, align: "right" });
  doc.font("Helvetica").fontSize(7).fillColor("#94A3B8")
    .text(`Page ${page} of ${total}`, MARGIN + USABLE_W - 38, y + 4, { width: 38, align: "right" });
  doc.restore();
}

function drawPageFooter(doc: PdfDocument, generatedAt: string) {
  const y = A4_HEIGHT - MARGIN - 10;
  doc.save();
  doc.moveTo(MARGIN, y).lineTo(MARGIN + USABLE_W, y).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.faint)
    .text(
      `Generated: ${generatedAt}  |  Coordinate System: WGS84 / EPSG:4326  |  ResQ Decision Intelligence Platform  |  SIH Problem Statement 191`,
      MARGIN,
      y + 3,
      { width: USABLE_W, align: "center" }
    );
  doc.restore();
}

function sectionHeading(doc: PdfDocument, text: string, x: number, y: number, w: number): number {
  doc.save();
  doc.rect(x, y, w, 20).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#FFFFFF").text(text, x + 8, y + 6, { width: w - 16 });
  doc.restore();
  return y + 24;
}

function subHeading(doc: PdfDocument, text: string, x: number, y: number, w: number): number {
  doc.save();
  doc.rect(x, y, w, 16).fill(PALETTE.surfaceMid);
  doc.moveTo(x, y).lineTo(x, y + 16).lineWidth(3).strokeColor(PALETTE.brandAccent).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(PALETTE.ink).text(text, x + 8, y + 4, { width: w - 16 });
  doc.restore();
  return y + 20;
}

function provenancePill(doc: PdfDocument, label: string, type: string, x: number, y: number): void {
  const colors = provenanceBadgeColors(type);
  const textW = label.length * 4.5 + 8;
  doc.roundedRect(x, y, textW, 11, 3).fill(colors.bg);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(colors.fg).text(label, x + 4, y + 2, { width: textW - 4 });
}

function statusPill(doc: PdfDocument, label: string, color: string, bg: string, x: number, y: number): void {
  const textW = Math.max(label.length * 4.5 + 10, 40);
  doc.roundedRect(x, y, textW, 12, 3).fill(bg);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(color).text(label, x + 5, y + 3, { width: textW - 6 });
}

// ─── Two-Column Key/Value Table ───────────────────────────────────────────────

interface KVRow {
  key: string;
  value: string;
  valueColor?: string;
  provenanceType?: string;
  provenanceLabel?: string;
}

function drawKVTable(
  doc: PdfDocument,
  rows: KVRow[],
  x: number,
  y: number,
  w: number,
  rowH = 18
): number {
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    doc.rect(x, y, w, rowH).fill(bg);
    doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).lineWidth(0.4).strokeColor(PALETTE.borderLight).stroke();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.muted).text(row.key, x + 8, y + (rowH - 9) / 2 + 1, { width: w * 0.38 - 4 });
    doc.font("Helvetica").fontSize(7.5).fillColor(row.valueColor ?? PALETTE.body)
      .text(row.value, x + w * 0.38, y + (rowH - 9) / 2 + 1, { width: w * 0.56 });
    if (row.provenanceType && row.provenanceLabel) {
      provenancePill(doc, row.provenanceLabel, row.provenanceType, x + w - 70, y + (rowH - 11) / 2);
    }
    y += rowH;
  });
  // Border around whole table
  doc.rect(x, y - rowH * rows.length, w, rowH * rows.length).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  return y;
}

// ─── Full Evidence Register Table ─────────────────────────────────────────────

interface EvidenceRow {
  id: string;
  hazard: string;
  type: string;
  org: string;
  temporal: string;
  resolution: string;
  value: string;
  provenance: string;
  confidence: string;
}

function drawEvidenceTable(
  doc: PdfDocument,
  rows: EvidenceRow[],
  x: number,
  y: number,
  w: number
): number {
  // Header
  const cols = [32, 58, 72, 84, 56, 70, 52, 58, 50];
  const headers = ["ID", "HAZARD", "TYPE", "ORGANIZATION", "TEMPORAL", "RESOLUTION", "VALUE", "PROVENANCE", "CONFIDENCE"];
  doc.rect(x, y, w, 18).fill(PALETTE.brandBlue);
  let cx = x + 4;
  headers.forEach((h, i) => {
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#FFFFFF").text(h, cx, y + 5, { width: cols[i] - 4 });
    cx += cols[i];
  });
  y += 18;

  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    const rowH = 16;
    doc.rect(x, y, w, rowH).fill(bg);
    doc.moveTo(x, y + rowH).lineTo(x + w, y + rowH).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
    const vals = [row.id, row.hazard, row.type, row.org, row.temporal, row.resolution, row.value, row.provenance, row.confidence];
    cx = x + 4;
    vals.forEach((v, i) => {
      const col = i === 8 ? provenanceBadgeColors(v).fg : PALETTE.body;
      doc.font("Helvetica").fontSize(6).fillColor(col).text(v, cx, y + 4, { width: cols[i] - 4 });
      cx += cols[i];
    });
    y += rowH;
  });
  doc.rect(x, y - 16 * rows.length - 18, w, 16 * rows.length + 18).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  return y;
}

// ─── Map Renderer ─────────────────────────────────────────────────────────────

function renderDecisionMap(
  doc: PdfDocument,
  context: IndiaLocationContext,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const decision = context.decision;
  const boundaryRings = extractBoundaryRings(context.location.boundary);
  const fallbackBounds = context.location.boundingBox;

  // Determine geographic extent
  const sourcePoints = boundaryRings.flat();
  let extentPoints: Point[] = sourcePoints.length
    ? sourcePoints
    : fallbackBounds
    ? [
        [fallbackBounds[1], fallbackBounds[0]],
        [fallbackBounds[3], fallbackBounds[0]],
        [fallbackBounds[3], fallbackBounds[2]],
        [fallbackBounds[1], fallbackBounds[2]],
      ]
    : [
        [context.location.longitude - 0.15, context.location.latitude - 0.1],
        [context.location.longitude + 0.15, context.location.latitude - 0.1],
        [context.location.longitude + 0.15, context.location.latitude + 0.1],
        [context.location.longitude - 0.15, context.location.latitude + 0.1],
      ];

  // If we have a route, extend extent to include all route points
  const routeCoords = decision?.routingAssessment?.routeCoordinates;
  if (routeCoords && routeCoords.length > 1) {
    extentPoints = extentPoints.concat(routeCoords as Point[]);
  }
  // Include destination
  const bestCand = decision?.relocationAssessment?.bestCandidate;
  if (bestCand && typeof bestCand.longitude === "number" && typeof bestCand.latitude === "number") {
    extentPoints.push([bestCand.longitude, bestCand.latitude]);
  }

  const minLon = Math.min(...extentPoints.map((p) => p[0]));
  const maxLon = Math.max(...extentPoints.map((p) => p[0]));
  const minLat = Math.min(...extentPoints.map((p) => p[1]));
  const maxLat = Math.max(...extentPoints.map((p) => p[1]));

  const lonSpan = Math.max(maxLon - minLon, 0.02);
  const latSpan = Math.max(maxLat - minLat, 0.02);
  const lonPad = lonSpan * 0.15;
  const latPad = latSpan * 0.15;
  const west = minLon - lonPad;
  const east = maxLon + lonPad;
  const south = minLat - latPad;
  const north = maxLat + latPad;

  const project = (pt: Point): Point => [
    x + ((pt[0] - west) / Math.max(east - west, 0.0001)) * width,
    y + height - ((pt[1] - south) / Math.max(north - south, 0.0001)) * height,
  ];

  const riskColorHex = riskColour(
    decision?.responsePriority.priorityLevel ??
    context.hazardProfile?.redZone.status ??
    context.screening.riskLevel
  );

  // Map canvas
  doc.save();
  doc.roundedRect(x, y, width, height, 6).fill(PALETTE.mapBg);

  // Graticule grid
  const gridSteps = 4;
  for (let i = 1; i < gridSteps; i++) {
    const gx = x + (width / gridSteps) * i;
    const gy = y + (height / gridSteps) * i;
    const lonV = west + ((east - west) / gridSteps) * i;
    const latV = north - ((north - south) / gridSteps) * i;
    doc.moveTo(gx, y + 2).lineTo(gx, y + height - 2).strokeColor(PALETTE.mapGrid).lineWidth(0.4).dash(3, { space: 4 }).stroke().undash();
    doc.moveTo(x + 2, gy).lineTo(x + width - 2, gy).strokeColor(PALETTE.mapGrid).lineWidth(0.4).dash(3, { space: 4 }).stroke().undash();
    // Graticule labels
    doc.font("Helvetica").fontSize(5.5).fillColor("#4A6B80")
      .text(`${lonV.toFixed(2)}\u00b0E`, gx - 14, y + height - 10, { width: 28, align: "center" });
    doc.font("Helvetica").fontSize(5.5).fillColor("#4A6B80")
      .text(`${latV.toFixed(2)}\u00b0N`, x + 2, gy - 4, { width: 30 });
  }

  // Administrative boundary polygon
  if (boundaryRings.length > 0) {
    boundaryRings.forEach((ring) => {
      const proj = ring.map(project);
      if (proj.length < 3) return;
      doc.moveTo(proj[0][0], proj[0][1]);
      proj.slice(1).forEach((pt) => doc.lineTo(pt[0], pt[1]));
      doc.closePath().fillOpacity(0.12).fill(PALETTE.mapBoundary).fillOpacity(1).lineWidth(1.4).strokeColor(PALETTE.mapBoundary).stroke();
    });
  } else {
    // Fallback extent box (dashed, NOT labelled as hazard)
    const corners = extentPoints.slice(0, 4).map(project);
    if (corners.length >= 4) {
      doc.moveTo(corners[0][0], corners[0][1]);
      corners.slice(1).forEach((pt) => doc.lineTo(pt[0], pt[1]));
      doc.closePath().lineWidth(1).strokeColor(PALETTE.mapBoundary).dash(4, { space: 3 }).stroke().undash();
    }
  }

  // OSRM Road Route — rendered only if it is a real road route
  if (routeCoords && routeCoords.length > 1 && decision?.routingAssessment?.isRoadRoute) {
    const routePts = (routeCoords as Point[]).map(project);
    // Casing
    doc.moveTo(routePts[0][0], routePts[0][1]);
    routePts.slice(1).forEach((pt) => doc.lineTo(pt[0], pt[1]));
    doc.lineWidth(4).strokeColor("#0369A1").stroke();
    // Core
    doc.moveTo(routePts[0][0], routePts[0][1]);
    routePts.slice(1).forEach((pt) => doc.lineTo(pt[0], pt[1]));
    doc.lineWidth(2.2).strokeColor(PALETTE.routeBlue).stroke();
  }

  // Origin marker — vulnerable/selected location
  const originPt = project([context.location.longitude, context.location.latitude]);
  // Halo
  doc.circle(originPt[0], originPt[1], 10).fillOpacity(0.25).fill(riskColorHex).fillOpacity(1);
  // Inner dot
  doc.circle(originPt[0], originPt[1], 5).fill(riskColorHex).lineWidth(1.5).strokeColor("#FFFFFF").stroke();
  // Label callout
  const locLabel = context.location.name.length > 22 ? context.location.name.slice(0, 22) + "\u2026" : context.location.name;
  doc.roundedRect(originPt[0] + 8, originPt[1] - 12, 90, 22, 3).fillOpacity(0.92).fill(PALETTE.brandBlue).fillOpacity(1);
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#FFFFFF")
    .text(locLabel, originPt[0] + 11, originPt[1] - 9, { width: 84 });
  doc.font("Helvetica").fontSize(5.5).fillColor("#94A3B8")
    .text(`${context.location.latitude.toFixed(4)}\u00b0N, ${context.location.longitude.toFixed(4)}\u00b0E`, originPt[0] + 11, originPt[1] + 1, { width: 84 });

  // Destination marker — verified safe destination
  const dest = decision?.relocationAssessment?.bestCandidate;
  const hasDestCoord = dest && typeof dest.latitude === "number" && typeof dest.longitude === "number";
  if (hasDestCoord) {
    const destPt = project([dest.longitude, dest.latitude]);
    doc.circle(destPt[0], destPt[1], 8).fillOpacity(0.25).fill(PALETTE.safe).fillOpacity(1);
    doc.circle(destPt[0], destPt[1], 4).fill(PALETTE.safe).lineWidth(1.5).strokeColor("#FFFFFF").stroke();
    const destLabel = (dest.name || "Safe Destination").slice(0, 24);
    doc.roundedRect(destPt[0] + 8, destPt[1] - 10, 90, 18, 3).fillOpacity(0.92).fill("#052D18").fillOpacity(1);
    doc.font("Helvetica-Bold").fontSize(7).fillColor("#86EFAC")
      .text(`DEST: ${destLabel}`, destPt[0] + 11, destPt[1] - 7, { width: 84 });
  }

  // ── Legend Box (Bottom-Left) ──────────────────────────────────────────
  const legendItems: Array<{ symbol: "circle" | "line"; color: string; label: string }> = [];
  legendItems.push({ symbol: "circle", color: riskColorHex, label: "Selected / Vulnerable Location" });
  if (hasDestCoord) legendItems.push({ symbol: "circle", color: PALETTE.safe, label: "Verified Safe Destination" });
  if (boundaryRings.length > 0) legendItems.push({ symbol: "line", color: PALETTE.mapBoundary, label: "Administrative Boundary" });
  if (routeCoords && routeCoords.length > 1 && decision?.routingAssessment?.isRoadRoute) {
    legendItems.push({ symbol: "line", color: PALETTE.routeBlue, label: "Verified OSRM Road Route" });
  }

  const legH = 14 + legendItems.length * 13;
  const legW = 155;
  const legX = x + 8;
  const legY = y + height - legH - 8;
  doc.roundedRect(legX, legY, legW, legH, 4).fillOpacity(0.92).fill(PALETTE.brandBlue).fillOpacity(1).lineWidth(0.5).strokeColor("#334155").stroke();
  doc.font("Helvetica-Bold").fontSize(6).fillColor("#94A3B8").text("LEGEND", legX + 6, legY + 5);
  legendItems.forEach((item, idx) => {
    const iy = legY + 16 + idx * 13;
    if (item.symbol === "circle") {
      doc.circle(legX + 10, iy + 4, 3.5).fill(item.color);
    } else {
      doc.moveTo(legX + 6, iy + 4).lineTo(legX + 15, iy + 4).lineWidth(2).strokeColor(item.color).stroke();
    }
    doc.font("Helvetica").fontSize(6.5).fillColor("#E2E8F0").text(item.label, legX + 20, iy + 1, { width: legW - 26 });
  });

  // ── Compass Rose (Top-Right) ───────────────────────────────────────────
  const cX = x + width - 22;
  const cY = y + 22;
  doc.circle(cX, cY, 12).fillOpacity(0.88).fill(PALETTE.brandBlue).fillOpacity(1).lineWidth(0.8).strokeColor("#334155").stroke();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(PALETTE.routeBlue).text("N", cX - 3.5, cY - 12);
  doc.moveTo(cX, cY - 9).lineTo(cX - 3.5, cY + 6).lineTo(cX + 3.5, cY + 6).closePath().fill(PALETTE.routeBlue);

  // ── Scale Bar (Bottom-Right) ──────────────────────────────────────────
  const kmPerDeg = 111 * Math.cos((context.location.latitude * Math.PI) / 180);
  const lonSpanKm = (east - west) * kmPerDeg;
  const scaleKm = lonSpanKm > 200 ? 50 : lonSpanKm > 80 ? 20 : lonSpanKm > 30 ? 10 : 5;
  const scaleBarPx = (scaleKm / Math.max(lonSpanKm, 1)) * width;

  if (scaleBarPx > 20 && scaleBarPx < width - 60) {
    const sbX = x + width - scaleBarPx - 20;
    const sbY = y + height - 18;
    doc.roundedRect(sbX - 6, sbY - 5, scaleBarPx + 14, 16, 3).fillOpacity(0.88).fill(PALETTE.brandBlue).fillOpacity(1);
    doc.rect(sbX, sbY + 3, scaleBarPx / 2, 3).fill("#FFFFFF");
    doc.rect(sbX + scaleBarPx / 2, sbY + 3, scaleBarPx / 2, 3).fill(PALETTE.routeBlue);
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#FFFFFF").text("0", sbX - 3, sbY - 2);
    doc.font("Helvetica-Bold").fontSize(6).fillColor("#FFFFFF")
      .text(`${scaleKm} km`, sbX + scaleBarPx - 14, sbY - 2, { width: 22, align: "right" });
  }

  // ── Map Source Label ──────────────────────────────────────────────────
  const routeStatus = decision?.routingAssessment?.isRoadRoute
    ? "Route: OSRM/OpenStreetMap"
    : (routeCoords && routeCoords.length > 1 ? "Route: Geodesic proxy" : "Route: Not available");
  const boundarySource = context.location.boundary ? "Boundary: geoBoundaries/OSM" : "Boundary: Bounding box";
  doc.font("Helvetica").fontSize(5.5).fillColor("#4A6B80")
    .text(`${boundarySource}  |  ${routeStatus}  |  WGS84 / EPSG:4326`, x + 6, y + height - 7, { width: width - 200 });

  doc.restore();

  // Outer border
  doc.roundedRect(x, y, width, height, 6).lineWidth(1).strokeColor("#2A475E").stroke();
}

// ─── Page 1: Cover + Location Identity + Executive Summary ───────────────────

function buildPage1(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  const { location, screening, decision } = context;

  drawPageHeader(doc, location.name, 1, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;

  // ── Document Title Block ──
  doc.save();
  doc.rect(MARGIN, y, USABLE_W, 58).fill(PALETTE.brandBlue);
  doc.font("Helvetica-Bold").fontSize(18).fillColor("#FFFFFF")
    .text("RESQ", MARGIN + 14, y + 10);
  doc.font("Helvetica").fontSize(9).fillColor("#94A3B8")
    .text("Location Decision Context Report", MARGIN + 14, y + 30);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#94A3B8")
    .text("SIH Problem Statement 191  |  Disaster Intelligence & Decision Support Platform", MARGIN + 14, y + 44);
  // Priority badge top-right
  const pLevel = decision?.responsePriority.priorityLevel ?? screening.riskLevel.toUpperCase();
  const pColor = riskColour(pLevel);
  doc.roundedRect(MARGIN + USABLE_W - 110, y + 12, 100, 34, 5).fill(pColor);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF")
    .text("RESPONSE PRIORITY", MARGIN + USABLE_W - 106, y + 16, { width: 92, align: "center" });
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#FFFFFF")
    .text(pLevel, MARGIN + USABLE_W - 106, y + 26, { width: 92, align: "center" });
  doc.restore();

  y += 66;

  // ── PART 1: Location Identity ──
  y = sectionHeading(doc, "1. LOCATION IDENTITY", MARGIN, y, USABLE_W);

  // Build admin hierarchy
  const addr = location.address ?? {};
  const adminParts: string[] = ["India"];
  if (addr.state) adminParts.unshift(addr.state);
  if (addr.district) adminParts.unshift(addr.district);
  if (addr.city) adminParts.unshift(addr.city);
  if (addr.locality) adminParts.unshift(addr.locality);
  const adminHierarchy = adminParts.join(" > ");

  // Precision level
  const precisionLabel =
    location.category === "District"
      ? "District-level screening context — sub-district habitation not yet resolved"
      : location.category === "State"
      ? "State-level overview — district detail not resolved"
      : `${location.category}-level context`;

  const locRows: KVRow[] = [
    { key: "Location Name", value: location.displayName || location.name, valueColor: PALETTE.brandAccent },
    { key: "Administrative Hierarchy", value: adminHierarchy },
    { key: "Latitude", value: formatCoord(location.latitude, "lat") },
    { key: "Longitude", value: formatCoord(location.longitude, "lon") },
    { key: "Coordinate System", value: "WGS84 / EPSG:4326" },
    { key: "Geographic Level", value: location.category },
    { key: "Spatial Resolution", value: precisionLabel },
    { key: "Location Source", value: location.source },
    {
      key: "Location Confidence",
      value: location.boundary ? "HIGH — administrative boundary geometry available" : "MEDIUM — centroid from geocoder, no polygon",
      provenanceType: location.boundary ? "OFFICIAL" : "MODELLED",
      provenanceLabel: location.boundary ? "OFFICIAL" : "GEOCODED",
    },
    { key: "Report Generated", value: generatedAt },
  ];

  y = drawKVTable(doc, locRows, MARGIN, y, USABLE_W);
  y += 10;

  // ── Decision Status Banner ──
  const decisionTimestamp = decision?.decisionTimestamp
    ? new Date(decision.decisionTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST"
    : "Screening-level context (no full decision computed)";

  const bannerColor = decision ? PALETTE.brandAccent : PALETTE.muted;
  doc.save();
  doc.roundedRect(MARGIN, y, USABLE_W, 28, 5).fill(decision ? "#DBEAFE" : PALETTE.surfaceMid);
  doc.moveTo(MARGIN, y).lineTo(MARGIN, y + 28).lineWidth(4).strokeColor(bannerColor).stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(bannerColor)
    .text(decision ? "FULL DECISION COMPUTED" : "SCREENING CONTEXT ONLY", MARGIN + 10, y + 6, { width: 200 });
  doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.body)
    .text(`Decision Timestamp: ${decisionTimestamp}`, MARGIN + 10, y + 17, { width: USABLE_W - 20 });
  doc.restore();
  y += 36;

  // ── Executive Summary ──
  y = subHeading(doc, "Executive Summary", MARGIN, y, USABLE_W);

  const hazardName = decision?.hazardAssessment.primaryHazard ?? context.hazardProfile?.redZone.primaryHazard ?? "Multi-hazard screening";
  const destName = decision?.relocationAssessment.bestCandidate?.name ?? "Not determined";
  const routeKm = decision?.routingAssessment.distanceKm !== null && decision?.routingAssessment.distanceKm !== undefined
    ? `${decision.routingAssessment.distanceKm.toFixed(1)} km (${decision.routingAssessment.isRoadRoute ? "OSRM road route" : "geodesic proxy"})`
    : "UNAVAILABLE";
  const popStr = location.population !== null && location.population !== undefined
    ? `${formatPopulation(location.population)} people (${location.populationSource})`
    : "UNAVAILABLE";

  const summaryText = decision
    ? `${location.displayName ?? location.name} has been assessed under the ResQ decision framework. ` +
      `Primary hazard identified: ${hazardName}. ` +
      `Response priority: ${decision.responsePriority.priorityLevel} (score ${decision.responsePriority.priorityScore}/100). ` +
      `Population context: ${popStr}. ` +
      `Recommended destination: ${destName}. ` +
      `Road route: ${routeKm}. ` +
      (decision.confidence ? `Decision confidence: ${decision.confidence.level}.` : "")
    : `${location.displayName ?? location.name} has been screened under the ResQ multi-hazard framework. ` +
      `Screening risk level: ${screening.riskLevel}. ` +
      `${screening.hazardContext} ${screening.populationContext}`;

  const summH = doc.font("Helvetica").fontSize(8.5).heightOfString(summaryText, { width: USABLE_W - 24, lineGap: 2.5 });
  doc.roundedRect(MARGIN, y, USABLE_W, summH + 18, 5).fill(PALETTE.surfaceLight).lineWidth(0.7).strokeColor(PALETTE.border).stroke();
  doc.font("Helvetica").fontSize(8.5).fillColor(PALETTE.body)
    .text(summaryText, MARGIN + 12, y + 9, { width: USABLE_W - 24, lineGap: 2.5 });
  y += summH + 26;

  // ── Quick-Reference Summary Table ──
  y = subHeading(doc, "Quick-Reference Decision Summary", MARGIN, y, USABLE_W);

  const summaryRows: KVRow[] = [
    {
      key: "Primary Hazard",
      value: hazardName,
      provenanceType: decision?.hazardAssessment.provenance?.sourceType ?? "MODELLED",
      provenanceLabel: decision?.hazardAssessment.provenance?.sourceType ?? "MODELLED",
    },
    {
      key: "Risk Tier",
      value: decision?.hazardAssessment.tier ?? screening.riskLevel,
      valueColor: riskColour(decision?.hazardAssessment.tier ?? screening.riskLevel),
    },
    {
      key: "Response Priority",
      value: decision
        ? `${decision.responsePriority.priorityLevel} (${decision.responsePriority.priorityScore}/100)`
        : `${screening.priority} (screening level)`,
      valueColor: riskColour(decision?.responsePriority.priorityLevel ?? screening.priority),
    },
    {
      key: "Population",
      value: popStr,
      provenanceType: location.populationSource?.includes("Census") ? "OFFICIAL" : "MODELLED",
      provenanceLabel: location.populationSource?.includes("Census") ? "OFFICIAL" : "MODELLED",
    },
    {
      key: "Safe Destination",
      value: destName,
      provenanceType: decision?.relocationAssessment.bestCandidate ? "DERIVED" : "UNAVAILABLE",
      provenanceLabel: decision?.relocationAssessment.bestCandidate ? "DERIVED" : "UNAVAILABLE",
    },
    {
      key: "Road Route",
      value: routeKm,
      provenanceType: decision?.routingAssessment.isRoadRoute ? "DERIVED" : "MODELLED",
      provenanceLabel: decision?.routingAssessment.isRoadRoute ? "OSRM" : "UNAVAILABLE",
    },
    {
      key: "Decision Confidence",
      value: decision?.confidence.level ?? "UNAVAILABLE",
      valueColor: decision?.confidence.level === "HIGH" ? PALETTE.safe : decision?.confidence.level === "LOW" ? PALETTE.high : PALETTE.moderate,
    },
  ];

  drawKVTable(doc, summaryRows, MARGIN, y, USABLE_W);
}

// ─── Page 2: Geographic Decision Map ─────────────────────────────────────────

function buildPage2(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 2, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;

  y = sectionHeading(doc, "2. GEOGRAPHIC DECISION MAP", MARGIN, y, USABLE_W);

  // Map subtitle — location full name
  doc.font("Helvetica-Bold").fontSize(10).fillColor(PALETTE.ink)
    .text(context.location.displayName ?? context.location.name, MARGIN, y, { width: USABLE_W });
  doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.faint)
    .text(`${formatCoord(context.location.latitude, "lat")}  ${formatCoord(context.location.longitude, "lon")}  |  WGS84 / EPSG:4326  |  ${context.location.category}`, MARGIN, y + 13);
  y += 26;

  // Main map
  const mapH = 330;
  renderDecisionMap(doc, context, MARGIN, y, USABLE_W, mapH);
  y += mapH + 12;

  // Map Provenance Table
  y = subHeading(doc, "Map Layer Provenance", MARGIN, y, USABLE_W);

  const mapProvenanceRows: KVRow[] = [
    {
      key: "Administrative Boundary",
      value: context.location.boundary
        ? "geoBoundaries ADM2 / Election Commission of India (geoBoundaries.org)"
        : "Bounding box from Nominatim geocoder (polygon unavailable)",
      provenanceType: context.location.boundary ? "OFFICIAL" : "DERIVED",
      provenanceLabel: context.location.boundary ? "OFFICIAL" : "DERIVED",
    },
    {
      key: "Location Centroid",
      value: `${context.location.source}`,
      provenanceType: "DERIVED",
      provenanceLabel: "GEOCODED",
    },
    {
      key: "Road Route",
      value: context.decision?.routingAssessment.isRoadRoute
        ? `Project OSRM / OpenStreetMap road graph — ${context.decision.routingAssessment.distanceKm?.toFixed(1)} km`
        : "OSRM road route unavailable for this origin/destination pair",
      provenanceType: context.decision?.routingAssessment.isRoadRoute ? "DERIVED" : "UNAVAILABLE",
      provenanceLabel: context.decision?.routingAssessment.isRoadRoute ? "OSRM" : "UNAVAILABLE",
    },
    {
      key: "Destination",
      value: context.decision?.relocationAssessment.bestCandidate
        ? `${context.decision.relocationAssessment.bestCandidate.name} (OpenStreetMap facility point)`
        : "No destination determined",
      provenanceType: context.decision?.relocationAssessment.bestCandidate ? "OBSERVED" : "UNAVAILABLE",
      provenanceLabel: context.decision?.relocationAssessment.bestCandidate ? "OSM" : "UNAVAILABLE",
    },
    {
      key: "Coordinate System",
      value: "WGS84 / EPSG:4326 throughout",
      provenanceType: "OFFICIAL",
      provenanceLabel: "STANDARD",
    },
    {
      key: "Scale",
      value: context.location.boundary
        ? "District/habitation scale (depends on boundary extent)"
        : "Approximately 1:250,000 equivalent",
    },
  ];

  drawKVTable(doc, mapProvenanceRows, MARGIN, y, USABLE_W);
}

// ─── Page 3: Decision Context + Hazard Assessment ────────────────────────────

function buildPage3(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 3, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;
  const { decision, screening, environment } = context;

  y = sectionHeading(doc, "3. DECISION CONTEXT & HAZARD ASSESSMENT", MARGIN, y, USABLE_W);

  // ── 3A: Separated Risk Components ──
  y = subHeading(doc, "3A. Risk Component Breakdown (Separated)", MARGIN, y, USABLE_W);

  // Four boxes in a row
  const boxW = (USABLE_W - 9) / 4;
  const boxH = 56;
  const boxes = [
    {
      title: "GEOGRAPHIC HAZARD",
      value: decision?.hazardAssessment.tier ?? (context.hazardProfile?.redZone.status ?? "UNKNOWN"),
      sub: decision?.hazardAssessment.primaryDriverReason ?? screening.hazardContext.split(".")[0] ?? "See hazard details",
      color: riskColour(decision?.hazardAssessment.tier ?? screening.riskLevel),
    },
    {
      title: "ACTIVE STATUS",
      value: environment?.imdWarning ? "OFFICIAL WARNING" : "NO ACTIVE WARNING",
      sub: environment?.imdWarning ? `${environment.imdWarning.warningLevel}: ${environment.imdWarning.headline}` : "No official IMD warning retrieved",
      color: environment?.imdWarning ? PALETTE.high : PALETTE.safe,
    },
    {
      title: "EXPOSURE",
      value: decision?.exposureAssessment.exposedPopulationEstimate !== null && decision?.exposureAssessment.exposedPopulationEstimate !== undefined
        ? formatPopulation(decision.exposureAssessment.exposedPopulationEstimate) + " people"
        : "UNKNOWN",
      sub: decision?.exposureAssessment.exposureMethod ?? "Population not resolved at this scale",
      color: PALETTE.moderate,
    },
    {
      title: "RESPONSE PRIORITY",
      value: decision?.responsePriority.priorityLevel ?? screening.priority.toUpperCase(),
      sub: decision ? `Score: ${decision.responsePriority.priorityScore}/100` : "Screening-level assessment",
      color: riskColour(decision?.responsePriority.priorityLevel ?? screening.priority),
    },
  ];

  boxes.forEach((box, bi) => {
    const bx = MARGIN + bi * (boxW + 3);
    doc.roundedRect(bx, y, boxW, boxH, 5).fill(PALETTE.surfaceLight).lineWidth(0.8).strokeColor(PALETTE.border).stroke();
    doc.moveTo(bx, y).lineTo(bx, y + boxH).lineWidth(3.5).strokeColor(box.color).stroke();
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.faint).text(box.title, bx + 8, y + 7, { width: boxW - 16 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(box.color).text(box.value, bx + 8, y + 18, { width: boxW - 16 });
    doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.muted).text(box.sub, bx + 8, y + 35, { width: boxW - 16 });
  });
  y += boxH + 12;

  // ── 3B: Primary Hazard ──
  y = subHeading(doc, "3B. Primary Hazard", MARGIN, y, USABLE_W);

  if (decision) {
    const hz = decision.hazardAssessment;
    const primaryRows: KVRow[] = [
      { key: "Primary Hazard", value: hz.primaryHazard, valueColor: PALETTE.high },
      { key: "Evidence Hierarchy Level", value: hz.contributions[0]?.hierarchyLevel ?? "SUSCEPTIBILITY_SCREENING", provenanceType: hz.provenance?.sourceType, provenanceLabel: hz.provenance?.sourceType },
      { key: "Primary Driver", value: hz.primaryDriverReason },
      { key: "Composite Hazard Score", value: `${hz.compositeHazardScore.toFixed(1)} / 100` },
      { key: "Triggers Confirmed", value: hz.triggers.length > 0 ? hz.triggers.join("; ") : "No physical triggers confirmed" },
      { key: "Supporting Evidence", value: hz.supportingEvidence.length > 0 ? hz.supportingEvidence.join("; ") : "None confirmed" },
      { key: "Provenance", value: hz.provenance?.sourceName ?? "Not specified" },
      { key: "Spatial Resolution", value: hz.provenance?.spatialResolution ?? "Not specified" },
      { key: "Confidence", value: hz.provenance?.confidence ?? "UNKNOWN" },
      { key: "Known Limitations", value: hz.limitations.join("; ") || "None stated" },
    ];
    y = drawKVTable(doc, primaryRows, MARGIN, y, USABLE_W);
  } else {
    const fallbackH = 38;
    doc.roundedRect(MARGIN, y, USABLE_W, fallbackH, 5).fill(PALETTE.surfaceMid).lineWidth(0.7).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(PALETTE.muted)
      .text(`Hazard context: ${screening.hazardContext}`, MARGIN + 12, y + 10, { width: USABLE_W - 24 });
    doc.font("Helvetica").fontSize(7).fillColor(PALETTE.faint)
      .text("Full hazard assessment requires decision engine to be executed for this location.", MARGIN + 12, y + 24, { width: USABLE_W - 24 });
    y += fallbackH + 8;
  }
  y += 8;

  // ── 3C: Secondary Hazards ──
  y = subHeading(doc, "3C. Secondary Hazards", MARGIN, y, USABLE_W);

  const secHazards = decision?.hazardAssessment.secondaryHazards ?? [];
  if (secHazards.length > 0) {
    const secH = (secHazards.length * 18) + 4;
    doc.roundedRect(MARGIN, y, USABLE_W, secH, 5).fill(PALETTE.surfaceLight).lineWidth(0.7).strokeColor(PALETTE.border).stroke();
    secHazards.forEach((sh, si) => {
      const sy = y + 4 + si * 18;
      doc.circle(MARGIN + 12, sy + 7, 3).fill(PALETTE.moderate);
      doc.font("Helvetica-Bold").fontSize(8).fillColor(PALETTE.body).text(sh, MARGIN + 20, sy + 2, { width: USABLE_W - 30 });
    });
    y += secH + 8;
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 24, 5).fill(PALETTE.surfaceMid).lineWidth(0.7).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(PALETTE.muted)
      .text("No confirmed secondary hazards from current evidence set.", MARGIN + 12, y + 7, { width: USABLE_W - 24 });
    y += 32;
  }

  // ── 3D: Meteorological Context ──
  y = subHeading(doc, "3D. Meteorological Context", MARGIN, y, USABLE_W);

  const env = context.environment;
  const tempStr = env.temperatureC !== null ? `${env.temperatureC}\u00b0C` : "Unavailable";
  const precipStr = env.precipitationMm !== null ? `${env.precipitationMm} mm` : "Unavailable";
  const aqiStr = env.usAqi !== null ? `AQI ${env.usAqi}` : "Unavailable";
  const imdStr = env.imdWarning ? `${env.imdWarning.warningLevel} — ${env.imdWarning.headline}` : "No active IMD warning retrieved";
  const obsAt = env.observedAt ? new Date(env.observedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Not available";

  const metRows: KVRow[] = [
    { key: "Temperature", value: tempStr, provenanceType: "MODELLED", provenanceLabel: "MODELLED" },
    { key: "Precipitation", value: precipStr, provenanceType: "MODELLED", provenanceLabel: "MODELLED" },
    { key: "Air Quality Index", value: aqiStr, provenanceType: "MODELLED", provenanceLabel: "MODELLED" },
    { key: "IMD Warning", value: imdStr, provenanceType: env.imdWarning ? "OFFICIAL" : "UNAVAILABLE", provenanceLabel: env.imdWarning ? "OFFICIAL" : "UNAVAILABLE" },
    { key: "Observation Timestamp", value: obsAt },
    { key: "Source", value: env.source },
    { key: "Temporal Status", value: env.imdWarning ? "CURRENT (OFFICIAL)" : "MODELLED (Open-Meteo NWP)" },
  ];

  drawKVTable(doc, metRows, MARGIN, y, USABLE_W);
}

// ─── Page 4: Exposure, Vulnerability, Capacity ───────────────────────────────

function buildPage4(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 4, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;
  const { decision, location, screening, infrastructure } = context;

  y = sectionHeading(doc, "4. EXPOSURE, VULNERABILITY & EVACUATION CAPACITY", MARGIN, y, USABLE_W);

  // ── 4A: Exposure (who is in the area) ──
  y = subHeading(doc, "4A. Exposure  — Who is in the affected area?", MARGIN, y, USABLE_W);

  const exp = decision?.exposureAssessment;
  const popVal = exp?.populationValue ?? location.population ?? null;
  const popSource = exp?.populationSource ?? location.populationSource ?? "Not specified";
  const popYear = exp?.populationYear ?? (popSource.includes("Census") ? 2011 : null);
  const popRes = exp?.populationResolution ?? (location.category === "District" ? "District" : "Place");
  const popMethod = exp?.exposureMethod ?? "Direct geocoder value";

  const expRows: KVRow[] = [
    {
      key: "Population",
      value: popVal !== null ? `${formatPopulation(popVal)} people` : "UNAVAILABLE at this spatial resolution",
      valueColor: popVal !== null ? PALETTE.body : PALETTE.high,
      provenanceType: popSource.includes("Census") ? "OFFICIAL" : "MODELLED",
      provenanceLabel: popSource.includes("Census") ? "OFFICIAL" : "MODELLED",
    },
    { key: "Population Source", value: popSource },
    { key: "Data Year", value: popYear ? String(popYear) : "UNKNOWN" },
    { key: "Spatial Resolution", value: popRes },
    { key: "Exposure Method", value: popMethod },
    {
      key: "Exposed Population Estimate",
      value: exp?.exposedPopulationEstimate !== null && exp?.exposedPopulationEstimate !== undefined
        ? `${formatPopulation(exp.exposedPopulationEstimate)} people`
        : "UNAVAILABLE",
      provenanceType: exp ? "DERIVED" : "UNAVAILABLE",
      provenanceLabel: exp ? "DERIVED" : "UNAVAILABLE",
    },
    { key: "Exposure Rationale", value: exp?.exposureRationale ?? screening.populationContext },
  ];

  y = drawKVTable(doc, expRows, MARGIN, y, USABLE_W);
  y += 10;

  // Exposed habitations sub-table
  const habList = decision?.exposureAssessment.exposedHabitations ?? [];

  if (habList.length > 0) {
    y = subHeading(doc, "Exposed Habitations", MARGIN, y, USABLE_W);
    // Header
    doc.rect(MARGIN, y, USABLE_W, 18).fill(PALETTE.surfaceMid);
    const hCols = [180, 110, 90, 80, 55];
    const hHeaders = ["HABITATION / VILLAGE", "HAZARD TYPE", "DISTANCE TO HAZARD", "POPULATION", "IN HAZARD ZONE"];
    let hx = MARGIN + 8;
    hHeaders.forEach((h, i) => {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(PALETTE.muted).text(h, hx, y + 5, { width: hCols[i] - 4 });
      hx += hCols[i];
    });
    doc.rect(MARGIN, y, USABLE_W, 18).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
    y += 18;

    habList.slice(0, 6).forEach((hab: any, hi: number) => {
      const bg = hi % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
      doc.rect(MARGIN, y, USABLE_W, 18).fill(bg);
      const habCols = [
        hab.name ?? `Habitation ${hi + 1}`,
        hab.hazardType ?? "Unknown",
        hab.distanceToHazardKm !== null && hab.distanceToHazardKm !== undefined ? `${Number(hab.distanceToHazardKm).toFixed(1)} km` : "Unknown",
        hab.population !== null && hab.population !== undefined ? formatPopulation(hab.population) : "Unverified",
        hab.insideHazardZone ? "YES" : "No",
      ];
      let hxr = MARGIN + 8;
      habCols.forEach((v, ci) => {
        const col = ci === 4 && v === "YES" ? PALETTE.high : PALETTE.body;
        doc.font(ci === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(7.5).fillColor(col).text(v, hxr, y + 5, { width: hCols[ci] - 4 });
        hxr += hCols[ci];
      });
      doc.rect(MARGIN, y, USABLE_W, 18).lineWidth(0.4).strokeColor(PALETTE.borderLight).stroke();
      y += 18;
    });
    y += 8;
  }

  // ── 4B: Vulnerability (why harder to evacuate) ──
  y = subHeading(doc, "4B. Vulnerability  — Why might this population be harder to evacuate?", MARGIN, y, USABLE_W);

  const vuln = decision?.vulnerabilityAssessment;
  if (vuln) {
    const vulnRows: KVRow[] = [
      { key: "Vulnerability Status", value: vuln.status },
      {
        key: "Vulnerability Score",
        value: vuln.vulnerabilityScore !== null ? `${vuln.vulnerabilityScore}/20` : "DATA INSUFFICIENT",
        valueColor: vuln.vulnerabilityScore !== null ? PALETTE.body : PALETTE.high,
      },
      { key: "Demographic Data Available", value: vuln.demographicDataAvailable ? "Yes" : "No" },
      { key: "Terrain Vulnerability", value: vuln.terrainVulnerabilityScore !== null ? `${vuln.terrainVulnerabilityScore}` : "Not assessed" },
      { key: "Accessibility Constraint", value: vuln.accessibilityConstraintScore !== null ? `${vuln.accessibilityConstraintScore}` : "Not assessed" },
      { key: "Rationale", value: vuln.rationale },
    ];
    if (vuln.factors.length > 0) {
      vulnRows.push({ key: "Vulnerability Factors", value: vuln.factors.map((f) => `${f.name}: ${f.value} (${f.evidence})`).join("; ") });
    }
    y = drawKVTable(doc, vulnRows, MARGIN, y, USABLE_W);
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 30, 5).fill(PALETTE.surfaceMid).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(PALETTE.muted)
      .text("Vulnerability Assessment: DATA INSUFFICIENT — full decision pipeline not executed for this location.", MARGIN + 12, y + 10, { width: USABLE_W - 24 });
    y += 38;
  }
  y += 10;

  // ── 4C: Evacuation Capacity ──
  y = subHeading(doc, "4C. Evacuation Capacity Assessment", MARGIN, y, USABLE_W);

  const cap = decision?.capacityAssessment;
  const catInfra = context.categorizedInfrastructure;
  const totalFac = cap?.totalNearbyFacilities ?? infrastructure.items.length;
  const shelterCount = cap?.eligibleRelocationShelters ?? catInfra?.shelters.length ?? 0;
  const hospCount = cap?.hospitalsExcludedFromShelters ?? catInfra?.hospitals.length ?? 0;

  doc.save();
  doc.roundedRect(MARGIN, y, USABLE_W, 22, 4).fill("#FEF9C3").lineWidth(0.6).strokeColor("#FDE047").stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.derived)
    .text("IMPORTANT: Facility existence does NOT equal verified capacity. Capacity shown as UNKNOWN unless verified from official field registers.", MARGIN + 10, y + 7, { width: USABLE_W - 20 });
  doc.restore();
  y += 28;

  const capRows: KVRow[] = [
    { key: "Total Nearby Facilities", value: `${totalFac}` },
    { key: "Eligible Relocation Shelters", value: `${shelterCount}`, provenanceType: "OBSERVED", provenanceLabel: "OSM" },
    { key: "Hospitals (medical support only)", value: `${hospCount}`, provenanceType: "OBSERVED", provenanceLabel: "OSM" },
    {
      key: "Capacity Verified",
      value: cap?.capacityVerified ? "YES" : "UNKNOWN — not verified from field register",
      valueColor: cap?.capacityVerified ? PALETTE.safe : PALETTE.high,
    },
    {
      key: "Available Capacity",
      value: cap?.availableCapacity !== null && cap?.availableCapacity !== undefined ? `${cap.availableCapacity} persons` : "UNKNOWN",
      valueColor: cap?.availableCapacity !== null && cap?.availableCapacity !== undefined ? PALETTE.body : PALETTE.high,
    },
    {
      key: "Required Capacity",
      value: cap?.requiredCapacity !== null && cap?.requiredCapacity !== undefined ? `${formatPopulation(cap.requiredCapacity)} persons` : "UNKNOWN",
    },
    {
      key: "Capacity Deficit",
      value: cap?.capacityDeficit !== null && cap?.capacityDeficit !== undefined ? `${formatPopulation(cap.capacityDeficit)} persons` : "UNKNOWN",
    },
    { key: "Capacity Status", value: cap?.capacityStatus ?? "UNKNOWN", valueColor: cap?.capacityStatus === "CAPACITY_KNOWN" ? PALETTE.safe : PALETTE.high },
    { key: "Capacity Source", value: cap?.capacitySource ?? "OpenStreetMap geometry (unverified)" },
    { key: "Notes", value: cap?.notes ?? "Facility counts are from OSM; actual capacities require field verification against DDMA shelter registers." },
  ];

  drawKVTable(doc, capRows, MARGIN, y, USABLE_W);
}

// ─── Page 5: Safe Destination + Road Route ───────────────────────────────────

function buildPage5(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 5, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;
  const { decision, location } = context;

  y = sectionHeading(doc, "5. SAFE DESTINATION & ROAD ROUTE", MARGIN, y, USABLE_W);

  // ── 5A: Safe Destination Assessment ──
  y = subHeading(doc, "5A. Safe Destination Assessment", MARGIN, y, USABLE_W);

  const reloc = decision?.relocationAssessment;
  const dest = reloc?.bestCandidate;

  if (dest) {
    const destSafety = reloc?.destinationSafety;
    const safetyColor = destSafety?.destinationSafetyStatus === "SAFE" ? PALETTE.safe
      : destSafety?.destinationSafetyStatus === "CONDITIONAL" ? PALETTE.moderate
      : PALETTE.high;

    const destRows: KVRow[] = [
      { key: "Origin", value: `${location.displayName ?? location.name}` },
      { key: "Origin Coordinates", value: `${formatCoord(location.latitude, "lat")}, ${formatCoord(location.longitude, "lon")}` },
      { key: "Destination Name", value: dest.name },
      { key: "Destination Type", value: dest.facilityRole ?? "SHELTER" },
      {
        key: "Destination Coordinates",
        value: typeof dest.latitude === "number" && typeof dest.longitude === "number"
          ? `${formatCoord(dest.latitude, "lat")}, ${formatCoord(dest.longitude, "lon")}`
          : "Unavailable",
      },
      {
        key: "Destination Safety Status",
        value: destSafety?.destinationSafetyStatus ?? "UNKNOWN",
        valueColor: safetyColor,
      },
      {
        key: "Destination Inside Hazard Zone",
        value: destSafety?.destinationInsideHazard ? "YES — CAUTION" : "No (validated outside active hazard)",
        valueColor: destSafety?.destinationInsideHazard ? PALETTE.high : PALETTE.safe,
      },
      { key: "Destination Hazard Tier", value: destSafety?.destinationHazardTier ?? "UNSCREENED" },
      { key: "Candidate Status", value: reloc?.candidateStatus ?? "UNKNOWN" },
      {
        key: "Capacity Status",
        value: dest.capacity !== null && dest.capacity !== undefined
          ? `${formatPopulation(dest.capacity)} persons (UNVERIFIED from OSM)`
          : "UNKNOWN — capacity not verified from field register",
        provenanceType: "OBSERVED",
        provenanceLabel: "OSM",
      },
      { key: "Road Accessibility", value: dest.routeDistanceKm !== null && dest.routeDistanceKm !== undefined ? `${dest.routeDistanceKm.toFixed(1)} km road route` : "Not computed" },
      { key: "Destination Rationale", value: reloc?.rationale ?? "Best available candidate from OSM facility search" },
      { key: "Safety Check Details", value: destSafety?.checkDetails ?? "Not available" },
    ];
    y = drawKVTable(doc, destRows, MARGIN, y, USABLE_W);

    // Alternative candidates
    if ((reloc?.conditionalAlternatives?.length ?? 0) > 0) {
      y += 8;
      y = subHeading(doc, "Conditional Alternative Destinations", MARGIN, y, USABLE_W);
      doc.roundedRect(MARGIN, y, USABLE_W, 16 + (reloc!.conditionalAlternatives.length * 16), 5)
        .fill(PALETTE.surfaceLight).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
      reloc!.conditionalAlternatives.slice(0, 4).forEach((alt, ai) => {
        doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.body)
          .text(`${ai + 1}. ${alt.name}  |  Role: ${alt.facilityRole}  |  ${alt.routeDistanceKm ? alt.routeDistanceKm.toFixed(1) + " km" : "Distance unknown"}`, MARGIN + 12, y + 8 + ai * 16, { width: USABLE_W - 24 });
      });
      y += 16 + reloc!.conditionalAlternatives.length * 16 + 8;
    }
  } else {
    doc.roundedRect(MARGIN, y, USABLE_W, 40, 5).fill("#FEE2E2").lineWidth(0.7).strokeColor("#FCA5A5").stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(PALETTE.high)
      .text("DESTINATION: UNAVAILABLE", MARGIN + 12, y + 10);
    doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.muted)
      .text("No eligible destination facility identified within the search radius for this location/hazard combination.", MARGIN + 12, y + 24, { width: USABLE_W - 24 });
    y += 48;
  }
  y += 10;

  // ── 5B: Road Route ──
  y = subHeading(doc, "5B. Road Route Assessment", MARGIN, y, USABLE_W);

  const routing = decision?.routingAssessment;

  if (!routing) {
    doc.roundedRect(MARGIN, y, USABLE_W, 30, 5).fill(PALETTE.surfaceMid).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(PALETTE.muted)
      .text("Road route assessment: UNAVAILABLE (decision not computed for this location).", MARGIN + 12, y + 10, { width: USABLE_W - 24 });
    y += 38;
  } else {
    // Status banner
    const routeIsReal = routing.isRoadRoute;
    const routeBannerColor = routeIsReal ? PALETTE.safe : PALETTE.moderate;
    const routeBannerBg = routeIsReal ? PALETTE.safeBg : "#FEF9C3";
    doc.roundedRect(MARGIN, y, USABLE_W, 24, 5).fill(routeBannerBg).lineWidth(0.6).strokeColor(routeIsReal ? "#86EFAC" : "#FDE047").stroke();
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(routeBannerColor)
      .text(
        routeIsReal ? "ROAD ROUTE STATUS: VERIFIED — OSRM / OpenStreetMap Road Network" : "ROAD ROUTE STATUS: UNAVAILABLE — Geodesic proxy shown; NOT a road distance",
        MARGIN + 12, y + 8, { width: USABLE_W - 24 }
      );
    y += 30;

    const routeRows: KVRow[] = [
      { key: "Route Origin", value: `${routing.origin.name}  (${formatCoord(routing.origin.latitude, "lat")}, ${formatCoord(routing.origin.longitude, "lon")})` },
      {
        key: "Route Destination",
        value: routing.destination
          ? `${routing.destination.name}  |  Role: ${routing.destination.role}`
          : "No destination",
      },
      {
        key: "Route Distance",
        value: routing.distanceKm !== null && routing.distanceKm !== undefined
          ? `${routing.distanceKm.toFixed(2)} km`
          : "UNAVAILABLE",
        valueColor: routing.distanceKm !== null ? PALETTE.body : PALETTE.high,
        provenanceType: routeIsReal ? "DERIVED" : "UNAVAILABLE",
        provenanceLabel: routeIsReal ? "OSRM" : "UNAVAILABLE",
      },
      {
        key: "Estimated Travel Time",
        value: routing.durationMinutes !== null && routing.durationMinutes !== undefined
          ? `${Math.floor(routing.durationMinutes / 60)}h ${Math.round(routing.durationMinutes % 60)}min`
          : "UNAVAILABLE",
      },
      { key: "Route Type", value: routeIsReal ? "OSRM road-network geometry (real road centerlines)" : "DIRECT DISTANCE — geodesic line (not a road route)" },
      { key: "Route Status Badge", value: routing.displayBadge },
      { key: "Source Note", value: routing.sourceNote },
      {
        key: "Geometry Validation",
        value: routing.validation.geometryExists
          ? `Geometry exists: YES  |  Origin proximity: ${routing.validation.originProximityValid ? "PASS" : "FAIL"}  |  Dest proximity: ${routing.validation.destinationProximityValid ? "PASS" : "FAIL"}`
          : "Geometry not returned by OSRM",
      },
    ];

    drawKVTable(doc, routeRows, MARGIN, y, USABLE_W);
    y += routeRows.length * 18 + 8;

    // Consistency checks
    if (decision?.consistencyChecks && decision.consistencyChecks.length > 0) {
      y = subHeading(doc, "Cross-Source Consistency Checks", MARGIN, y, USABLE_W);
      decision.consistencyChecks.forEach((chk, ci) => {
        const checkBg = chk.status === "PASSED" ? "#DCFCE7" : chk.status === "FAILED" ? "#FEE2E2" : "#FEF9C3";
        const checkColor = chk.status === "PASSED" ? PALETTE.official : chk.status === "FAILED" ? PALETTE.high : PALETTE.derived;
        doc.roundedRect(MARGIN, y, USABLE_W, 26, 4).fill(checkBg).lineWidth(0.5).strokeColor(PALETTE.border).stroke();
        doc.font("Helvetica-Bold").fontSize(7.5).fillColor(checkColor)
          .text(`${chk.status}  |  ${chk.name}`, MARGIN + 10, y + 5, { width: USABLE_W / 2 - 10 });
        doc.font("Helvetica").fontSize(7).fillColor(PALETTE.body)
          .text(chk.details, MARGIN + USABLE_W / 2, y + 5, { width: USABLE_W / 2 - 10 });
        doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.faint)
          .text(`Source: ${chk.source}`, MARGIN + 10, y + 17, { width: USABLE_W - 20 });
        y += 30;
      });
    }
  }
}

// ─── Page 6: Why This Decision ───────────────────────────────────────────────

function buildPage6(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 6, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;
  const { decision } = context;

  y = sectionHeading(doc, "6. WHY DID RESQ PRODUCE THIS DECISION?", MARGIN, y, USABLE_W);

  if (!decision) {
    doc.roundedRect(MARGIN, y, USABLE_W, 50, 5).fill(PALETTE.surfaceMid).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(PALETTE.muted).text("Decision Engine Not Executed", MARGIN + 12, y + 12);
    doc.font("Helvetica").fontSize(8).fillColor(PALETTE.muted)
      .text("The full decision pipeline was not computed for this location. Only screening-level context is available.", MARGIN + 12, y + 26, { width: USABLE_W - 24 });
    y += 58;
  } else {
    const expl = decision.explanation;

    // Structured causal chain
    y = subHeading(doc, "6A. Causal Decision Chain", MARGIN, y, USABLE_W);

    const chainSteps = [
      { num: "1", label: "Hazard Identification", text: expl.whyThisHazard },
      { num: "2", label: "Hazard Severity", text: expl.whyThisSeverity },
      { num: "3", label: "Location Assessment", text: expl.whyThisLocation },
      { num: "4", label: "Response Priority", text: expl.whyThisPriority },
      { num: "5", label: "Destination Selection", text: expl.whyThisDestination },
      { num: "6", label: "Route Selection", text: expl.whyThisRoute },
      { num: "7", label: "Why Not Another Destination", text: expl.whyNotAnotherDestination },
      { num: "8", label: "Missing Data", text: expl.whatDataIsMissing },
    ];

    chainSteps.forEach((step) => {
      const textH = doc.font("Helvetica").fontSize(8).heightOfString(step.text, { width: USABLE_W - 60, lineGap: 1.5 });
      const stepH = Math.max(32, textH + 16);
      doc.roundedRect(MARGIN, y, USABLE_W, stepH, 4).fill(PALETTE.surfaceLight).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
      // Step circle
      doc.circle(MARGIN + 16, y + stepH / 2, 9).fill(PALETTE.brandBlue);
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF").text(step.num, MARGIN + 12.5, y + stepH / 2 - 5);
      // Label
      doc.font("Helvetica-Bold").fontSize(8).fillColor(PALETTE.ink).text(step.label, MARGIN + 32, y + 8, { width: USABLE_W - 48 });
      // Text
      doc.font("Helvetica").fontSize(8).fillColor(PALETTE.body).text(step.text, MARGIN + 32, y + 19, { width: USABLE_W - 48, lineGap: 1.5 });
      y += stepH + 4;
    });
    y += 8;

    // ── 6B: Priority Score Breakdown ──
    y = subHeading(doc, "6B. Response Priority Score Breakdown", MARGIN, y, USABLE_W);

    const pri = decision.responsePriority;
    const comps: Array<{ key: keyof typeof pri.components; label: string; color: string }> = [
      { key: "hazardSeverity", label: "Hazard Severity", color: PALETTE.high },
      { key: "populationExposure", label: "Population Exposure", color: PALETTE.moderate },
      { key: "vulnerability", label: "Vulnerability", color: "#7C3AED" },
      { key: "capacityDeficit", label: "Capacity Deficit", color: PALETTE.safe },
      { key: "accessibility", label: "Accessibility", color: PALETTE.brandAccent },
    ];

    // Score bar for each component
    const barTotalW = USABLE_W - 24;
    const barH = 14;
    comps.forEach((comp) => {
      const c = pri.components[comp.key];
      const fraction = c.maxWeight > 0 ? c.normalizedValue / c.maxWeight : 0;
      const labelText = `${comp.label}: ${c.normalizedValue}/${c.maxWeight}`;
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.body).text(labelText, MARGIN + 12, y, { width: 160 });
      doc.font("Helvetica").fontSize(7).fillColor(PALETTE.faint)
        .text(`Method: ${c.method}  |  Uncertainty: ${c.uncertainty}`, MARGIN + 180, y, { width: barTotalW - 168 });
      y += 11;
      // Background bar
      doc.roundedRect(MARGIN + 12, y, barTotalW, barH, 3).fill(PALETTE.borderLight);
      // Filled bar
      const fillW = Math.max(3, fraction * barTotalW);
      doc.roundedRect(MARGIN + 12, y, fillW, barH, 3).fill(comp.color);
      y += barH + 6;
    });

    // Total score
    y += 4;
    doc.roundedRect(MARGIN, y, USABLE_W, 36, 5).fill(PALETTE.surfaceLight).lineWidth(1).strokeColor(PALETTE.border).stroke();
    doc.font("Helvetica-Bold").fontSize(10).fillColor(PALETTE.ink)
      .text(`TOTAL SCORE: ${pri.priorityScore} / 100  —  ${pri.priorityLevel}`, MARGIN + 12, y + 12, { width: USABLE_W - 24 });
    y += 44;

    doc.font("Helvetica").fontSize(7.5).fillColor(PALETTE.faint)
      .text(
        "Note: Response Priority is an operational prioritization score. It is NOT a direct measurement of physical hazard severity. A score of MEDIUM does not mean the hazard is less dangerous — it reflects the composite decision weighting across hazard, exposure, vulnerability, capacity, and accessibility.",
        MARGIN, y, { width: USABLE_W, lineGap: 1.5 }
      );
    y += 30;

    // ── 6C: Confidence vs Coverage ──
    y = subHeading(doc, "6C. Confidence vs Data Coverage", MARGIN, y, USABLE_W);

    const confRows: KVRow[] = [
      {
        key: "Data Coverage",
        value: context.evidenceCoverage?.label ?? "Not computed",
        provenanceType: "DERIVED",
        provenanceLabel: "DERIVED",
      },
      {
        key: "Decision Confidence Level",
        value: decision.confidence.level,
        valueColor: riskColour(decision.confidence.level === "LOW" ? "HIGH" : decision.confidence.level === "HIGH" ? "SAFE" : "MODERATE"),
      },
      { key: "Confidence Score", value: `${(decision.confidence.score * 100).toFixed(0)}%` },
      { key: "Confidence Reasons", value: decision.confidence.reasons.join("; ") || "Not specified" },
      { key: "Uncertainty Level", value: decision.uncertainty.level },
      { key: "Uncertainty Reasons", value: decision.uncertainty.reasons.join("; ") || "None" },
      { key: "Missing Datasets", value: decision.uncertainty.missingDatasets.join("; ") || "None identified" },
    ];

    drawKVTable(doc, confRows, MARGIN, y, USABLE_W);
  }
}

// ─── Page 7: Data Quality, Limitations & Source Provenance ───────────────────

function buildPage7(doc: PdfDocument, context: IndiaLocationContext, generatedAt: string): void {
  drawPageHeader(doc, context.location.name, 7, 7);
  drawPageFooter(doc, generatedAt);

  let y = MARGIN + 6;
  const { decision, location, environment } = context;

  y = sectionHeading(doc, "7. DATA QUALITY, LIMITATIONS & SOURCE PROVENANCE", MARGIN, y, USABLE_W);

  // ── Evidence Register ──
  y = subHeading(doc, "7A. Evidence Register", MARGIN, y, USABLE_W);

  const snapshot = decision?.dataSnapshot;
  const evidenceRows: EvidenceRow[] = [];
  let evIdx = 1;

  const sourcesToShow = snapshot?.sources
    ? Object.values(snapshot.sources)
    : [
        { sourceId: "admin_boundary", sourceName: "geoBoundaries ADM2 / ECI", sourceType: "OFFICIAL" as const, freshness: "STATIC_REFERENCE", resolution: "District polygon", confidence: "HIGH" as const },
        { sourceId: "population", sourceName: location.populationSource, sourceType: (location.populationSource?.includes("Census") ? "OFFICIAL" : "MODELLED") as any, freshness: "HISTORICAL", resolution: "District/Town", confidence: (location.population !== null ? "HIGH" : "UNAVAILABLE") as any },
        { sourceId: "seismic_baseline", sourceName: "BIS IS 1893:2016", sourceType: "OFFICIAL" as const, freshness: "STATIC_REFERENCE", resolution: "National zonation", confidence: "HIGH" as const },
        { sourceId: "weather_telemetry", sourceName: environment.source, sourceType: (environment.imdWarning ? "OFFICIAL" : "MODELLED") as any, freshness: environment.imdWarning ? "CURRENT" : "MODELLED", resolution: "Point observation", confidence: (environment.temperatureC !== null ? "HIGH" : "UNAVAILABLE") as any },
        { sourceId: "road_network", sourceName: "Project OSRM / OpenStreetMap", sourceType: "DERIVED" as const, freshness: "CURRENT", resolution: "Road centerline", confidence: "HIGH" as const },
      ];

  sourcesToShow.slice(0, 14).forEach((src) => {
    const hazardMap: Record<string, string> = {
      flood_historical: "FLOOD", cwc_hydrology: "FLOOD", landslide_atlas: "LANDSLIDE",
      weather_telemetry: "RAINFALL/WEATHER", seismic_baseline: "SEISMIC", tectonics_faults: "SEISMIC",
      geology_lithology: "GEOLOGY", geomorphology: "GEOLOGY", terrain: "TERRAIN",
      admin_boundary: "ADMINISTRATIVE", population: "POPULATION", facilities_osm: "EVACUATION",
      road_network: "ROUTING", geomorphology_nrsc: "LANDSLIDE",
    };
    const hazardLabel = hazardMap[src.sourceId] ?? "GENERAL";
    evidenceRows.push({
      id: `EV-${String(evIdx++).padStart(3, "0")}`,
      hazard: hazardLabel,
      type: src.freshness ?? "UNKNOWN",
      org: src.sourceName.split(" ").slice(0, 3).join(" "),
      temporal: freshnessLabel(src.freshness),
      resolution: (src as any).resolution ?? "Not specified",
      value: "PRESENT",
      provenance: src.sourceType ?? "UNKNOWN",
      confidence: src.confidence ?? "UNKNOWN",
    });
  });

  if (evidenceRows.length > 0) {
    y = drawEvidenceTable(doc, evidenceRows, MARGIN, y, USABLE_W);
  }
  y += 10;

  // ── 7B: Data Quality Flags ──
  y = subHeading(doc, "7B. Data Quality & Completeness Flags", MARGIN, y, USABLE_W);

  type FlagStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "VERIFIED" | "UNKNOWN" | "MODELLED" | "REFERENCE" | "HISTORICAL";
  const flags: Array<{ variable: string; status: FlagStatus; note: string }> = [
    {
      variable: "Population",
      status: location.population !== null ? "AVAILABLE" : "UNAVAILABLE",
      note: location.population !== null ? location.populationSource : "No population returned by geocoder for this spatial level",
    },
    {
      variable: "Administrative Boundary",
      status: location.boundary ? "AVAILABLE" : "PARTIAL",
      note: location.boundary ? "Polygon geometry available" : "Only centroid available; polygon from geocoder was null",
    },
    {
      variable: "Facility Capacity",
      status: decision?.capacityAssessment.capacityVerified ? "VERIFIED" : "UNKNOWN",
      note: "Facility locations known from OSM; bed capacities require DDMA field register verification",
    },
    {
      variable: "Current Official Warning",
      status: environment.imdWarning ? "AVAILABLE" : "UNAVAILABLE",
      note: environment.imdWarning ? `IMD ${environment.imdWarning.warningLevel}: ${environment.imdWarning.headline}` : "No IMD warning retrieved for this location",
    },
    {
      variable: "Historical Flood Footprint",
      status: (decision?.hazardAssessment.specificExposures.flood.insideHistoricalFloodExtent || decision?.hazardAssessment.specificExposures.flood.distanceToFloodExtentKm !== null) ? "REFERENCE" : "UNAVAILABLE",
      note: "NRSC/Bhuvan historical inundation footprints used as reference; not a live flood observation",
    },
    {
      variable: "OSRM Road Route",
      status: decision?.routingAssessment.isRoadRoute ? "AVAILABLE" : "UNAVAILABLE",
      note: decision?.routingAssessment.isRoadRoute ? "Real road centerline returned by OSRM" : "OSRM failed or no destination; geodesic fallback may be shown",
    },
    {
      variable: "Destination Safety",
      status: decision?.relocationAssessment.destinationSafety.destinationSafetyStatus === "SAFE" ? "VERIFIED"
        : decision?.relocationAssessment.bestCandidate ? "PARTIAL"
        : "UNKNOWN",
      note: decision?.relocationAssessment.destinationSafety.checkDetails ?? "No destination evaluated",
    },
    {
      variable: "Terrain / Elevation",
      status: context.terrain ? "AVAILABLE" : "MODELLED",
      note: "Copernicus DEM GLO-90 (90m); used for slope and flood-hazard context",
    },
    {
      variable: "Geology / Lithology",
      status: context.geology ? "REFERENCE" : "REFERENCE",
      note: "GSI Bhukosh 1:2M bedrock geology; static reference dataset",
    },
    {
      variable: "Weather Forecast",
      status: environment.forecast && environment.forecast.length > 0 ? "MODELLED" : "UNAVAILABLE",
      note: "Open-Meteo 5-day NWP; modelled data, not official IMD observation",
    },
  ];

  const flagRowH = 18;
  flags.forEach((flag, fi) => {
    const bg = fi % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    const statusColor = ["AVAILABLE", "VERIFIED", "REFERENCE"].includes(flag.status) ? PALETTE.safe
      : flag.status === "UNAVAILABLE" || flag.status === "UNKNOWN" ? PALETTE.high
      : PALETTE.moderate;
    doc.rect(MARGIN, y, USABLE_W, flagRowH).fill(bg);
    doc.moveTo(MARGIN, y + flagRowH).lineTo(MARGIN + USABLE_W, y + flagRowH).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.muted).text(flag.variable, MARGIN + 8, y + 5, { width: 140 });
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor(statusColor).text(flag.status, MARGIN + 152, y + 5, { width: 80 });
    doc.font("Helvetica").fontSize(7).fillColor(PALETTE.body).text(flag.note, MARGIN + 238, y + 5, { width: USABLE_W - 246 });
    y += flagRowH;
  });
  doc.rect(MARGIN, y - flagRowH * flags.length, USABLE_W, flagRowH * flags.length).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  y += 12;

  // ── 7C: Source Registry ──
  y = subHeading(doc, "7C. Complete Source Registry", MARGIN, y, USABLE_W);

  const sourceRegistry = [
    { org: "GSI (Geological Survey of India)", dataset: "Bhukosh 1:2M Bedrock Geology & SEISAT Seismotectonic Atlas", type: "OFFICIAL", temporal: "STATIC_REFERENCE", url: "bhukosh.gsi.gov.in" },
    { org: "NRSC / ISRO", dataset: "Historical Inundation Footprints, Landslide Atlas 2023, Bhuvan GIS", type: "OFFICIAL", temporal: "HISTORICAL", url: "bhuvan.nrsc.gov.in" },
    { org: "CWC", dataset: "National Flood Forecasting Network — River Gauge Telemetry", type: "OFFICIAL", temporal: "CURRENT", url: "cwc.gov.in" },
    { org: "BIS", dataset: "IS 1893:2016 — Criteria for Earthquake Resistant Design (Seismic Zones)", type: "OFFICIAL", temporal: "STATIC_REFERENCE", url: "bis.gov.in" },
    { org: "IMD", dataset: "Nowcast / Weather Warnings / Cyclone Bulletins", type: "OFFICIAL", temporal: "CURRENT", url: "mausam.imd.gov.in" },
    { org: "WorldPop / Census of India", dataset: "Population Estimates (2011 PCA, 2020 WorldPop 100m)", type: "OFFICIAL/MODELLED", temporal: "HISTORICAL/MODELLED", url: "worldpop.org / censusindia.gov.in" },
    { org: "Copernicus / Esri", dataset: "GLO-90 DEM (90m) + Esri World Elevation", type: "OBSERVED", temporal: "STATIC_REFERENCE", url: "spacedata.copernicus.eu" },
    { org: "OpenStreetMap / Overpass", dataset: "Facility Nodes & Road Network", type: "OBSERVED", temporal: "CURRENT", url: "openstreetmap.org" },
    { org: "Project OSRM", dataset: "OpenStreetMap Road-Network Routing Engine", type: "DERIVED", temporal: "CURRENT", url: "project-osrm.org" },
    { org: "geoBoundaries / ECI", dataset: "ADM1/ADM2 Administrative Boundaries", type: "OFFICIAL", temporal: "STATIC_REFERENCE", url: "geoboundaries.org" },
    { org: "Nominatim / OSM", dataset: "Geocoding & Place Resolution", type: "DERIVED", temporal: "CURRENT", url: "nominatim.openstreetmap.org" },
    { org: "Open-Meteo", dataset: "NWP Atmospheric Model Output (Forecast)", type: "MODELLED", temporal: "FORECAST", url: "open-meteo.com" },
    { org: "NOAA IBTrACS", dataset: "International Best Track Archive for Climate Stewardship (Cyclone tracks)", type: "OFFICIAL", temporal: "HISTORICAL", url: "ncei.noaa.gov/products/international-best-track-archive" },
  ];

  const srcRowH = 16;
  // Header
  doc.rect(MARGIN, y, USABLE_W, 16).fill(PALETTE.surfaceMid);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text("ORGANIZATION", MARGIN + 6, y + 4, { width: 120 });
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text("DATASET", MARGIN + 132, y + 4, { width: 170 });
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text("TYPE", MARGIN + 308, y + 4, { width: 60 });
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text("TEMPORAL", MARGIN + 372, y + 4, { width: 70 });
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.muted).text("URL / IDENTIFIER", MARGIN + 448, y + 4, { width: USABLE_W - 454 });
  y += 16;

  sourceRegistry.forEach((src, si) => {
    const bg = si % 2 === 0 ? PALETTE.surfaceLight : PALETTE.pageWhite;
    doc.rect(MARGIN, y, USABLE_W, srcRowH).fill(bg);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(PALETTE.body).text(src.org, MARGIN + 6, y + 4, { width: 124 });
    doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.body).text(src.dataset, MARGIN + 132, y + 4, { width: 173 });
    const typeColors = provenanceBadgeColors(src.type.split("/")[0]);
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(typeColors.fg).text(src.type, MARGIN + 308, y + 4, { width: 60 });
    doc.font("Helvetica").fontSize(6.5).fillColor(PALETTE.faint).text(src.temporal, MARGIN + 372, y + 4, { width: 70 });
    doc.font("Helvetica").fontSize(6).fillColor(PALETTE.faint).text(src.url, MARGIN + 448, y + 5, { width: USABLE_W - 454 });
    doc.rect(MARGIN, y, USABLE_W, srcRowH).lineWidth(0.3).strokeColor(PALETTE.borderLight).stroke();
    y += srcRowH;
  });
  doc.rect(MARGIN, y - srcRowH * sourceRegistry.length - 16, USABLE_W, srcRowH * sourceRegistry.length + 16).lineWidth(0.6).strokeColor(PALETTE.border).stroke();
  y += 12;

  // ── Final disclaimer ──
  doc.roundedRect(MARGIN, y, USABLE_W, 40, 5).fill("#FFFBEB").lineWidth(0.7).strokeColor("#FDE047").stroke();
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(PALETTE.derived).text("ACCURACY & LIMITATIONS STATEMENT", MARGIN + 10, y + 7);
  doc.font("Helvetica").fontSize(7).fillColor(PALETTE.body).text(
    "This report is produced by the ResQ Decision Intelligence Platform (SIH Problem Statement 191). " +
    "All values are sourced from authoritative or official datasets as documented above. " +
    "Modelled or derived values are explicitly labeled. " +
    "Facility capacities are UNVERIFIED unless sourced from official DDMA field registers. " +
    "OSRM road routes represent the current OpenStreetMap road network and may not reflect live road closures or disaster damage. " +
    "This report reflects benchmark performance on the current validation set and should not be construed as independent validation against an external ground truth.",
    MARGIN + 10, y + 18, { width: USABLE_W - 20, lineGap: 1.5 }
  );
}

// ─── Main PDF Builder ─────────────────────────────────────────────────────────

export async function buildSelectedLocationPdf(context: IndiaLocationContext): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const { location } = context;
    const generatedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
    const TOTAL_PAGES = 7;

    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `ResQ Location Decision Context Report — ${location.displayName ?? location.name}`,
        Author: "ResQ Decision Intelligence Platform — SIH Problem Statement 191",
        Subject: "Hazard-Based Red Zone Identification, Carrying Capacity Assessment & Relocation Decision",
        Keywords: "disaster, relocation, hazard, GIS, India, decision support, SIH191",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    // ── Build all 7 pages ──
    buildPage1(doc, context, generatedAt);
    doc.addPage();
    buildPage2(doc, context, generatedAt);
    doc.addPage();
    buildPage3(doc, context, generatedAt);
    doc.addPage();
    buildPage4(doc, context, generatedAt);
    doc.addPage();
    buildPage5(doc, context, generatedAt);
    doc.addPage();
    buildPage6(doc, context, generatedAt);
    doc.addPage();
    buildPage7(doc, context, generatedAt);

    doc.end();
  });
}
