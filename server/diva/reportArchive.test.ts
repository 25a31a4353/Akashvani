import { describe, expect, it } from "vitest";
import { mergePersistentPdfArchive } from "./reportArchive";

describe("persistent PDF report archive", () => {
  it("exposes assessment and historical PDFs in one newest-first downloadable archive", () => {
    const archive = mergePersistentPdfArchive(
      [{ id: "RPT-001", assessmentId: "DIVA-1", title: "Assessment PDF", riskLevel: "High", storageKey: "reports/DIVA-1/RPT-001.pdf", storageUrl: "https://storage.example/assessment.pdf", createdAt: "2026-08-24T10:00:00.000Z" }],
      [{ id: "HREP-001", caseStudyId: "CASE-1", title: "Historical PDF", storageKey: "historical-reports/CASE-1/HREP-001.pdf", storageUrl: "https://storage.example/historical.pdf", createdAt: "2026-08-24T11:00:00.000Z" }],
    );
    expect(archive).toHaveLength(2);
    expect(archive[0]).toMatchObject({ id: "HREP-001", kind: "HISTORICAL", riskLevel: null, storageUrl: "https://storage.example/historical.pdf" });
    expect(archive[1]).toMatchObject({ id: "RPT-001", kind: "ASSESSMENT", riskLevel: "High", storageUrl: "https://storage.example/assessment.pdf" });
    expect(archive.every(report => report.storageUrl.endsWith(".pdf"))).toBe(true);
  });
});
