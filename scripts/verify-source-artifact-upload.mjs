import { chromium } from "playwright-core";

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  const dialogs = [];
  page.on("dialog", async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.getByRole("button", { name: "Reports", exact: true }).first().click();
  const uploadInput = page.locator("input[type='file']");
  await uploadInput.setInputFiles("/home/ubuntu/upload/pasted_content_3.txt");
  await page.waitForTimeout(8_000);
  if (!dialogs.some(message => message.startsWith("Stored source artifact"))) throw new Error(`Source-artifact upload did not show success feedback: ${JSON.stringify(dialogs)}`);
  console.log("Visible source-artifact upload passed with user-provided attachment");
} finally {
  await browser.close();
}
