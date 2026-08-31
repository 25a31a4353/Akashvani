import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto("http://127.0.0.1:3000/?location=assam", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByTestId("selected-location-forecast").waitFor({ state: "visible", timeout: 45_000 });
  await page.screenshot({ path: "/home/ubuntu/ps191-diva-platform/selected-location-preview.png", fullPage: true });
  console.log("Settled selected-location preview captured");
} finally {
  await browser.close();
}
