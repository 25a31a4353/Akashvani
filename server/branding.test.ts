import { describe, expect, it } from "vitest";

describe("Akashvani branding configuration", () => {
  it("uses the configured title and the application endpoint is reachable", async () => {
    expect(process.env.VITE_APP_TITLE).toBe("Akashvani — Disaster Intelligence Platform");
    const response = await fetch("http://127.0.0.1:3000/", {
      headers: { "x-application-title": Buffer.from(process.env.VITE_APP_TITLE ?? "", "utf8").toString("base64") },
    });
    expect(response.ok).toBe(true);
  });
});

