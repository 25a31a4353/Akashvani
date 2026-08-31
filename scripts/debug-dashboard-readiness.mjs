import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
try {
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.waitForTimeout(12_000);
  const state = await page.evaluate(() => ({ text: document.body.innerText.slice(0, 800), workspaceCount: document.querySelectorAll("[data-diva-workspace]").length, mapCount: document.querySelectorAll("[data-testid='india-gis-map']").length, googleLoaded: Boolean(window.google?.maps), resources: performance.getEntriesByType("resource").map(entry => entry.name).filter(name => name.includes("api/trpc") || name.includes("maps")).slice(-20) }));
  console.log(JSON.stringify({ state, errors }, null, 2));
} finally {
  await browser.close();
}
