import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
try {
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(5_000);
  const evidence = await page.locator(".maplibregl-canvas").evaluate(canvas => {
    const rect = canvas.getBoundingClientRect();
    const parent = canvas.parentElement?.getBoundingClientRect();
    const mapRoot = canvas.closest(".maplibregl-map")?.getBoundingClientRect();
    const mapPanel = canvas.closest(".maplibregl-map")?.parentElement?.getBoundingClientRect();
    const tileRequests = performance.getEntriesByType("resource").filter(entry => entry.name.includes("tile.openstreetmap.org")).length;
    return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height, parentWidth: parent?.width ?? 0, parentHeight: parent?.height ?? 0, mapRootWidth: mapRoot?.width ?? 0, mapRootHeight: mapRoot?.height ?? 0, panelWidth: mapPanel?.width ?? 0, panelHeight: mapPanel?.height ?? 0, tileRequests };
  });
  if (evidence.width < 100 || evidence.height < 100 || evidence.cssWidth < 100 || evidence.cssHeight < 100) throw new Error(`MapLibre canvas has invalid dimensions: ${JSON.stringify(evidence)}`);
  if (evidence.tileRequests < 1) throw new Error(`No OpenStreetMap tile requests were observed: ${JSON.stringify(evidence)}`);
  if (consoleErrors.length) throw new Error(`MapLibre browser console errors: ${consoleErrors.join(" | ")}`);
  console.log(`MapLibre canvas verified: ${JSON.stringify(evidence)}`);
} finally {
  await browser.close();
}
