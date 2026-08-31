import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const loadingPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await loadingPage.route("**/api/trpc/diva.india.context**", async route => {
    await new Promise(resolve => setTimeout(resolve, 1800));
    await route.continue();
  });
  await loadingPage.goto("http://127.0.0.1:3000/?location=assam&workspace=map", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await loadingPage.getByRole("status").getByText("Loading details for").waitFor({ state: "visible", timeout: 10_000 });
  await loadingPage.close();

  const fallbackPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await fallbackPage.goto("http://127.0.0.1:3000/?location=not-a-real-place&workspace=map", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await fallbackPage.getByText("Location fallback:").waitFor({ state: "visible", timeout: 45_000 });
  if (!(await fallbackPage.getByText("could not be found").count())) throw new Error("Fallback notice did not explain that the location was not found");
  await fallbackPage.close();

  const detailsPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await detailsPage.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await detailsPage.getByTestId("selected-location-forecast").waitFor({ state: "visible", timeout: 45_000 });
  const reportAction = detailsPage.getByTestId("selected-location-report-action");
  await reportAction.getByRole("button", { name: /Download selected-area PDF/ }).waitFor({ state: "visible", timeout: 15_000 });
  const placement = await detailsPage.evaluate(() => {
    const forecast = document.querySelector('[data-testid="selected-location-forecast"]');
    const report = document.querySelector('[data-testid="selected-location-report-action"]');
    const details = Array.from(document.querySelectorAll("button")).find(button => button.textContent?.includes("Show full location details"));
    return forecast && report && details ? forecast.compareDocumentPosition(report) & Node.DOCUMENT_POSITION_FOLLOWING && report.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  if (!placement) throw new Error("Selected-area PDF action is not placed after Details Forecast and before full location details");
  const reportResponsePromise = detailsPage.waitForResponse(response => response.url().includes("diva.generateSelectedLocationReport") && response.request().method() === "POST", { timeout: 60_000 });
  await reportAction.getByRole("button", { name: /Download selected-area PDF/ }).click();
  const reportResponse = await reportResponsePromise;
  if (!reportResponse.ok()) throw new Error(`Selected-area PDF request failed with ${reportResponse.status()}`);
  const reportBody = await reportResponse.json();
  const reportResult = reportBody?.[0]?.result?.data?.json ?? reportBody?.result?.data?.json;
  if (!reportResult?.url || !reportResult?.id) throw new Error("Selected-area PDF response did not include a report URL and ID");
  const pdfResponse = await fetch(new URL(reportResult.url, "http://127.0.0.1:3000").toString());
  if (!pdfResponse.ok) throw new Error(`Generated PDF URL returned ${pdfResponse.status}`);
  const pdfBytes = Buffer.from(await pdfResponse.arrayBuffer());
  if (pdfBytes.subarray(0, 4).toString() !== "%PDF") throw new Error("Generated selected-area report is not a PDF payload");
  await writeFile("/tmp/diva-selected-location-report.pdf", pdfBytes);
  const showDetails = detailsPage.getByRole("button", { name: /Show full location details/ });
  await showDetails.waitFor({ state: "visible", timeout: 45_000 });
  await showDetails.click();
  await detailsPage.getByTestId("selected-location-priority-queue").waitFor({ state: "visible", timeout: 15_000 });
  const hideDetails = detailsPage.getByRole("button", { name: /Hide full location details/ });
  await hideDetails.click();
  await detailsPage.getByTestId("selected-location-priority-queue").waitFor({ state: "hidden", timeout: 5_000 });

  const kakinadaId = "india-kakinada-kakinada-urban-kakinada-andhra-pradesh-533001-india-16.944-82.235";
  const kakinadaLocation = { id: kakinadaId, name: "Kakinada", displayName: "Kakinada, Kakinada Urban, Kakinada, Andhra Pradesh, 533001, India", category: "City", latitude: 16.9437385, longitude: 82.2350607, population: null, populationSource: "No population value is supplied by Nominatim for this selected place.", boundingBox: [16.7837385, 82.0750607, 17.1037385, 82.3950607], boundary: null, address: { state: "Andhra Pradesh", district: "Kakinada", city: "Kakinada" }, source: "Nominatim / OpenStreetMap search and boundary context" };
  const kakinadaParams = new URLSearchParams({ location: kakinadaId, locationId: kakinadaId, locationData: JSON.stringify(kakinadaLocation) });
  const kakinadaPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await kakinadaPage.goto(`http://127.0.0.1:3000/?${kakinadaParams.toString()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await kakinadaPage.getByTestId("selected-location-forecast").waitFor({ state: "visible", timeout: 45_000 });
  const kakinadaReport = kakinadaPage.getByTestId("selected-location-report-action").getByRole("button", { name: /Download selected-area PDF/ });
  const kakinadaResponsePromise = kakinadaPage.waitForResponse(response => response.url().includes("diva.generateSelectedLocationReport") && response.request().method() === "POST", { timeout: 60_000 });
  await kakinadaReport.click();
  const kakinadaResponse = await kakinadaResponsePromise;
  if (!kakinadaResponse.ok()) throw new Error(`Kakinada selected-area PDF request failed with ${kakinadaResponse.status()}`);
  const kakinadaBody = await kakinadaResponse.json();
  const kakinadaResult = kakinadaBody?.[0]?.result?.data?.json ?? kakinadaBody?.result?.data?.json;
  if (!kakinadaResult?.url?.includes(`/selected-locations/${kakinadaId}/`) || !kakinadaResult.title?.includes("Kakinada") || kakinadaResult.persisted !== true) throw new Error("Kakinada report was not persisted under the selected Kakinada location");
  const kakinadaPdfResponse = await fetch(new URL(kakinadaResult.url, "http://127.0.0.1:3000").toString());
  if (!kakinadaPdfResponse.ok || Buffer.from(await kakinadaPdfResponse.arrayBuffer()).subarray(0, 4).toString() !== "%PDF") throw new Error("Kakinada report URL did not return a PDF payload");
  await kakinadaPage.close();
  console.log("Simplified loading, fallback, Details Forecast, PDF placement, report generation, details-disclosure, and Kakinada persistence assertions passed");
} finally {
  await browser.close();
}
