import { describe, expect, it } from "vitest";
import { storagePut, storageGet, storageGetSignedUrl, LOCAL_UPLOADS_DIR } from "./storage";
import fs from "fs";
import path from "path";

describe("Local Storage Fallback", () => {
  it("saves files locally when Forge API keys are not set", async () => {
    const testContent = "Akashvani test report content";
    const result = await storagePut("test-reports/test.txt", testContent, "text/plain");

    expect(result.key).toContain("test-reports/test");
    expect(result.url).toBe(`/local-storage/${result.key}`);

    const filePath = path.resolve(LOCAL_UPLOADS_DIR, result.key);
    expect(fs.existsSync(filePath)).toBe(true);

    const content = await fs.promises.readFile(filePath, "utf8");
    expect(content).toBe(testContent);

    // Clean up
    await fs.promises.unlink(filePath).catch(() => {});
  });

  it("returns correct URLs via storageGet and storageGetSignedUrl", async () => {
    const getResult = await storageGet("sample/file.pdf");
    expect(getResult.url).toBe("/local-storage/sample/file.pdf");

    const signedUrl = await storageGetSignedUrl("sample/file.pdf");
    expect(signedUrl).toBe("/local-storage/sample/file.pdf");
  });
});
