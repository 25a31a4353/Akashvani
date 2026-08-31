import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const assessmentAreas = mysqlTable("assessment_areas", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  district: varchar("district", { length: 255 }).notNull(),
  state: varchar("state", { length: 255 }).notNull(),
  geometry: json("geometry").$type<Record<string, unknown>>().notNull(),
  population: int("population").notNull(),
  dataStatus: varchar("dataStatus", { length: 32 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const gisLayers = mysqlTable("gis_layers", {
  id: varchar("id", { length: 64 }).primaryKey(),
  layerKey: varchar("layerKey", { length: 128 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  geometry: json("geometry").$type<Record<string, unknown>>().notNull(),
  styleConfig: json("styleConfig").$type<Record<string, unknown>>().notNull(),
  dataStatus: varchar("dataStatus", { length: 32 }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  observedAt: timestamp("observedAt").defaultNow().notNull(),
});

export const riskIndicators = mysqlTable("risk_indicators", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  overallRisk: int("overallRisk").notNull(),
  riskLevel: varchar("riskLevel", { length: 32 }).notNull(),
  factors: json("factors").$type<Record<string, unknown>>().notNull(),
  methodologyVersion: varchar("methodologyVersion", { length: 255 }).notNull(),
  dataStatus: varchar("dataStatus", { length: 32 }).notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export const capacityAnalyses = mysqlTable("capacity_analyses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  score: int("score").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  factors: json("factors").$type<Record<string, unknown>>().notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export const relocationRecommendations = mysqlTable("relocation_recommendations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  score: int("score").notNull(),
  priority: varchar("priority", { length: 32 }).notNull(),
  recommendedAction: text("recommendedAction").notNull(),
  candidateSites: json("candidateSites").$type<Record<string, unknown>>().notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
});

export const generatedReports = mysqlTable("generated_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  riskLevel: varchar("riskLevel", { length: 32 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sourceArtifacts = mysqlTable("source_artifacts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const decisionNarratives = mysqlTable("decision_narratives", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  model: varchar("model", { length: 128 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  grounding: varchar("grounding", { length: 128 }).notNull(),
  content: json("content").$type<Record<string, unknown>>().notNull(),
  reviewStatus: varchar("reviewStatus", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const historicalCaseStudies = mysqlTable("historical_case_studies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  hazardType: varchar("hazardType", { length: 96 }).notNull(),
  eventDate: varchar("eventDate", { length: 32 }).notNull(),
  description: text("description").notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const historicalDatasets = mysqlTable("historical_datasets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  caseStudyId: varchar("caseStudyId", { length: 64 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  version: int("version").notNull(),
  phase: varchar("phase", { length: 32 }).notNull(),
  format: varchar("format", { length: 32 }).notNull(),
  sourceType: varchar("sourceType", { length: 64 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 2048 }),
  description: text("description"),
  license: varchar("license", { length: 512 }),
  dateAcquired: varchar("dateAcquired", { length: 32 }),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  spatialCoverage: varchar("spatialCoverage", { length: 255 }),
  timeRange: varchar("timeRange", { length: 255 }),
  schema: json("schema").$type<Record<string, unknown>>().notNull(),
  mapping: json("mapping").$type<Record<string, unknown>>().notNull(),
  validation: json("validation").$type<Record<string, unknown>>().notNull(),
  geometry: json("geometry").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const historicalRuns = mysqlTable("historical_runs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  caseStudyId: varchar("caseStudyId", { length: 64 }).notNull(),
  parameters: json("parameters").$type<Record<string, unknown>>().notNull(),
  prediction: json("prediction").$type<Record<string, unknown>>().notNull(),
  comparison: json("comparison").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const historicalReports = mysqlTable("historical_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  caseStudyId: varchar("caseStudyId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  storageKey: varchar("storageKey", { length: 1024 }).notNull(),
  storageUrl: varchar("storageUrl", { length: 2048 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
