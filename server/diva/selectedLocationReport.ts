import { createRequire } from "node:module";
import type PDFDocumentClass from "pdfkit";
import type { IndiaBoundary, IndiaLocationContext } from "../../shared/india";

const require = createRequire(import.meta.url);
const PDFDocument: typeof PDFDocumentClass = require("pdfkit");

type PdfDocument = PDFKit.PDFDocument;
type Point = [number, number];

export const SELECTED_LOCATION_RISK_COLORS = {
  High: "#BD3034",
  Moderate: "#E66E2D",
  Low: "#D3A52D",
  Safe: "#31825D",
} as const;

function riskColour(level: IndiaLocationContext["screening"]["riskLevel"]) {
  return level === "High" ? SELECTED_LOCATION_RISK_COLORS.High : level === "Moderate" ? SELECTED_LOCATION_RISK_COLORS.Moderate : level === "Low" ? SELECTED_LOCATION_RISK_COLORS.Safe : "#71828C";
}

function isPoint(value: unknown): value is Point {
  return Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number";
}

function asRing(value: unknown): Point[] | null {
  return Array.isArray(value) && value.length >= 3 && value.every(isPoint) ? value : null;
}

export function extractBoundaryRings(boundary: IndiaBoundary): Point[][] {
  if (!boundary) return [];
  const geometry = boundary.geometry;
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) return geometry.coordinates.map(asRing).filter((ring): ring is Point[] => Boolean(ring));
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) return geometry.coordinates.flatMap(polygon => Array.isArray(polygon) ? polygon.map(asRing).filter((ring): ring is Point[] => Boolean(ring)) : []);
  return [];
}

function metric(doc: PdfDocument, label: string, value: string, x: number, y: number, accent = "#173D5C") {
  doc.roundedRect(x, y, 112, 54, 8).fill("#F1F6F7");
  doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#6C838D").text(label.toUpperCase(), x + 9, y + 9, { width: 94 });
  doc.font("Helvetica-Bold").fontSize(15).fillColor(accent).text(value, x + 9, y + 23, { width: 94 });
}

function sectionTitle(doc: PdfDocument, title: string, y: number) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor("#173D5C").text(title, 48, y);
}

function safeText(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Unavailable" : String(value);
}

function renderExtentMap(doc: PdfDocument, context: IndiaLocationContext, x: number, y: number, width: number, height: number) {
  const boundaryRings = extractBoundaryRings(context.location.boundary);
  const fallbackBounds = context.location.boundingBox;
  const sourcePoints = boundaryRings.flat();
  const points: Point[] = sourcePoints.length ? sourcePoints : fallbackBounds ? [[fallbackBounds[1], fallbackBounds[0]], [fallbackBounds[3], fallbackBounds[0]], [fallbackBounds[3], fallbackBounds[2]], [fallbackBounds[1], fallbackBounds[2]]] : [[context.location.longitude - 0.12, context.location.latitude - 0.08], [context.location.longitude + 0.12, context.location.latitude - 0.08], [context.location.longitude + 0.12, context.location.latitude + 0.08], [context.location.longitude - 0.12, context.location.latitude + 0.08]];
  const minLon = Math.min(...points.map(point => point[0]));
  const maxLon = Math.max(...points.map(point => point[0]));
  const minLat = Math.min(...points.map(point => point[1]));
  const maxLat = Math.max(...points.map(point => point[1]));
  const lonPad = Math.max((maxLon - minLon) * 0.12, 0.02);
  const latPad = Math.max((maxLat - minLat) * 0.12, 0.02);
  const west = minLon - lonPad;
  const east = maxLon + lonPad;
  const south = minLat - latPad;
  const north = maxLat + latPad;
  const project = (point: Point): Point => [x + ((point[0] - west) / Math.max(east - west, 0.0001)) * width, y + height - ((point[1] - south) / Math.max(north - south, 0.0001)) * height];
  const fill = riskColour(context.screening.riskLevel);

  doc.roundedRect(x, y, width, height, 10).fill("#EFF5F6");
  doc.save();
  for (let index = 1; index < 6; index++) {
    const gridX = x + (width / 6) * index;
    const gridY = y + (height / 6) * index;
    doc.moveTo(gridX, y + 12).lineTo(gridX, y + height - 12).strokeColor("#D5E3E5").lineWidth(0.45).stroke();
    doc.moveTo(x + 12, gridY).lineTo(x + width - 12, gridY).strokeColor("#D5E3E5").lineWidth(0.45).stroke();
  }
  boundaryRings.forEach(ring => {
    const projected = ring.map(project);
    if (projected.length < 3) return;
    doc.moveTo(projected[0][0], projected[0][1]);
    projected.slice(1).forEach(point => doc.lineTo(point[0], point[1]));
    doc.closePath().fillOpacity(0.62).fill(fill).fillOpacity(1).lineWidth(1.5).strokeColor(fill).stroke();
  });
  if (!boundaryRings.length) {
    const projectedFallback = points.map(project);
    doc.moveTo(projectedFallback[0][0], projectedFallback[0][1]);
    projectedFallback.slice(1).forEach(point => doc.lineTo(point[0], point[1]));
    doc.closePath().fillOpacity(0.24).fill(fill).fillOpacity(1).lineWidth(1.2).dash(4, { space: 3 }).strokeColor(fill).stroke().undash();
  }
  const selected = project([context.location.longitude, context.location.latitude]);
  doc.circle(selected[0], selected[1], 5).fill("#102B45").lineWidth(1.7).strokeColor("white").stroke();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#31576A").text(`${context.location.name} extent`, x + 12, y + 12, { width: width - 62 });
  doc.font("Helvetica").fontSize(7).fillColor("#718791").text(boundaryRings.length ? "Boundary returned by the selected-location source" : "Extent fallback: boundary unavailable; point and bounding context shown", x + 12, y + height - 18, { width: width - 24 });
  doc.font("Helvetica-Bold").fontSize(7).fillColor("#31576A").text("N", x + width - 24, y + 12);
  doc.moveTo(x + width - 21, y + 30).lineTo(x + width - 21, y + 18).strokeColor("#31576A").lineWidth(1).stroke();
}

function renderRiskLegend(doc: PdfDocument, x: number, y: number) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#31576A").text("ANALYTICAL RISK COLOUR KEY", x, y);
  const items: Array<[string, string]> = [["High", SELECTED_LOCATION_RISK_COLORS.High], ["Moderate", SELECTED_LOCATION_RISK_COLORS.Moderate], ["Low", SELECTED_LOCATION_RISK_COLORS.Low], ["Safe / lower", SELECTED_LOCATION_RISK_COLORS.Safe]];
  items.forEach(([label, color], index) => {
    const itemX = x + index * 112;
    doc.roundedRect(itemX, y + 15, 9, 9, 2).fill(color);
    doc.font("Helvetica").fontSize(7.3).fillColor("#5C7480").text(label, itemX + 14, y + 16, { width: 94 });
  });
}

export async function buildSelectedLocationPdf(context: IndiaLocationContext) {
  return new Promise<Buffer>((resolve, reject) => {
    const { location, environment, infrastructure, screening } = context;
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `DIVA selected-location analysis — ${location.name}`, Author: "DIVA analytical platform" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, 595, 118).fill("#102B45");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#9EDBE5").text("DIVA / SELECTED-LOCATION ANALYSIS", 48, 34);
    doc.font("Helvetica-Bold").fontSize(23).fillColor("white").text("Location Decision\nContext Report", 48, 52, { lineGap: 3 });
    doc.font("Helvetica").fontSize(8.5).fillColor("#C9DAE6").text(`Generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST · ${location.source}`, 48, 100, { width: 490 });

    doc.font("Helvetica-Bold").fontSize(17).fillColor("#163C58").text(location.name, 48, 146);
    const hierarchy = [location.category, location.address.locality, location.address.city, location.address.district, location.address.state].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ") || "India";
    doc.font("Helvetica").fontSize(9.5).fillColor("#5C6B78").text(`${hierarchy} · ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`, 48, 170, { width: 330 });
    doc.roundedRect(396, 146, 151, 34, 8).fill(riskColour(screening.riskLevel));
    doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text(`${screening.riskLevel.toUpperCase()} SCREENING`, 406, 158, { width: 131, align: "center" });

    sectionTitle(doc, "Location Decision Context", 210);
    doc.font("Helvetica").fontSize(9.3).fillColor("#334A5D").text(`This report brings together the selected ${location.category.toLowerCase()} context, population, modelled environmental conditions, nearby mapped facilities, the selected geographic extent, and the DIVA screening signal. It is decision support only and requires analyst review before operational use.`, 48, 230, { width: 490, lineGap: 4 });

    metric(doc, "Population", safeText(location.population?.toLocaleString("en-IN")), 48, 302);
    metric(doc, "Risk score", screening.riskScore === null ? "—" : `${screening.riskScore}/100`, 170, 302, riskColour(screening.riskLevel));
    metric(doc, "Priority", screening.priority, 292, 302, riskColour(screening.riskLevel));
    metric(doc, "Mapped facilities", infrastructure.items.length ? String(infrastructure.items.length) : "—", 414, 302);

    sectionTitle(doc, "AI/ML decision-support analysis", 390);
    doc.roundedRect(48, 412, 490, 94, 9).fill("#F2F6F8");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#173D5C").text(`${location.name}: ${screening.riskLevel} analytical screening context`, 64, 428, { width: 456 });
    doc.font("Helvetica").fontSize(9).fillColor("#334A5D").text(`${screening.hazardContext} ${screening.populationContext}`, 64, 448, { width: 456, lineGap: 4 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#5B7380").text(`Priority: ${screening.priority} · Screening status: ${screening.status}`, 64, 486, { width: 456 });

    sectionTitle(doc, "Current decision signal", 548);
    doc.font("Helvetica").fontSize(9.2).fillColor("#334A5D").text(`Current weather: ${safeText(environment.temperatureC)}°C · precipitation: ${safeText(environment.precipitationMm)} mm · air quality: ${environment.usAqi === null ? "Unavailable" : `AQI ${environment.usAqi}`} · ${environment.status}.`, 48, 568, { width: 490, lineGap: 3 });
    doc.font("Helvetica").fontSize(8.5).fillColor("#667D87").text(`Population source: ${location.populationSource}\nEnvironmental source: ${environment.source}\nFacilities source: ${infrastructure.source}`, 48, 602, { width: 490, lineGap: 3 });

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#173D5C").text("Selected area map and Details Forecast", 48, 54);
    doc.font("Helvetica").fontSize(8.8).fillColor("#5C7480").text("The map shows the selected district, village, city, locality, or other returned extent using the active screening colour. The four-colour key is a scale for interpretation; it does not invent sub-area measurements where the source did not provide them.", 48, 78, { width: 490, lineGap: 3 });
    renderExtentMap(doc, context, 48, 112, 490, 270);
    renderRiskLegend(doc, 48, 398);

    sectionTitle(doc, "Details Forecast", 444);
    if (environment.forecast.length) {
      doc.roundedRect(48, 464, 490, 26, 5).fill("#EAF2F4");
      doc.font("Helvetica-Bold").fontSize(7.4).fillColor("#6B818B").text("DATE", 60, 473);
      doc.font("Helvetica-Bold").fontSize(7.4).fillColor("#6B818B").text("TEMPERATURE", 145, 473);
      doc.font("Helvetica-Bold").fontSize(7.4).fillColor("#6B818B").text("RAIN", 275, 473);
      doc.font("Helvetica-Bold").fontSize(7.4).fillColor("#6B818B").text("WIND / GUST", 370, 473);
      environment.forecast.slice(0, 5).forEach((day, index) => {
        const rowY = 497 + index * 34;
        if (index % 2 === 0) doc.roundedRect(48, rowY - 5, 490, 30, 4).fill("#F6F9FA");
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#31576A").text(new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), 60, rowY + 3);
        doc.font("Helvetica").fontSize(8).fillColor("#516B77").text(`${safeText(day.temperatureMinC)}–${safeText(day.temperatureMaxC)}°C`, 145, rowY + 3);
        doc.font("Helvetica").fontSize(8).fillColor("#516B77").text(`${safeText(day.precipitationProbability)}% · ${safeText(day.precipitationSumMm)} mm`, 275, rowY + 3);
        doc.font("Helvetica").fontSize(8).fillColor("#516B77").text(`${safeText(day.windSpeedMaxKph)} / ${safeText(day.windGustMaxKph)} km/h`, 370, rowY + 3);
      });
    } else {
      doc.roundedRect(48, 464, 490, 66, 8).fill("#FFF6E7");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#8B641B").text("Forecast values unavailable", 62, 482);
      doc.font("Helvetica").fontSize(8.4).fillColor("#7C6A46").text("No forecast rows were returned for this selected location at report time. This report does not estimate missing values.", 62, 500, { width: 458 });
    }
    doc.font("Helvetica").fontSize(8).fillColor("#667D87").text(`Forecast source: ${environment.source} · Updated: ${environment.observedAt ? new Date(environment.observedAt).toLocaleString("en-IN") : "Unavailable"}`, 48, 680, { width: 490 });

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#173D5C").text("Infrastructure, interpretation, and review notes", 48, 54);
    sectionTitle(doc, "Nearby mapped facilities", 92);
    let facilityY = 116;
    if (infrastructure.items.length) {
      infrastructure.items.slice(0, 10).forEach((item, index) => {
        doc.roundedRect(48, facilityY, 490, 32, 5).fill(index % 2 === 0 ? "#F2F6F8" : "#FAFCFC");
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#2B4355").text(item.name, 60, facilityY + 8, { width: 250 });
        doc.font("Helvetica").fontSize(7.8).fillColor("#607883").text(`${item.type} · ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`, 320, facilityY + 9, { width: 205, align: "right" });
        facilityY += 38;
      });
    } else {
      doc.roundedRect(48, facilityY, 490, 58, 7).fill("#F7F9FA");
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#536D78").text("No nearby facilities returned", 62, facilityY + 14);
      doc.font("Helvetica").fontSize(8.2).fillColor("#738791").text(infrastructure.source, 62, facilityY + 32, { width: 458 });
      facilityY += 76;
    }
    sectionTitle(doc, "Interpretation and limitations", facilityY + 18);
    doc.font("Helvetica").fontSize(9).fillColor("#334A5D").text(`${screening.hazardContext}\n\n${screening.populationContext}\n\nThe coloured map identifies the selected returned extent and uses the current screening level as its area fill. It should not be read as a parcel-level or village-level hazard map. Boundary, weather, population, and facility values remain dependent on the source availability recorded above.`, 48, facilityY + 42, { width: 490, lineGap: 4 });
    sectionTitle(doc, "Analyst review checklist", 590);
    doc.font("Helvetica").fontSize(8.8).fillColor("#425D6B").text("• Confirm the selected boundary and administrative level.\n• Confirm source dates, population coverage, and forecast freshness.\n• Review the screening signal against authoritative hazard, infrastructure, and field information.\n• Do not treat this demonstration report as an official warning or operational directive.", 48, 612, { width: 490, lineGap: 4 });
    doc.font("Helvetica").fontSize(8).fillColor("#6E858E").text(`Report source: ${location.source}\nGenerated by DIVA analytical platform · selected location ID: ${location.id}`, 48, 716, { width: 490, lineGap: 3 });

    const pages = doc.bufferedPageRange();
    for (let page = 0; page < pages.count; page++) {
      doc.switchToPage(page);
      doc.font("Helvetica").fontSize(7.2).fillColor("#7A8993").text(`DIVA · Selected-location decision-support report · Page ${page + 1} of ${pages.count}`, 48, 800, { width: 490, align: "center" });
    }
    doc.end();
  });
}
