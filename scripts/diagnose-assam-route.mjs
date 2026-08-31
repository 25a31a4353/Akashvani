import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const responses = [];
page.on("response", response => {
  if (response.url().includes("/api/trpc")) responses.push({ url: response.url(), status: response.status() });
});
try {
  await page.goto("http://127.0.0.1:3000/?location=assam&workspace=map", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(12_000);
  console.log(JSON.stringify({ text: (await page.locator("body").innerText()).slice(0, 1200), summary: await page.getByTestId("india-location-summary-strip").innerText().catch(() => "missing"), mapContext: await page.getByTestId("map-location-decision-context").innerText().catch(() => "missing"), responses: responses.slice(-30) }, null, 2));
} finally {
  await browser.close();
}
