import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const apiErrors = [];
page.on("console", message => { if (message.type() === "error" && message.text().includes("[API Query Error]")) apiErrors.push(message.text()); });
page.on("request", request => { if (request.url().includes("/api/trpc")) console.log(`tRPC request: ${request.url()}`); });
await page.route("**/api/trpc/**", route => route.request().url().includes("diva.india.context") ? route.abort("failed") : route.continue());
try {
  await page.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "networkidle", timeout: 45_000 });
  await page.getByText("Assam", { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  await page.getByTestId("india-context-sidebar").getByText("LOCATION CONTEXT UNAVAILABLE", { exact: true }).waitFor({ state: "visible", timeout: 20_000 });
  if (apiErrors.length) throw new Error(`Resilient Assam fallback emitted API error logs: ${apiErrors.join(" | ")}`);
  console.log("Assam interrupted-context browser assertions passed");
} finally {
  await browser.close();
}
