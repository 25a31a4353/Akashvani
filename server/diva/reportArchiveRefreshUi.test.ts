// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createElement, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReportArchiveList, type PersistedPdfArchiveEntry } from "../../client/src/components/diva/ReportArchiveList";
import { refreshPersistentPdfArchive } from "../../client/src/components/diva/reportArchiveRefresh";

describe("Reports workspace historical-generation refresh", () => {
  it("keeps assessment PDFs visible and adds a persisted historical PDF after generation success", async () => {
    const assessment: PersistedPdfArchiveEntry = { id: "RPT-201", title: "Assessment PDF", createdAt: "2026-08-24T10:00:00.000Z", kind: "ASSESSMENT", riskLevel: "High", storageUrl: "https://storage.example/assessment.pdf" };
    const historical: PersistedPdfArchiveEntry = { id: "HREP-201", title: "Historical PDF", createdAt: "2026-08-24T11:00:00.000Z", kind: "HISTORICAL", riskLevel: null, storageUrl: "https://storage.example/historical.pdf" };
    function HistoricalGenerationHarness() {
      const [reports, setReports] = useState<PersistedPdfArchiveEntry[]>([assessment]);
      return createElement("div", null,
        createElement("button", { onClick: () => refreshPersistentPdfArchive(() => setReports(current => [historical, ...current])) }, "Simulate historical PDF success"),
        createElement(ReportArchiveList, { reports }),
      );
    }
    const user = userEvent.setup();
    render(createElement(HistoricalGenerationHarness));
    expect(screen.getByTestId("report-assessment-RPT-201")).toBeTruthy();
    expect(screen.queryByTestId("report-historical-HREP-201")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Simulate historical PDF success" }));
    expect(screen.getByTestId("report-assessment-RPT-201")).toBeTruthy();
    expect(screen.getByTestId("report-historical-HREP-201")).toBeTruthy();
    expect(screen.getByTestId("download-HREP-201").getAttribute("href")).toBe("https://storage.example/historical.pdf");
  });
});
