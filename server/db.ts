import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  type InsertUser,
  type User,
  users,
  generatedReports,
  sourceArtifacts,
  decisionNarratives,
  riskIndicators,
  capacityAnalyses,
  relocationRecommendations,
  historicalCaseStudies,
  historicalDatasets,
  historicalRuns,
  historicalReports,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// In-memory development store when DATABASE_URL is not configured
const memoryStore = {
  users: new Map<string, User>(),
  reports: [] as Array<typeof generatedReports.$inferSelect>,
  sourceArtifacts: [] as Array<typeof sourceArtifacts.$inferSelect>,
  decisionNarratives: [] as Array<typeof decisionNarratives.$inferSelect>,
  historicalCases: [] as Array<typeof historicalCaseStudies.$inferSelect>,
  historicalDatasets: [] as Array<typeof historicalDatasets.$inferSelect>,
  historicalRuns: [] as Array<typeof historicalRuns.$inferSelect>,
  historicalReports: [] as Array<typeof historicalReports.$inferSelect>,
};

let memoryUserIdCounter = 1;

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (db) {
    const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
    const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
    (["name", "email", "loginMethod"] as const).forEach(field => {
      if (user[field] !== undefined) {
        values[field] = user[field];
        updateSet[field] = user[field];
      }
    });
    values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
    updateSet.role = values.role;
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
    return;
  }

  const existing = memoryStore.users.get(user.openId);
  const now = new Date();
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  const record: User = {
    id: existing ? existing.id : memoryUserIdCounter++,
    openId: user.openId,
    name: user.name ?? existing?.name ?? null,
    email: user.email ?? existing?.email ?? null,
    loginMethod: user.loginMethod ?? existing?.loginMethod ?? null,
    role,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn ?? now,
  };
  memoryStore.users.set(user.openId, record);
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  }
  return memoryStore.users.get(openId);
}

export async function persistReport(input: {
  id: string;
  assessmentId: string;
  title: string;
  riskLevel: string;
  storageKey: string;
  storageUrl: string;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(generatedReports).values(input);
    return true;
  }
  memoryStore.reports.unshift({
    ...input,
    createdAt: new Date(),
  });
  return true;
}

export async function listPersistedReports(): Promise<Array<typeof generatedReports.$inferSelect>> {
  const db = await getDb();
  if (db) {
    return db.select().from(generatedReports).orderBy(desc(generatedReports.createdAt)).limit(50);
  }
  return [...memoryStore.reports].slice(0, 50);
}

export async function getPersistedReport(id: string): Promise<typeof generatedReports.$inferSelect | undefined> {
  const db = await getDb();
  if (db) {
    const result = await db.select().from(generatedReports).where(eq(generatedReports.id, id)).limit(1);
    return result[0];
  }
  return memoryStore.reports.find(report => report.id === id);
}

export async function persistAnalyticalSnapshot(input: {
  assessmentId: string;
  overallRisk: number;
  riskLevel: string;
  riskFactors: Record<string, unknown>;
  methodologyVersion: string;
  carryingCapacityScore: number;
  capacityStatus: string;
  capacityFactors: Record<string, unknown>;
  relocationScore: number;
  relocationPriority: string;
  recommendedAction: string;
  candidateSites: Record<string, unknown>;
}): Promise<boolean> {
  const db = await getDb();
  const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
  if (db) {
    await db.insert(riskIndicators).values({
      id: `RSK-${suffix}`,
      assessmentId: input.assessmentId,
      overallRisk: input.overallRisk,
      riskLevel: input.riskLevel,
      factors: input.riskFactors,
      methodologyVersion: input.methodologyVersion,
      dataStatus: "DEMO DATA",
    });
    await db.insert(capacityAnalyses).values({
      id: `CAP-${suffix}`,
      assessmentId: input.assessmentId,
      score: input.carryingCapacityScore,
      status: input.capacityStatus,
      factors: input.capacityFactors,
    });
    await db.insert(relocationRecommendations).values({
      id: `REL-${suffix}`,
      assessmentId: input.assessmentId,
      score: input.relocationScore,
      priority: input.relocationPriority,
      recommendedAction: input.recommendedAction,
      candidateSites: input.candidateSites,
    });
    return true;
  }
  return true;
}

export async function persistSourceArtifact(input: {
  id: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  storageUrl: string;
  uploadedBy?: number;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(sourceArtifacts).values(input);
    return true;
  }
  memoryStore.sourceArtifacts.unshift({
    id: input.id,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    uploadedBy: input.uploadedBy ?? null,
    createdAt: new Date(),
  });
  return true;
}

export async function persistNarrative(input: {
  id: string;
  assessmentId: string;
  model: string;
  label: string;
  grounding: string;
  content: Record<string, unknown>;
  reviewStatus: string;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(decisionNarratives).values(input);
    return true;
  }
  memoryStore.decisionNarratives.unshift({
    ...input,
    createdAt: new Date(),
  });
  return true;
}

export async function createHistoricalCase(input: {
  id: string;
  name: string;
  location: string;
  hazardType: string;
  eventDate: string;
  description: string;
  createdBy?: number;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(historicalCaseStudies).values(input);
    return true;
  }
  memoryStore.historicalCases.unshift({
    id: input.id,
    name: input.name,
    location: input.location,
    hazardType: input.hazardType,
    eventDate: input.eventDate,
    description: input.description,
    createdBy: input.createdBy ?? null,
    createdAt: new Date(),
  });
  return true;
}

export async function listHistoricalCases(): Promise<Array<typeof historicalCaseStudies.$inferSelect>> {
  const db = await getDb();
  if (db) {
    return db.select().from(historicalCaseStudies).orderBy(desc(historicalCaseStudies.createdAt)).limit(100);
  }
  return [...memoryStore.historicalCases].slice(0, 100);
}

export async function persistHistoricalDataset(input: {
  id: string;
  caseStudyId: string;
  fileName: string;
  version: number;
  phase: string;
  format: string;
  sourceType: string;
  sourceUrl?: string;
  description?: string;
  license?: string;
  dateAcquired?: string;
  storageKey: string;
  storageUrl: string;
  spatialCoverage?: string;
  timeRange?: string;
  schema: Record<string, unknown>;
  mapping: Record<string, unknown>;
  validation: Record<string, unknown>;
  geometry?: Record<string, unknown> | null;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(historicalDatasets).values(input);
    return true;
  }
  memoryStore.historicalDatasets.unshift({
    id: input.id,
    caseStudyId: input.caseStudyId,
    fileName: input.fileName,
    version: input.version,
    phase: input.phase,
    format: input.format,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl ?? null,
    description: input.description ?? null,
    license: input.license ?? null,
    dateAcquired: input.dateAcquired ?? null,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    spatialCoverage: input.spatialCoverage ?? null,
    timeRange: input.timeRange ?? null,
    schema: input.schema,
    mapping: input.mapping,
    validation: input.validation,
    geometry: input.geometry ?? null,
    createdAt: new Date(),
  });
  return true;
}

export async function listHistoricalDatasets(caseStudyId: string): Promise<Array<typeof historicalDatasets.$inferSelect>> {
  const db = await getDb();
  if (db) {
    return db.select().from(historicalDatasets).where(eq(historicalDatasets.caseStudyId, caseStudyId)).orderBy(desc(historicalDatasets.createdAt));
  }
  return memoryStore.historicalDatasets.filter(d => d.caseStudyId === caseStudyId);
}

export async function persistHistoricalRun(input: {
  id: string;
  caseStudyId: string;
  parameters: Record<string, unknown>;
  prediction: Record<string, unknown>;
  comparison?: Record<string, unknown>;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(historicalRuns).values(input);
    return true;
  }
  memoryStore.historicalRuns.unshift({
    id: input.id,
    caseStudyId: input.caseStudyId,
    parameters: input.parameters,
    prediction: input.prediction,
    comparison: input.comparison ?? null,
    createdAt: new Date(),
  });
  return true;
}

export async function persistHistoricalReport(input: {
  id: string;
  caseStudyId: string;
  title: string;
  storageKey: string;
  storageUrl: string;
}): Promise<boolean> {
  const db = await getDb();
  if (db) {
    await db.insert(historicalReports).values(input);
    return true;
  }
  memoryStore.historicalReports.unshift({
    id: input.id,
    caseStudyId: input.caseStudyId,
    title: input.title,
    storageKey: input.storageKey,
    storageUrl: input.storageUrl,
    createdAt: new Date(),
  });
  return true;
}

export async function listHistoricalReports(caseStudyId: string): Promise<Array<typeof historicalReports.$inferSelect>> {
  const db = await getDb();
  if (db) {
    return db.select().from(historicalReports).where(eq(historicalReports.caseStudyId, caseStudyId)).orderBy(desc(historicalReports.createdAt));
  }
  return memoryStore.historicalReports.filter(r => r.caseStudyId === caseStudyId);
}

export async function listAllHistoricalReports(): Promise<Array<typeof historicalReports.$inferSelect>> {
  const db = await getDb();
  if (db) {
    return db.select().from(historicalReports).orderBy(desc(historicalReports.createdAt)).limit(50);
  }
  return [...memoryStore.historicalReports].slice(0, 50);
}
