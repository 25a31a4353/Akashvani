import { chromium } from "playwright-core";

const url = "http://127.0.0.1:3000/";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await desktop.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await desktop.getByTestId("india-gis-map").waitFor({ state: "visible", timeout: 45_000 });
  await desktop.locator(".maplibregl-canvas").waitFor({ state: "visible", timeout: 45_000 });
  for (const [label, heading] of [["Dashboard", "Disaster intelligence overview"], ["GIS workspace", "GIS assessment workspace"], ["Risk assessment", "Explainable risk assessment"], ["Site capacity", "Carrying capacity and service access"], ["Relocation", "Relocation prioritization"], ["Reports", "Assessment reports and source artifacts"], ["Dataset Lab", "Dataset Lab"], ["Historical Replay", "Historical disaster comparison"], ["What-if simulation", "What-if simulation"], ["Case studies", "Historical case studies"]]) {
    await desktop.getByRole("button", { name: label, exact: true }).first().click();
    await desktop.getByRole("heading", { name: heading, exact: true }).waitFor({ state: "visible", timeout: 8_000 });
  }
  await desktop.getByRole("button", { name: "GIS workspace", exact: true }).first().click();
  await desktop.getByRole("button", { name: /Find hazardous areas/i }).click();
  await desktop.getByRole("button", { name: "Flood", exact: true }).click();
  assert(await desktop.getByText(/assessment areas match the selected filters/i).isVisible(), "Hazard filter did not reveal its calculated-result state.");
  await desktop.getByRole("button", { name: "Reset", exact: true }).click();
  const infrastructure = desktop.getByRole("switch", { name: "Toggle Critical infrastructure" });
  if (!(await infrastructure.isVisible())) await desktop.getByRole("button", { name: /Layers/i }).click();
  await infrastructure.waitFor({ state: "visible", timeout: 8_000 });
  const before = await infrastructure.getAttribute("data-state"); await infrastructure.click();
  assert((await infrastructure.getAttribute("data-state")) !== before, "Infrastructure layer switch did not change state.");
  await desktop.getByRole("button", { name: "Muted", exact: true }).click();
  await desktop.getByRole("button", { name: "Terrain", exact: true }).click();
  await desktop.getByRole("button", { name: "Zoom in" }).click(); await desktop.getByRole("button", { name: "Zoom out" }).click(); await desktop.getByRole("button", { name: "Reset map view" }).click();
  await desktop.getByRole("button", { name: "Toggle fullscreen map" }).click();
  await desktop.waitForFunction(() => document.fullscreenElement?.getAttribute("data-testid") === "india-gis-map", undefined, { timeout: 8_000 });
  await desktop.evaluate(() => document.exitFullscreen());
  await desktop.waitForFunction(() => !document.fullscreenElement, undefined, { timeout: 8_000 });
  await desktop.getByRole("button", { name: "More options" }).click();
  await desktop.getByRole("button", { name: "Open persistent reports" }).click();
  await desktop.getByRole("heading", { name: "Assessment reports and source artifacts", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
  await desktop.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await mobile.getByTestId("india-gis-map").waitFor({ state: "visible", timeout: 45_000 });
  await mobile.getByRole("button", { name: "Open navigation" }).click();
  await mobile.getByRole("dialog", { name: "Navigation menu" }).waitFor({ state: "visible", timeout: 8_000 });
  await mobile.getByRole("button", { name: "Dataset Lab", exact: true }).click();
  await mobile.getByRole("heading", { name: "Dataset Lab", exact: true }).waitFor({ state: "visible", timeout: 8_000 });
  console.log("Visible desktop/mobile navigation, filters, layer controls, map controls, and workspace routes passed");
  await mobile.close();
} finally {
  await browser.close();
}
