import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("india-context-sidebar").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByRole("button", { name: "Risk assessment", exact: true }).first().click();
  const rerun = page.getByRole("button", { name: /Re-run deterministic analysis/i });
  await rerun.click();
  await page.waitForTimeout(700);
  const narrative = page.getByRole("button", { name: /Generate reviewed narrative|Refresh narrative/i });
  await narrative.click();
  await page.getByText("Pending analyst review", { exact: true }).waitFor({ state: "visible", timeout: 45_000 });
  const report = page.getByRole("button", { name: "Generate report", exact: true });
  const popupPromise = page.waitForEvent("popup", { timeout: 45_000 });
  await report.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded", { timeout: 45_000 });
  if (!popup.url().includes("cloudfront.net/") && !popup.url().includes("/manus-storage/")) throw new Error(`Assessment PDF did not resolve to object storage: ${popup.url()}`);
  await popup.close();
  await page.getByRole("button", { name: "Reports", exact: true }).first().click();
  await page.getByText(/DIVA assessment — Wayanad/i).first().waitFor({ state: "visible", timeout: 45_000 });
  console.log("Deterministic analysis, grounded narrative, and assessment PDF generation actions passed");
} finally {
  await browser.close();
}
