import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportArchiveList } from "../../client/src/components/diva/ReportArchiveList";

describe("Reports workspace persistent PDF archive", () => {
  it("renders both assessment and historical records with persisted PDF download URLs", () => {
    const markup = renderToStaticMarkup(createElement(ReportArchiveList, { reports: [
      { id: "RPT-101", title: "Kerala assessment", createdAt: "2026-08-24T10:00:00.000Z", kind: "ASSESSMENT", riskLevel: "High", storageUrl: "https://storage.example/assessment.pdf" },
      { id: "HREP-101", title: "Wayanad historical validation", createdAt: "2026-08-24T11:00:00.000Z", kind: "HISTORICAL", riskLevel: null, storageUrl: "https://storage.example/historical.pdf" },
    ] }));
    expect(markup).toContain("Kerala assessment");
    expect(markup).toContain("Wayanad historical validation");
    expect(markup).toContain("Assessment PDF");
    expect(markup).toContain("Historical validation PDF");
    expect(markup).toContain("https://storage.example/assessment.pdf");
    expect(markup).toContain("https://storage.example/historical.pdf");
  });
});
