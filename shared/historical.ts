export type DatasetPhase = "PRE_EVENT" | "GROUND_TRUTH";
export type DatasetFormat = "CSV" | "XLSX" | "GEOJSON" | "SHP_ZIP" | "GEOTIFF" | "KML" | "KMZ" | "OTHER";
export type DatasetSourceType = "Government Dataset" | "Satellite Dataset" | "Research Dataset" | "User Generated" | "Simulation" | "Other";

export type GeometryFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{ type: "Feature"; properties?: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }>;
};

export type DatasetValidation = {
  status: "VALID" | "WARNING" | "INVALID";
  featureCount: number;
  geometryTypes: string[];
  crs: string;
  validCoordinateRate: number | null;
  missingCoordinates: number;
  duplicateRecords: number;
  emptyGeometries: number;
  invalidGeometries: number;
  warnings: string[];
  notes: string[];
};

export type DatasetMapping = Record<string, string | null>;

export type HistoricalCaseStudy = {
  id: string;
  name: string;
  location: string;
  hazardType: string;
  eventDate: string;
  description: string;
  createdAt: string;
};

export type HistoricalDataset = {
  id: string;
  caseStudyId: string;
  fileName: string;
  version: number;
  phase: DatasetPhase;
  format: DatasetFormat;
  sourceType: DatasetSourceType;
  sourceUrl?: string;
  description?: string;
  license?: string;
  dateAcquired?: string;
  storageUrl: string;
  spatialCoverage?: string;
  timeRange?: string;
  schema: string[];
  mapping: DatasetMapping;
  validation: DatasetValidation;
  geometry?: GeometryFeatureCollection;
  createdAt: string;
};

export type ValidationMetrics = {
  available: boolean;
  predictedAreaKm2?: number;
  actualAreaKm2?: number;
  overlapAreaKm2?: number;
  iou?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  overlapPercent?: number;
  falsePositiveAreaKm2?: number;
  falseNegativeAreaKm2?: number;
  predictedPopulation?: number;
  actualPopulation?: number;
  populationDifference?: number;
  populationErrorPercent?: number;
  predictedInfrastructureAffected?: number;
  actualInfrastructureAffected?: number;
  correctlyDetectedInfrastructure?: number;
  infrastructureDetectionRate?: number;
  limitations: string[];
};

export type HistoricalReplayResult = {
  id: string;
  caseStudyId: string;
  generatedAt: string;
  prediction: GeometryFeatureCollection;
  methodology: string;
  baseline: { risk: number; populationExposure: number; carryingCapacity: number; relocationPriority: number };
  simulated: { risk: number; populationExposure: number; carryingCapacity: number; relocationPriority: number };
  parameters: { rainfallMultiplier: number; populationMultiplier: number; shelterMultiplier: number; routeBlocked: boolean; temperatureDeltaC: number };
  dataStatus: "DATASET-DERIVED PREDICTION";
};
