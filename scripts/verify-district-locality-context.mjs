import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  for (const [location, expectedName] of [["guntur", "Guntur"], ["nizamabad", "Nizamabad"], ["banjara-hills", "Banjara Hills"]]) {
    const page = await browser.newPage({ viewport: { width: location === "guntur" ? 1280 : 375, height: 812 } });
    await page.goto(`http://127.0.0.1:3000/?location=${location}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.getByTestId("selected-location-priority-queue").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("selected-location-decision-table").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("selected-location-forecast-sidebar").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("india-context-sidebar").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("india-location-summary-strip").waitFor({ state: "visible", timeout: 45_000 });
    await page.getByTestId("selected-location-forecast-summary").scrollIntoViewIfNeeded();
    await page.getByTestId("selected-location-forecast-summary").waitFor({ state: "visible", timeout: 15_000 });
    const queue = await page.getByTestId("selected-location-priority-queue").textContent();
    const decisionRow = await page.getByTestId("selected-location-decision-row").textContent();
    const summary = await page.getByTestId("selected-location-forecast-summary").textContent();
    const sidebar = await page.getByTestId("selected-location-forecast-sidebar").textContent();
    const indiaSidebar = await page.getByTestId("india-context-sidebar").textContent();
    const summaryStrip = await page.getByTestId("india-location-summary-strip").textContent();
    if (!queue?.includes(expectedName) || !decisionRow?.includes(expectedName) || !summary?.includes("Forecast refreshed") || !sidebar?.includes("Updated") || !indiaSidebar?.includes("Updated") || !summaryStrip?.includes("Forecast refreshed")) throw new Error(`${expectedName} selected-location decision context was not rendered`);
    await page.close();
  }
  console.log("District, city, and locality selected-location priority and forecast assertions passed");
} finally {
  await browser.close();
}
