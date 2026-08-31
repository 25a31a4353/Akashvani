import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
try {
  await page.goto("http://127.0.0.1:3000/?location=nizamabad", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("selected-location-priority-queue").scrollIntoViewIfNeeded();
  await page.getByTestId("selected-location-priority-queue").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("selected-location-decision-table").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("india-context-sidebar").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("india-location-summary-strip").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("selected-location-forecast").scrollIntoViewIfNeeded();
  await page.getByTestId("selected-location-forecast").waitFor({ state: "visible", timeout: 15_000 });
  const priorityText = await page.getByTestId("selected-location-priority-queue").textContent();
  if (!priorityText?.includes("Nizamabad")) throw new Error("Mobile selected priority queue did not update to Nizamabad");
  if (!(await page.getByTestId("selected-location-decision-row").textContent())?.includes("Nizamabad")) throw new Error("Mobile selected decision table did not update to Nizamabad");
  if (!(await page.getByTestId("india-context-sidebar").textContent())?.includes("Updated")) throw new Error("Mobile India sidebar forecast freshness missing");
  if (!(await page.getByTestId("india-location-summary-strip").textContent())?.includes("Forecast refreshed")) throw new Error("Mobile India summary forecast detail missing");
  console.log("Mobile selected-location priority and forecast assertions passed");
} finally {
  await browser.close();
}
