import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
try {
  await page.goto("http://127.0.0.1:3000/?location=india", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("india-gis-map").waitFor({ state: "visible", timeout: 45_000 });
  await page.getByTestId("india-layer-provenance").waitFor({ state: "visible", timeout: 15_000 });
  await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 45_000 });
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const map = page.getByTestId("india-gis-map");
  const surface = page.locator(".maplibregl-canvas");
  const size = await surface.evaluate(element => ({ width: element.width, height: element.height }));
  assert(size.width > 100 && size.height > 100, `Real map dimensions are invalid: ${JSON.stringify(size)}`);
  assert(await map.getAttribute("data-map-mode") === "nationwide", "India overview did not enter nationwide map mode");
  const initialLayers = await map.getAttribute("data-active-layers");
  assert(initialLayers?.includes("population") && initialLayers.includes("terrain") && initialLayers.includes("liveWeather") && initialLayers.includes("wind"), "Expected nationwide map layers were not active");
  assert(!initialLayers?.includes("combinedSensitivity"), "Combined screening should begin disabled to preserve individual hazard readability");
  const provenance = await page.getByTestId("india-layer-provenance").textContent();
  assert(provenance?.includes("UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED"), "Geology availability status not visible");
  assert(provenance?.includes("3-DAY FORECAST COVERAGE GRID"), "Nationwide three-day forecast coverage status not visible");
  await page.getByRole("switch", { name: "Toggle Population density" }).first().click();
  await page.waitForTimeout(200);
  assert(!(await map.getAttribute("data-active-layers"))?.includes("population"), "Population-density map layer did not hide after toggle");
  await page.getByRole("switch", { name: "Toggle Live weather coverage" }).click();
  await page.waitForTimeout(200);
  assert(!(await map.getAttribute("data-active-layers"))?.includes("liveWeather"), "Live-weather map layer did not hide after toggle");
  await page.getByRole("switch", { name: "Toggle Combined multi-hazard screening" }).click();
  await page.waitForTimeout(200);
  assert((await map.getAttribute("data-active-layers"))?.includes("combinedSensitivity"), "Combined multi-hazard map layer did not activate after toggle");
  console.log("India overview browser assertions passed");
} finally {
  await browser.close();
}
