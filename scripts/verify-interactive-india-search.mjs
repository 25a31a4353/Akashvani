import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  await page.goto("http://127.0.0.1:3000/?workspace=map", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("india-gis-map").waitFor({ state: "visible", timeout: 45_000 });
  await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("india-location-search").fill("Wayanad");
  await page.getByTestId("india-location-result").first().waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("india-location-result").filter({ hasText: /Wayanad/i }).first().click();
  await page.getByTestId("map-command-workspace").waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(1_000);
  const workspace = await page.getByTestId("map-command-workspace").textContent();
  const mapSurface = page.locator(".maplibregl-canvas");
  const dimensions = await mapSurface.evaluate(element => ({ width: element.width, height: element.height }));
  if (!workspace?.match(/Wayanad/i) || !workspace?.match(/Selected place/i)) throw new Error("Interactive India search did not refresh the GIS command workspace to Wayanad.");
  if (dimensions.width < 100 || dimensions.height < 100) throw new Error(`Map canvas collapsed after search: ${JSON.stringify(dimensions)}`);
  const selectedUrl = new URL(page.url());
  const locationId = selectedUrl.searchParams.get("locationId");
  const locationParam = selectedUrl.searchParams.get("location");
  if (!locationId || locationParam !== locationId || !selectedUrl.searchParams.get("locationData")) throw new Error(`Search selection did not update the canonical location URL: ${page.url()}`);
  console.log("Interactive India search and real map selection assertions passed");
} finally {
  await browser.close();
}
