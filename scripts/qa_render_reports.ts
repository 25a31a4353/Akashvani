import fs from "node:fs";
import path from "node:path";
import { andhraPradeshDefault } from "../shared/india.js";
import { buildMultiHazardProfile } from "../server/diva/hazards/engine.js";
import { computeCanonicalDecision } from "../server/diva/decision/pipeline.js";
import { buildSelectedLocationPdf, computeMapExtent, validateReportData } from "../server/diva/selectedLocationReport.js";

async function runQa() {
  console.log("=== ResQ V3.2 Visual QA & Report Integrity Generator ===");

  const outDir = path.resolve("./artifacts/reports");
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Critical Andhra Pradesh Regression
  console.log("\n[1] Evaluating Andhra Pradesh State-Level Selection (15.9129°N, 79.7400°E)...");
  const apLoc = {
    ...andhraPradeshDefault,
    id: "india-andhra-pradesh-qa",
  };

  const apHazard = buildMultiHazardProfile({
    locationName: apLoc.name,
    latitude: apLoc.latitude,
    longitude: apLoc.longitude,
    stateCode: "AP",
    district: "Andhra Pradesh Centroid",
  });

  const apDecision = await computeCanonicalDecision({
    location: apLoc,
    hazardProfile: apHazard,
    evidenceCoverage: {
      availableCount: 5,
      totalCount: 8,
      coverageRatio: 0.62,
      label: "5 / 8 evidence categories available",
      categories: [],
    },
  });

  const apContext = {
    location: apLoc,
    hazardProfile: apHazard,
    decision: apDecision,
    environment: {
      temperatureC: 32,
      precipitationMm: 0,
      usAqi: 65,
      pm25: 16,
      observedAt: new Date().toISOString(),
      source: "Open-Meteo NWP Forecast",
      status: "LIVE MODELLED ENVIRONMENTAL CONTEXT",
      forecast: [],
    },
    infrastructure: {
      items: [],
      source: "OpenStreetMap",
      status: "LIVE OSM FACILITY SAMPLE" as const,
      observedAt: new Date().toISOString(),
    },
    screening: {
      riskScore: 45,
      riskLevel: "Moderate" as const,
      priority: "Moderate" as const,
      hazardContext: "State-level screening context.",
      populationContext: "State-wide context; local population unresolved.",
      status: "STATE-LEVEL SCREENING CONTEXT",
    },
  };

  const apVal = validateReportData(apContext);
  console.log("Validation status:", apVal.valid ? "PASSED" : "FAILED", apVal.errors);

  const apExtent = computeMapExtent(apContext);
  console.log(`Map extent: [S:${apExtent.south.toFixed(4)}, N:${apExtent.north.toFixed(4)}, W:${apExtent.west.toFixed(4)}, E:${apExtent.east.toFixed(4)}]`);
  console.log(`Centroid inside extent: ${apLoc.latitude >= apExtent.south && apLoc.latitude <= apExtent.north && apLoc.longitude >= apExtent.west && apLoc.longitude <= apExtent.east}`);
  console.log(`Critical data missing: ${apDecision.responsePriority.criticalDataMissing}`);
  console.log(`Priority Level: ${apDecision.responsePriority.priorityLevel}`);
  console.log(`Road Route Status: ${apDecision.routingAssessment.status}`);

  const apPdf = await buildSelectedLocationPdf(apContext);
  const apPath = path.join(outDir, "Andhra_Pradesh_State_Report.pdf");
  fs.writeFileSync(apPath, apPdf);
  console.log(`Rendered AP PDF: ${apPath} (${(apPdf.length / 1024).toFixed(1)} KB)`);

  // 2. Wayanad Landslide Benchmark
  console.log("\n[2] Evaluating Wayanad District Benchmark (11.6854°N, 76.1320°E)...");
  const wayLoc = {
    id: "cal-kl-way",
    name: "Wayanad",
    displayName: "Wayanad, Kerala, India",
    category: "District" as const,
    latitude: 11.6854,
    longitude: 76.132,
    population: 817420,
    populationSource: "Census of India 2011",
    boundingBox: [11.45, 75.9, 11.95, 76.35] as [number, number, number, number],
    boundary: null,
    address: { state: "Kerala", district: "Wayanad" },
    source: "Census 2011 & Survey of India",
  };

  const wayHazard = buildMultiHazardProfile({
    locationName: "Wayanad",
    latitude: 11.6854,
    longitude: 76.132,
    stateCode: "KL",
    district: "Wayanad",
    slopeDegrees: 34,
    elevationMeters: 920,
  });

  const wayDecision = await computeCanonicalDecision({
    location: wayLoc,
    hazardProfile: wayHazard,
    evidenceCoverage: {
      availableCount: 7,
      totalCount: 8,
      coverageRatio: 0.88,
      label: "7 / 8 evidence categories available",
      categories: [],
    },
  });

  const wayContext = {
    location: wayLoc,
    hazardProfile: wayHazard,
    decision: wayDecision,
    environment: {
      temperatureC: 22,
      precipitationMm: 120,
      usAqi: 28,
      pm25: 6,
      observedAt: new Date().toISOString(),
      source: "Open-Meteo NWP Forecast",
      status: "LIVE MODELLED ENVIRONMENTAL CONTEXT",
      forecast: [],
    },
    infrastructure: {
      items: [],
      source: "OpenStreetMap",
      status: "LIVE OSM FACILITY SAMPLE" as const,
      observedAt: new Date().toISOString(),
    },
    screening: {
      riskScore: 88,
      riskLevel: "High" as const,
      priority: "Immediate" as const,
      hazardContext: "Severe landslide hazard warning.",
      populationContext: "817,420 inhabitants.",
      status: "DISTRICT-LEVEL CONTEXT",
    },
  };

  const wayPdf = await buildSelectedLocationPdf(wayContext);
  const wayPath = path.join(outDir, "Wayanad_District_Report.pdf");
  fs.writeFileSync(wayPath, wayPdf);
  console.log(`Rendered Wayanad PDF: ${wayPath} (${(wayPdf.length / 1024).toFixed(1)} KB)`);

  console.log("\nAll QA test reports generated successfully without errors!");
}

runQa().catch((err) => {
  console.error("QA error:", err);
  process.exit(1);
});
