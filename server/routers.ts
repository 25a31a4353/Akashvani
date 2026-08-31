import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { buildAssessmentAnalysis, buildAssessmentPdf, buildSelectedLocationPdf, generateGroundedNarrative, getDemoArea, getDemoAreas, getDemoMapData, getRankedAssessments } from "./diva";
import { getPersistedReport, listAllHistoricalReports, listPersistedReports, persistAnalyticalSnapshot, persistNarrative, persistReport, persistSourceArtifact } from "./db";
import { storagePut } from "./storage";
import { compareHistoricalGeometry, deriveHistoricalPrediction, validateDatasetGeometry } from "./diva/historical";
import { createHistoricalCase, listHistoricalCases, listHistoricalDatasets, persistHistoricalDataset, persistHistoricalRun, persistHistoricalReport } from "./db";
import { buildHistoricalAnalysisPdf } from "./diva/historicalReport";
import { getEnvironmentalContext } from "./diva/environment";
import { getIndiaLocationContext, searchIndiaLocations } from "./diva/india";
import { getNationwideIndiaMap } from "./diva/nationwideMap";
import { mergePersistentPdfArchive } from "./diva/reportArchive";
import { andhraPradeshDefault } from "../shared/india";

const filtersSchema = z.object({
  hazards: z.array(z.string()).default([]),
  riskLevels: z.array(z.enum(["Critical", "High", "Moderate", "Low"])).default([]),
  priority: z.array(z.enum(["Immediate", "High", "Moderate", "Low"])).default([]),
  minimumPopulation: z.number().int().min(0).default(0),
  capacity: z.array(z.enum(["Adequate", "Constrained", "Insufficient"])).default([]),
});

const geometrySchema = z.object({ type: z.literal("FeatureCollection"), features: z.array(z.object({ type: z.literal("Feature"), properties: z.record(z.string(), z.unknown()).optional(), geometry: z.object({ type: z.string(), coordinates: z.unknown() }) })).max(5_000) });
const indiaLocationSchema = z.object({ id: z.string(), name: z.string(), displayName: z.string(), category: z.enum(["State", "District", "City", "Locality", "Place"]), latitude: z.number().min(5).max(37), longitude: z.number().min(68).max(98), population: z.number().int().nonnegative().nullable(), populationSource: z.string(), boundingBox: z.tuple([z.number(), z.number(), z.number(), z.number()]).nullable(), boundary: z.object({ type: z.literal("Feature"), properties: z.record(z.string(), z.unknown()), geometry: z.object({ type: z.string(), coordinates: z.unknown() }) }).nullable(), address: z.object({ state: z.string().optional(), district: z.string().optional(), city: z.string().optional(), locality: z.string().optional() }), source: z.string() });
const indiaContextSchema = z.object({ location: indiaLocationSchema, environment: z.object({ temperatureC: z.number().nullable(), precipitationMm: z.number().nullable(), usAqi: z.number().nullable(), pm25: z.number().nullable(), observedAt: z.string().nullable(), forecast: z.array(z.object({ date: z.string(), temperatureMinC: z.number().nullable(), temperatureMaxC: z.number().nullable(), precipitationProbability: z.number().nullable(), precipitationSumMm: z.number().nullable(), windSpeedMaxKph: z.number().nullable(), windGustMaxKph: z.number().nullable(), weatherCode: z.number().nullable() })), source: z.string(), status: z.string() }), infrastructure: z.object({ items: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), latitude: z.number(), longitude: z.number() })), source: z.string(), status: z.enum(["LIVE OSM FACILITY SAMPLE", "UNAVAILABLE"]), observedAt: z.string().nullable() }), screening: z.object({ riskScore: z.number().nullable(), riskLevel: z.enum(["Low", "Moderate", "High", "Unavailable"]), priority: z.enum(["Immediate", "High", "Moderate", "Low", "Unavailable"]), hazardContext: z.string(), populationContext: z.string(), status: z.string() }) });
const simulationSchema = z.object({ rainfallMultiplier: z.number().min(0.5).max(2.5), populationMultiplier: z.number().min(0.5).max(2.5), shelterMultiplier: z.number().min(0.1).max(2), routeBlocked: z.boolean(), temperatureDeltaC: z.number().min(-5).max(8) });

function detailFor(id: string) {
  const area = getDemoArea(id);
  if (!area) throw new Error("Assessment area was not found in the DIVA demonstration dataset.");
  return { area, analysis: buildAssessmentAnalysis(area) };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  diva: router({
    dashboard: publicProcedure.query(() => {
      const ranked = getRankedAssessments(getDemoAreas());
      const totals = ranked.reduce((acc, item) => {
        acc.habitations += 1;
        acc.population += item.area.population;
        acc[item.analysis.riskLevel] += 1;
        if (item.analysis.relocationPriority === "Immediate") acc.immediate += 1;
        return acc;
      }, { habitations: 0, population: 0, Critical: 0, High: 0, Moderate: 0, Low: 0, immediate: 0 });
      return { totals, ranked: ranked.slice(0, 8), dataStatus: "DEMO DATA" as const, source: "DIVA scenario dataset", updatedAt: "23 Aug 2026, 18:00 IST" };
    }),
    mapData: publicProcedure.query(() => getDemoMapData()),
    areas: publicProcedure.input(filtersSchema.optional()).query(({ input }) => {
      const filters = input ?? { hazards: [], riskLevels: [], priority: [], minimumPopulation: 0, capacity: [] };
      return getRankedAssessments(getDemoAreas()).filter(({ area, analysis }) =>
        (!filters.hazards.length || filters.hazards.includes(area.primaryHazard)) &&
        (!filters.riskLevels.length || filters.riskLevels.includes(analysis.riskLevel)) &&
        (!filters.priority.length || filters.priority.includes(analysis.relocationPriority)) &&
        area.population >= filters.minimumPopulation &&
        (!filters.capacity.length || filters.capacity.includes(analysis.capacityStatus))
      );
    }),
    search: publicProcedure.input(z.object({ query: z.string().trim().min(1).max(120) })).query(({ input }) => {
      const query = input.query.toLowerCase();
      return getDemoAreas().filter(area => [area.id, area.name, area.district, area.state].some(value => value.toLowerCase().includes(query))).slice(0, 8);
    }),
    assessment: publicProcedure.input(z.object({ id: z.string().min(1) })).query(({ input }) => detailFor(input.id)),
    environment: publicProcedure.input(z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })).query(({ input }) => getEnvironmentalContext(input.latitude, input.longitude)),
    india: router({
      defaultLocation: publicProcedure.query(() => andhraPradeshDefault),
      search: publicProcedure.input(z.object({ query: z.string().trim().min(2).max(120) })).query(({ input }) => searchIndiaLocations(input.query)),
      context: publicProcedure.input(indiaLocationSchema).query(({ input }) => getIndiaLocationContext(input)),
      nationwideMap: publicProcedure.query(() => getNationwideIndiaMap()),
    }),
    riskAnalyze: publicProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ input }) => {
      const { area, analysis } = detailFor(input.id);
      const persisted = await persistAnalyticalSnapshot({
        assessmentId: area.id,
        overallRisk: analysis.overallRisk,
        riskLevel: analysis.riskLevel,
        riskFactors: { values: analysis.riskFactors },
        methodologyVersion: analysis.methodologyVersion,
        carryingCapacityScore: analysis.carryingCapacityScore,
        capacityStatus: analysis.capacityStatus,
        capacityFactors: { values: analysis.capacityFactors },
        relocationScore: analysis.relocationScore,
        relocationPriority: analysis.relocationPriority,
        recommendedAction: analysis.recommendedAction,
        candidateSites: { values: analysis.candidateSites },
      });
      return { area, analysis, persisted };
    }),
    generateNarrative: publicProcedure.input(z.object({ id: z.string().min(1) })).mutation(async ({ input }) => {
      const { area, analysis } = detailFor(input.id);
      const narrative = await generateGroundedNarrative(area, analysis);
      const persisted = await persistNarrative({ id: narrative.id, assessmentId: narrative.assessmentId, model: narrative.model, label: narrative.label, grounding: narrative.grounding, content: { headline: narrative.headline, summary: narrative.summary, drivers: narrative.drivers, cautions: narrative.cautions }, reviewStatus: narrative.reviewStatus });
      return { narrative, persisted };
    }),
    generateReport: publicProcedure.input(z.object({ id: z.string().min(1), narrative: z.object({ id: z.string(), assessmentId: z.string(), label: z.literal("AI/ML DECISION-SUPPORT NARRATIVE"), headline: z.string(), summary: z.string(), drivers: z.array(z.string()), cautions: z.array(z.string()), model: z.string(), grounding: z.literal("SUPPLIED ANALYSIS RESULTS ONLY"), createdAt: z.string(), reviewStatus: z.enum(["Pending analyst review", "Reviewed"]) }).nullable().optional() })).mutation(async ({ input }) => {
      const { area, analysis } = detailFor(input.id);
      const pdf = await buildAssessmentPdf(area, analysis, input.narrative);
      const reportId = `RPT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const stored = await storagePut(`reports/${area.id}/${reportId}.pdf`, pdf, "application/pdf");
      const persisted = await persistReport({ id: reportId, assessmentId: area.id, title: `DIVA assessment — ${area.name}`, riskLevel: analysis.riskLevel, storageKey: stored.key, storageUrl: stored.url });
      return { id: reportId, url: stored.url, title: `DIVA assessment — ${area.name}`, riskLevel: analysis.riskLevel, persisted, createdAt: new Date().toISOString() };
    }),
    generateSelectedLocationReport: publicProcedure.input(indiaContextSchema).mutation(async ({ input }) => {
      const pdf = await buildSelectedLocationPdf(input);
      const reportId = `LOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const stored = await storagePut(`reports/selected-locations/${input.location.id}/${reportId}.pdf`, pdf, "application/pdf");
      const persisted = await persistReport({ id: reportId, assessmentId: input.location.id, title: `DIVA selected-location analysis — ${input.location.name}`, riskLevel: input.screening.riskLevel, storageKey: stored.key, storageUrl: stored.url });
      return { id: reportId, url: stored.url, title: `DIVA selected-location analysis — ${input.location.name}`, riskLevel: input.screening.riskLevel, persisted, createdAt: new Date().toISOString() };
    }),
    reports: publicProcedure.query(async () => {
      const [assessmentReports, historicalReportRecords] = await Promise.all([listPersistedReports(), listAllHistoricalReports()]);
      return mergePersistentPdfArchive(assessmentReports, historicalReportRecords);
    }),
    report: publicProcedure.input(z.object({ id: z.string().min(1) })).query(async ({ input }) => {
      const report = await getPersistedReport(input.id);
      if (!report) throw new Error("Report was not found or has not been persisted yet.");
      return report;
    }),
    uploadArtifact: publicProcedure.input(z.object({ fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), base64: z.string().min(1).max(12_000_000) })).mutation(async ({ input, ctx }) => {
      const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const buffer = Buffer.from(input.base64, "base64");
      const stored = await storagePut(`source-artifacts/${cleanName}`, buffer, input.mimeType);
      const artifactId = `SRC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const persisted = await persistSourceArtifact({ id: artifactId, fileName: input.fileName, mimeType: input.mimeType, storageKey: stored.key, storageUrl: stored.url, uploadedBy: ctx.user?.id });
      return { id: artifactId, url: stored.url, persisted };
    }),
    historical: router({
      cases: publicProcedure.query(() => listHistoricalCases()),
      createCase: publicProcedure.input(z.object({ name: z.string().min(3).max(255), location: z.string().min(2).max(255), hazardType: z.string().min(2).max(96), eventDate: z.string().min(8).max(32), description: z.string().max(2000).default("") })).mutation(async ({ input, ctx }) => {
        const id = `CASE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const persisted = await createHistoricalCase({ id, ...input, createdBy: ctx.user?.id });
        return { id, ...input, createdAt: new Date().toISOString(), persisted };
      }),
      datasets: publicProcedure.input(z.object({ caseStudyId: z.string().min(1) })).query(({ input }) => listHistoricalDatasets(input.caseStudyId)),
      uploadDataset: publicProcedure.input(z.object({ caseStudyId: z.string().min(1), fileName: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), base64: z.string().min(1).max(12_000_000), version: z.number().int().min(1), phase: z.enum(["PRE_EVENT", "GROUND_TRUTH"]), format: z.enum(["CSV", "XLSX", "GEOJSON", "SHP_ZIP", "GEOTIFF", "KML", "KMZ", "OTHER"]), sourceType: z.enum(["Government Dataset", "Satellite Dataset", "Research Dataset", "User Generated", "Simulation", "Other"]), sourceUrl: z.string().url().optional().or(z.literal("")), description: z.string().max(2000).optional(), license: z.string().max(512).optional(), dateAcquired: z.string().max(32).optional(), spatialCoverage: z.string().max(255).optional(), timeRange: z.string().max(255).optional(), schema: z.array(z.string()).max(500), mapping: z.record(z.string(), z.string().nullable()), geometry: geometrySchema.optional(), validation: z.object({ status: z.string(), featureCount: z.number(), geometryTypes: z.array(z.string()), crs: z.string(), validCoordinateRate: z.number().nullable(), missingCoordinates: z.number(), duplicateRecords: z.number(), emptyGeometries: z.number(), invalidGeometries: z.number(), warnings: z.array(z.string()), notes: z.array(z.string()) }) })).mutation(async ({ input }) => {
        const cleanName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const stored = await storagePut(`historical-datasets/${input.caseStudyId}/${cleanName}`, Buffer.from(input.base64, "base64"), input.mimeType);
        const id = `DS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const persisted = await persistHistoricalDataset({ id, caseStudyId: input.caseStudyId, fileName: input.fileName, version: input.version, phase: input.phase, format: input.format, sourceType: input.sourceType, sourceUrl: input.sourceUrl || undefined, description: input.description, license: input.license, dateAcquired: input.dateAcquired, storageKey: stored.key, storageUrl: stored.url, spatialCoverage: input.spatialCoverage, timeRange: input.timeRange, schema: { fields: input.schema }, mapping: input.mapping, validation: input.validation, geometry: input.geometry as unknown as Record<string, unknown> | undefined });
        return { id, storageUrl: stored.url, persisted };
      }),
      validate: publicProcedure.input(z.object({ data: geometrySchema, schema: z.array(z.string()).max(500), mapping: z.record(z.string(), z.string().nullable()) })).mutation(({ input }) => validateDatasetGeometry(input.data, input.schema, input.mapping)),
      replay: publicProcedure.input(z.object({ caseStudyId: z.string().min(1), preEvent: geometrySchema, parameters: simulationSchema })).mutation(async ({ input }) => {
        const run = deriveHistoricalPrediction(input.caseStudyId, input.preEvent, input.parameters);
        const persisted = await persistHistoricalRun({ id: run.id, caseStudyId: run.caseStudyId, parameters: run.parameters, prediction: run.prediction as unknown as Record<string, unknown> });
        return { ...run, persisted };
      }),
      compare: publicProcedure.input(z.object({ prediction: geometrySchema, observed: geometrySchema, predictedPopulation: z.number().int().nonnegative().optional(), actualPopulation: z.number().int().nonnegative().optional(), predictedInfrastructureAffected: z.number().int().nonnegative().optional(), actualInfrastructureAffected: z.number().int().nonnegative().optional(), correctlyDetectedInfrastructure: z.number().int().nonnegative().optional() })).mutation(({ input }) => compareHistoricalGeometry(input.prediction, input.observed, { predicted: input.predictedPopulation, actual: input.actualPopulation }, { predicted: input.predictedInfrastructureAffected, actual: input.actualInfrastructureAffected, correctlyDetected: input.correctlyDetectedInfrastructure })),
      generateReport: publicProcedure.input(z.object({ caseStudy: z.object({ id: z.string(), name: z.string(), location: z.string(), hazardType: z.string(), eventDate: z.string(), description: z.string(), createdAt: z.string() }), datasets: z.array(z.object({ id: z.string(), caseStudyId: z.string(), fileName: z.string(), version: z.number(), phase: z.enum(["PRE_EVENT", "GROUND_TRUTH"]), format: z.enum(["CSV", "XLSX", "GEOJSON", "SHP_ZIP", "GEOTIFF", "KML", "KMZ", "OTHER"]), sourceType: z.enum(["Government Dataset", "Satellite Dataset", "Research Dataset", "User Generated", "Simulation", "Other"]), storageUrl: z.string(), schema: z.array(z.string()), mapping: z.record(z.string(), z.string().nullable()), validation: z.object({ status: z.enum(["VALID", "WARNING", "INVALID"]), featureCount: z.number(), geometryTypes: z.array(z.string()), crs: z.string(), validCoordinateRate: z.number().nullable(), missingCoordinates: z.number(), duplicateRecords: z.number(), emptyGeometries: z.number(), invalidGeometries: z.number(), warnings: z.array(z.string()), notes: z.array(z.string()) }), createdAt: z.string(), sourceUrl: z.string().optional(), description: z.string().optional(), license: z.string().optional(), dateAcquired: z.string().optional(), spatialCoverage: z.string().optional(), timeRange: z.string().optional() })), run: z.object({ id: z.string(), caseStudyId: z.string(), generatedAt: z.string(), prediction: geometrySchema, methodology: z.string(), baseline: z.object({ risk: z.number(), populationExposure: z.number(), carryingCapacity: z.number(), relocationPriority: z.number() }), simulated: z.object({ risk: z.number(), populationExposure: z.number(), carryingCapacity: z.number(), relocationPriority: z.number() }), parameters: simulationSchema, dataStatus: z.literal("DATASET-DERIVED PREDICTION") }), metrics: z.object({ available: z.boolean(), predictedAreaKm2: z.number().optional(), actualAreaKm2: z.number().optional(), overlapAreaKm2: z.number().optional(), iou: z.number().optional(), precision: z.number().optional(), recall: z.number().optional(), f1: z.number().optional(), overlapPercent: z.number().optional(), falsePositiveAreaKm2: z.number().optional(), falseNegativeAreaKm2: z.number().optional(), predictedPopulation: z.number().optional(), actualPopulation: z.number().optional(), populationDifference: z.number().optional(), populationErrorPercent: z.number().optional(), predictedInfrastructureAffected: z.number().optional(), actualInfrastructureAffected: z.number().optional(), correctlyDetectedInfrastructure: z.number().optional(), infrastructureDetectionRate: z.number().optional(), limitations: z.array(z.string()) }).nullable() })).mutation(async ({ input }) => {
        const pdf = await buildHistoricalAnalysisPdf(input.caseStudy, input.datasets, input.run, input.metrics);
        const id = `HREP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        const stored = await storagePut(`historical-reports/${input.caseStudy.id}/${id}.pdf`, pdf, "application/pdf");
        const persisted = await persistHistoricalReport({ id, caseStudyId: input.caseStudy.id, title: `Historical validation — ${input.caseStudy.name}`, storageKey: stored.key, storageUrl: stored.url });
        return { id, url: stored.url, persisted };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
