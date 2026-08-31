import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
try {
  await page.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("assam-state-profile").waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("assam-disaster-history").waitFor({ state: "visible", timeout: 10_000 });
  const dashboardWidth = await page.locator("body").evaluate(element => element.scrollWidth);
  if (dashboardWidth > 430) {
    const offenders = await page.locator("body *").evaluateAll(elements => elements.filter(element => element.scrollWidth > element.clientWidth + 2).slice(0, 12).map(element => ({ tag: element.tagName, testid: element.getAttribute("data-testid"), className: element.className, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })));
    throw new Error(`Mobile dashboard overflow detected: ${dashboardWidth}px ${JSON.stringify(offenders)}`);
  }

  await page.goto("http://127.0.0.1:3000/?location=assam&workspace=map", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("india-gis-map").waitFor({ state: "visible", timeout: 60_000 });
  const mapWidth = await page.locator("body").evaluate(element => element.scrollWidth);
  if (mapWidth > 430) throw new Error(`Mobile map overflow detected: ${mapWidth}px`);

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("assam-state-profile").waitFor({ state: "visible", timeout: 60_000 });
  await page.getByTestId("assam-disaster-history").waitFor({ state: "visible", timeout: 10_000 });
  const tabletWidth = await page.locator("body").evaluate(element => element.scrollWidth);
  if (tabletWidth > 808) throw new Error(`Tablet dashboard overflow detected: ${tabletWidth}px`);
  console.log("Assam mobile and tablet dashboard/map assertions passed");
} finally {
  await browser.close();
}
