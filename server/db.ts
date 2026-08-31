import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { type InsertUser, users, generatedReports, sourceArtifacts, decisionNarratives, riskIndicators, capacityAnalyses, relocationRecommendations, historicalCaseStudies, historicalDatasets, historicalRuns, historicalReports } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => { if (user[field] !== undefined) { values[field] = user[field]; updateSet[field] = user[field]; } });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function persistReport(input: { id: string; assessmentId: string; title: string; riskLevel: string; storageKey: string; storageUrl: string }) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(generatedReports).values(input);
  return true;
}

export async function listPersistedReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generatedReports).orderBy(desc(generatedReports.createdAt)).limit(50);
}

export async function getPersistedReport(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(generatedReports).where(eq(generatedReports.id, id)).limit(1);
  return result[0];
}

export async function persistAnalyticalSnapshot(input: { assessmentId: string; overallRisk: number; riskLevel: string; riskFactors: Record<string, unknown>; methodologyVersion: string; carryingCapacityScore: number; capacityStatus: string; capacityFactors: Record<string, unknown>; relocationScore: number; relocationPriority: string; recommendedAction: string; candidateSites: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return false;
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  await db.insert(riskIndicators).values({ id: `RSK-${suffix}`, assessmentId: input.assessmentId, overallRisk: input.overallRisk, riskLevel: input.riskLevel, factors: input.riskFactors, methodologyVersion: input.methodologyVersion, dataStatus: "DEMO DATA" });
  await db.insert(capacityAnalyses).values({ id: `CAP-${suffix}`, assessmentId: input.assessmentId, score: input.carryingCapacityScore, status: input.capacityStatus, factors: input.capacityFactors });
  await db.insert(relocationRecommendations).values({ id: `REL-${suffix}`, assessmentId: input.assessmentId, score: input.relocationScore, priority: input.relocationPriority, recommendedAction: input.recommendedAction, candidateSites: input.candidateSites });
  return true;
}

export async function persistSourceArtifact(input: { id: string; fileName: string; mimeType: string; storageKey: string; storageUrl: string; uploadedBy?: number }) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(sourceArtifacts).values(input);
  return true;
}

export async function persistNarrative(input: { id: string; assessmentId: string; model: string; label: string; grounding: string; content: Record<string, unknown>; reviewStatus: string }) {
  const db = await getDb();
  if (!db) return false;
  await db.insert(decisionNarratives).values(input);
  return true;
}

export async function createHistoricalCase(input: { id: string; name: string; location: string; hazardType: string; eventDate: string; description: string; createdBy?: number }) { const db = await getDb(); if (!db) return false; await db.insert(historicalCaseStudies).values(input); return true; }
export async function listHistoricalCases() { const db = await getDb(); if (!db) return []; return db.select().from(historicalCaseStudies).orderBy(desc(historicalCaseStudies.createdAt)).limit(100); }
export async function persistHistoricalDataset(input: { id: string; caseStudyId: string; fileName: string; version: number; phase: string; format: string; sourceType: string; sourceUrl?: string; description?: string; license?: string; dateAcquired?: string; storageKey: string; storageUrl: string; spatialCoverage?: string; timeRange?: string; schema: Record<string, unknown>; mapping: Record<string, unknown>; validation: Record<string, unknown>; geometry?: Record<string, unknown> | null }) { const db = await getDb(); if (!db) return false; await db.insert(historicalDatasets).values(input); return true; }
export async function listHistoricalDatasets(caseStudyId: string) { const db = await getDb(); if (!db) return []; return db.select().from(historicalDatasets).where(eq(historicalDatasets.caseStudyId, caseStudyId)).orderBy(desc(historicalDatasets.createdAt)); }
export async function persistHistoricalRun(input: { id: string; caseStudyId: string; parameters: Record<string, unknown>; prediction: Record<string, unknown>; comparison?: Record<string, unknown> }) { const db = await getDb(); if (!db) return false; await db.insert(historicalRuns).values(input); return true; }
export async function persistHistoricalReport(input: { id: string; caseStudyId: string; title: string; storageKey: string; storageUrl: string }) { const db = await getDb(); if (!db) return false; await db.insert(historicalReports).values(input); return true; }
export async function listHistoricalReports(caseStudyId: string) { const db = await getDb(); if (!db) return []; return db.select().from(historicalReports).where(eq(historicalReports.caseStudyId, caseStudyId)).orderBy(desc(historicalReports.createdAt)); }
export async function listAllHistoricalReports() { const db = await getDb(); if (!db) return []; return db.select().from(historicalReports).orderBy(desc(historicalReports.createdAt)).limit(50); }
