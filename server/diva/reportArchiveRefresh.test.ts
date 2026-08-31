import { describe, expect, it, vi } from "vitest";
import { refreshPersistentPdfArchive } from "../../client/src/components/diva/reportArchiveRefresh";

describe("historical report archive refresh", () => {
  it("invalidates the shared Reports query when a historical PDF is persisted", () => {
    const invalidateReports = vi.fn(() => Promise.resolve());
    refreshPersistentPdfArchive(invalidateReports);
    expect(invalidateReports).toHaveBeenCalledTimes(1);
  });
});
