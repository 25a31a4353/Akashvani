export type AssessmentPdfRecord = { id: string; assessmentId: string; title: string; riskLevel: string; storageKey: string; storageUrl: string; createdAt: Date | string };
export type HistoricalPdfRecord = { id: string; caseStudyId: string; title: string; storageKey: string; storageUrl: string; createdAt: Date | string };

export function mergePersistentPdfArchive(assessmentReports: AssessmentPdfRecord[], historicalReports: HistoricalPdfRecord[]) {
  return [
    ...assessmentReports.map(report => ({ ...report, kind: "ASSESSMENT" as const })),
    ...historicalReports.map(report => ({ ...report, kind: "HISTORICAL" as const, riskLevel: null })),
  ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}
