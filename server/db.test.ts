import { describe, expect, it } from "vitest";
import {
  persistReport,
  listPersistedReports,
  getPersistedReport,
  createHistoricalCase,
  listHistoricalCases,
  upsertUser,
  getUserByOpenId,
} from "./db";

describe("Database / In-memory Store Fallback", () => {
  it("persists and lists reports in memory without DATABASE_URL", async () => {
    const reportId = `RPT-TEST-${Date.now()}`;
    const saved = await persistReport({
      id: reportId,
      assessmentId: "kl-wayanad",
      title: "DIVA assessment — Wayanad Test",
      riskLevel: "High",
      storageKey: `reports/kl-wayanad/${reportId}.pdf`,
      storageUrl: `/local-storage/reports/kl-wayanad/${reportId}.pdf`,
    });
    expect(saved).toBe(true);

    const reports = await listPersistedReports();
    const found = reports.find(r => r.id === reportId);
    expect(found).toBeDefined();
    expect(found?.title).toBe("DIVA assessment — Wayanad Test");

    const single = await getPersistedReport(reportId);
    expect(single).toBeDefined();
    expect(single?.id).toBe(reportId);
  });

  it("creates and retrieves historical case studies in memory", async () => {
    const caseId = `CASE-TEST-${Date.now()}`;
    const created = await createHistoricalCase({
      id: caseId,
      name: "Kerala Floods 2018 Test",
      location: "Kerala",
      hazardType: "Flood",
      eventDate: "2018-08-15",
      description: "In-memory test case description",
    });
    expect(created).toBe(true);

    const cases = await listHistoricalCases();
    const found = cases.find(c => c.id === caseId);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Kerala Floods 2018 Test");
  });

  it("upserts and retrieves user profiles", async () => {
    const openId = `test-user-${Date.now()}`;
    await upsertUser({
      openId,
      name: "Emergency Operations Specialist",
      email: "eos@kerala.gov.in",
      role: "user",
    });

    const user = await getUserByOpenId(openId);
    expect(user).toBeDefined();
    expect(user?.name).toBe("Emergency Operations Specialist");
    expect(user?.email).toBe("eos@kerala.gov.in");
  });
});
