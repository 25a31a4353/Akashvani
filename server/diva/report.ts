import { createRequire } from "node:module";
import type PDFDocumentClass from "pdfkit";
import type { AssessmentAnalysis, AssessmentArea, DecisionNarrative } from "../../shared/diva";

const require = createRequire(import.meta.url);
const PDFDocument: typeof PDFDocumentClass = require("pdfkit");

function colour(level: string) {
  return level === "Critical" || level === "Immediate" ? "#BD3034" : level === "High" ? "#E66E2D" : level === "Moderate" || level === "Constrained" ? "#B98318" : "#31825D";
}

function scoreBar(doc: PDFKit.PDFDocument, label: string, score: number, y: number) {
  doc.font("Helvetica").fontSize(8.5).fillColor("#405165").text(label, 54, y);
  doc.roundedRect(185, y + 1, 215, 8, 4).fill("#E8EDF1");
  doc.roundedRect(185, y + 1, Math.max(3, 215 * score / 100), 8, 4).fill(colour(score >= 85 ? "Critical" : score >= 70 ? "High" : score >= 50 ? "Moderate" : "Low"));
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#405165").text(`${score}/100`, 410, y - 1, { width: 55, align: "right" });
}

export async function buildAssessmentPdf(area: AssessmentArea, analysis: AssessmentAnalysis, narrative?: DecisionNarrative | null) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `DIVA assessment — ${area.name}`, Author: "DIVA analytical platform" } });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.rect(0, 0, 595, 118).fill("#102B45");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#8BD4E8").text("DIVA  /  DEMONSTRATION ASSESSMENT", 48, 34);
    doc.font("Helvetica-Bold").fontSize(24).fillColor("white").text("Disaster Vulnerability\nAssessment Report", 48, 52, { lineGap: 3 });
    doc.font("Helvetica").fontSize(9).fillColor("#C9DAE6").text(`Report ID: RPT-${area.id.replace("DIVA-", "")}  •  ${area.updatedAt}`, 48, 100);

    doc.fillColor("#173D5C").font("Helvetica-Bold").fontSize(17).text(area.name, 48, 146);
    doc.font("Helvetica").fontSize(9.5).fillColor("#5C6B78").text(`${area.district}, ${area.state}  •  ${area.latitude.toFixed(4)}, ${area.longitude.toFixed(4)}`, 48, 170);
    doc.roundedRect(396, 146, 151, 34, 8).fill(colour(analysis.riskLevel));
    doc.font("Helvetica-Bold").fontSize(10).fillColor("white").text(`${analysis.riskLevel.toUpperCase()} RISK`, 408, 158, { width: 126, align: "center" });

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#173D5C").text("Executive decision context", 48, 208);
    doc.font("Helvetica").fontSize(9.5).fillColor("#334A5D").text(`This report uses the DIVA demonstration analytical model. It combines supplied scenario attributes for hazard exposure, population vulnerability, environmental stress, access, and capacity. It is decision support only and requires analyst validation before operational use.`, 48, 228, { width: 490, lineGap: 4 });

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#173D5C").text("Risk and capacity summary", 48, 296);
    scoreBar(doc, "Overall risk", analysis.overallRisk, 320);
    scoreBar(doc, "Hazard exposure", analysis.hazardExposure, 342);
    scoreBar(doc, "Vulnerability", analysis.vulnerabilityScore, 364);
    scoreBar(doc, "Carrying capacity", analysis.carryingCapacityScore, 386);
    scoreBar(doc, "Relocation priority", analysis.relocationScore, 408);

    doc.roundedRect(48, 448, 490, 76, 9).fill("#F2F6F8");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#173D5C").text(`Recommended action: ${analysis.relocationPriority.toUpperCase()}`, 64, 464);
    doc.font("Helvetica").fontSize(9.2).fillColor("#334A5D").text(analysis.recommendedAction, 64, 483, { width: 456, lineGap: 3 });

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#173D5C").text("Drivers, capacity and relocation", 48, 54);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Major calculated risk drivers", 48, 92);
    let y = 116;
    analysis.riskFactors.forEach(factor => {
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#2B4355").text(factor.label, 48, y);
      doc.font("Helvetica").fontSize(8.8).fillColor("#5C6B78").text(`${factor.score}/100 — ${factor.interpretation}`, 195, y, { width: 343 });
      y += 28;
    });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Candidate site comparison", 48, y + 14);
    y += 40;
    analysis.candidateSites.forEach(site => {
      doc.roundedRect(48, y, 490, 54, 7).fill("#F2F6F8");
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#2B4355").text(site.name, 60, y + 10);
      doc.font("Helvetica").fontSize(8.5).fillColor("#5C6B78").text(`Available capacity ${site.availableCapacity.toLocaleString()} / ${site.capacity.toLocaleString()}  •  Service access ${site.serviceAccess}/100  •  Suitability ${site.suitability}/100`, 60, y + 27, { width: 410 });
      doc.roundedRect(478, y + 10, 45, 22, 11).fill(colour(site.score >= 80 ? "High" : "Moderate"));
      doc.font("Helvetica-Bold").fontSize(9).fillColor("white").text(`${site.score}`, 478, y + 17, { width: 45, align: "center" });
      y += 64;
    });

    if (narrative) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("AI/ML decision-support narrative", 48, y + 10);
      doc.font("Helvetica-Bold").fontSize(9.5).fillColor("#2B4355").text(narrative.headline, 48, y + 34, { width: 490 });
      doc.font("Helvetica").fontSize(8.8).fillColor("#5C6B78").text(narrative.summary, 48, y + 50, { width: 490, lineGap: 3 });
    }

    doc.addPage();
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#173D5C").text("Map context and methodology", 48, 54);
    doc.roundedRect(48, 90, 490, 270, 12).fill("#E9F2F4");
    doc.roundedRect(95, 130, 345, 166, 8).fill("#D5E7E9");
    doc.polygon([130, 168], [374, 143], [417, 225], [180, 261]).fillOpacity(0.44).fill("#E66E2D").fillOpacity(1);
    doc.circle(272, 210, 8).fill("#102B45");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#173D5C").text("Selected assessment area", 285, 204);
    doc.font("Helvetica").fontSize(8.5).fillColor("#5C6B78").text("Illustrative scenario map inset — not authoritative cartography", 65, 330);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Methodology notes", 48, 395);
    doc.font("Helvetica").fontSize(9.2).fillColor("#334A5D").text(`${analysis.methodologyVersion}. Scores are reproducible weighted indicators in the DIVA demonstration scenario and are not an official Ministry of Home Affairs formula. Demo data must be replaced and validated with authoritative sources before any real-world use.`, 48, 417, { width: 490, lineGap: 4 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Data provenance", 48, 493);
    doc.font("Helvetica").fontSize(9).fillColor("#334A5D").text(`Data status: DEMO DATA\nSource: DIVA scenario dataset\nScenario timestamp: ${area.updatedAt}\nReport generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`, 48, 515, { lineGap: 4 });

    const range = doc.bufferedPageRange();
    for (let page = 0; page < range.count; page++) {
      doc.switchToPage(page);
      doc.font("Helvetica").fontSize(7.5).fillColor("#7B8993").text(`DIVA • Demonstration decision-support report • Page ${page + 1} of ${range.count}`, 48, 800, { width: 490, align: "center" });
    }
    doc.end();
  });
}
