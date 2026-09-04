import type { Express } from "express";
import fs from "fs";
import path from "path";
import { ENV } from "./env";

const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export function registerStorageProxy(app: Express) {
  // Handle local storage files
  app.get("/local-storage/*", (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const safePath = path.resolve(LOCAL_UPLOADS_DIR, key);
    if (!safePath.startsWith(LOCAL_UPLOADS_DIR)) {
      res.status(403).send("Access denied");
      return;
    }

    if (!fs.existsSync(safePath)) {
      res.status(404).send("File not found");
      return;
    }

    res.sendFile(safePath);
  });

  // Handle manus storage files (with fallback to local storage if forge is not configured)
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      // Check if file exists in local storage
      const safePath = path.resolve(LOCAL_UPLOADS_DIR, key);
      if (safePath.startsWith(LOCAL_UPLOADS_DIR) && fs.existsSync(safePath)) {
        res.sendFile(safePath);
        return;
      }
      res.status(500).send("Storage proxy not configured and file not in local storage");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
