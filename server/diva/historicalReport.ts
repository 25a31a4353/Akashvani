import { createRequire } from "node:module";
import type PDFDocumentClass from "pdfkit";
import type { HistoricalCaseStudy, HistoricalDataset, HistoricalReplayResult, ValidationMetrics } from "../../shared/historical";

const require = createRequire(import.meta.url);
const PDFDocument: typeof PDFDocumentClass = require("pdfkit");

function metric(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number) {
  doc.roundedRect(x, y, 112, 46, 7).fill("#F1F6F7");
  doc.font("Helvetica-Bold").fontSize(7.4).fillColor("#6C838D").text(label.toUpperCase(), x + 9, y + 8, { width: 94 });
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#183F59").text(value, x + 9, y + 21, { width: 94 });
}

function mapInset(doc: PDFKit.PDFDocument, x: number, y: number, title: string, variant: "predicted" | "observed") {
  doc.roundedRect(x, y, 230, 150, 10).fill("#EAF2F3");
  for (let line = 0; line < 5; line++) doc.moveTo(x + 12, y + 20 + line * 26).lineTo(x + 218, y + 20 + line * 26).strokeColor("#C7DDDF").lineWidth(.5).stroke();
  doc.save();
  if (variant === "predicted") { doc.polygon([x + 35, y + 58], [x + 126, y + 34], [x + 190, y + 92], [x + 142, y + 125], [x + 55, y + 112]).fillOpacity(.42).fill("#E66E2D").fillOpacity(1).lineWidth(1.3).strokeColor("#C65A26").stroke(); }
  else { doc.polygon([x + 47, y + 62], [x + 139, y + 43], [x + 198, y + 96], [x + 132, y + 124], [x + 64, y + 112]).fillOpacity(.18).fill("#BD3034").fillOpacity(1).lineWidth(2).dash(4, { space: 3 }).strokeColor("#A72B37").stroke().undash(); }
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#31576A").text(title, x + 10, y + 12);
  doc.font("Helvetica").fontSize(7).fillColor("#718791").text(variant === "predicted" ? "Filled polygon: dataset-derived prediction" : "Outlined pattern: uploaded ground truth", x + 10, y + 134, { width: 210 });
}

export async function buildHistoricalAnalysisPdf(caseStudy: HistoricalCaseStudy, datasets: HistoricalDataset[], run: HistoricalReplayResult, metrics: ValidationMetrics | null) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []; const doc = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `DIVA Historical Validation — ${caseStudy.name}`, Author: "DIVA analytical platform" } });
    doc.on("data", (chunk: Buffer) => chunks.push(chunk)); doc.on("error", reject); doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.rect(0, 0, 595, 118).fill("#102B45"); doc.font("Helvetica-Bold").fontSize(10).fillColor("#9EDBE5").text("DIVA / HISTORICAL DISASTER REPLAY", 48, 34); doc.font("Helvetica-Bold").fontSize(23).fillColor("white").text("Historical Validation\nAnalysis Report", 48, 52, { lineGap: 3 }); doc.font("Helvetica").fontSize(8.5).fillColor("#C9DAE6").text(`Run ${run.id} • generated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`, 48, 100);
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#163C58").text(caseStudy.name, 48, 148); doc.font("Helvetica").fontSize(9.3).fillColor("#5F7480").text(`${caseStudy.location} • ${caseStudy.hazardType} • Event date: ${caseStudy.eventDate}`, 48, 171); doc.font("Helvetica").fontSize(9.1).fillColor("#3C5665").text(caseStudy.description || "Historical disaster validation case study.", 48, 194, { width: 486, lineGap: 3 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Validation separation and method", 48, 246); doc.font("Helvetica").fontSize(8.8).fillColor("#425D6B").text("The model prediction in this report is generated only from the supplied pre-event inputs and stated what-if parameters. Post-event datasets are retained as ground truth and are used only after prediction generation for comparison. A prediction is not presented as a historical observation.", 48, 265, { width: 488, lineGap: 3 });
    metric(doc, "Baseline risk", `${run.baseline.risk}/100`, 48, 327); metric(doc, "Simulated risk", `${run.simulated.risk}/100`, 170, 327); metric(doc, "Predicted exposure", run.simulated.populationExposure.toLocaleString(), 292, 327); metric(doc, "Predicted zones", String(run.prediction.features.length), 414, 327);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Pre-event and ground-truth datasets", 48, 404); let y = 425; datasets.forEach(dataset => { doc.roundedRect(48, y, 490, 33, 5).fill(dataset.phase === "GROUND_TRUTH" ? "#FFF5F3" : "#F2F7F8"); doc.font("Helvetica-Bold").fontSize(8.4).fillColor("#2F5467").text(`${dataset.phase === "GROUND_TRUTH" ? "OBSERVED / GROUND TRUTH" : "PRE-EVENT / PREDICTION INPUT"} — ${dataset.fileName}`, 59, y + 8); doc.font("Helvetica").fontSize(7.4).fillColor("#68808A").text(`${dataset.format} • ${dataset.sourceType} • validation ${dataset.validation.status} • v${dataset.version}`, 59, y + 20); y += 39; });
    doc.addPage(); doc.font("Helvetica-Bold").fontSize(15).fillColor("#173D5C").text("Prediction versus observed ground truth", 48, 54); mapInset(doc, 48, 88, "MODEL PREDICTION", "predicted"); mapInset(doc, 307, 88, "ACTUAL POST-EVENT DATA", "observed");
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Quantitative geographic comparison", 48, 264);
    if (metrics?.available) { metric(doc, "IoU", `${metrics.iou}%`, 48, 284); metric(doc, "Precision", `${metrics.precision}%`, 170, 284); metric(doc, "Recall", `${metrics.recall}%`, 292, 284); metric(doc, "F1 score", `${metrics.f1}%`, 414, 284); metric(doc, "Predicted area", `${metrics.predictedAreaKm2} km²`, 48, 340); metric(doc, "Actual area", `${metrics.actualAreaKm2} km²`, 170, 340); metric(doc, "False positive", `${metrics.falsePositiveAreaKm2} km²`, 292, 340); metric(doc, "False negative", `${metrics.falseNegativeAreaKm2} km²`, 414, 340); const optionalEvidence = [`Population variance: ${metrics.populationDifference !== undefined ? `${metrics.populationDifference.toLocaleString()} people (${metrics.populationErrorPercent ?? "—"}% absolute error)` : "not available from uploaded attributes"}`, `Infrastructure detection: ${metrics.infrastructureDetectionRate !== undefined ? `${metrics.correctlyDetectedInfrastructure}/${metrics.actualInfrastructureAffected} matched source identifiers (${metrics.infrastructureDetectionRate}%)` : "not available from uploaded identifiers"}`]; doc.font("Helvetica").fontSize(8).fillColor("#496471").text(optionalEvidence.join("\n"), 48, 398, { width: 488, lineGap: 3 }); }
    else { doc.roundedRect(48, 284, 490, 82, 8).fill("#FFF6E7"); doc.font("Helvetica-Bold").fontSize(10).fillColor("#8B641B").text("No spatial accuracy metrics calculated", 62, 302); doc.font("Helvetica").fontSize(8.8).fillColor("#7C6A46").text("IoU, precision, recall, F1, false positives, and false negatives remain unavailable until polygon or multipolygon evidence is supplied for both prediction and observed ground truth.", 62, 321, { width: 458, lineGap: 3 }); }
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#173D5C").text("Data quality, limitations, and provenance", 48, 424); doc.font("Helvetica").fontSize(8.6).fillColor("#425D6B").text([`Run methodology: ${run.methodology}`, ...(metrics?.limitations ?? []), "Source declarations, licensing, acquisition dates, and storage references are retained per uploaded dataset in the Dataset Lab."].join("\n\n"), 48, 445, { width: 490, lineGap: 3 });
    const pages = doc.bufferedPageRange(); for (let page = 0; page < pages.count; page++) { doc.switchToPage(page); doc.font("Helvetica").fontSize(7.2).fillColor("#7A8993").text(`DIVA • Historical validation decision-support report • Page ${page + 1} of ${pages.count}`, 48, 800, { width: 490, align: "center" }); }
    doc.end();
  });
}
