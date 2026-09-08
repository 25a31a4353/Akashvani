# Akashvani — Antigravity Handoff

## 1. Project Identity
- **Project:** Akashvani — Disaster Intelligence Platform
- **SIH Problem Statement:** PS191 / SIH26191
- **Title:** Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations
- **Organization:** Ministry of Home Affairs — Disaster Management
- **Target States (13):** Assam, Andhra Pradesh, Maharashtra, Karnataka, Bihar, Jharkhand, Mizoram, Odisha, Chhattisgarh, Uttar Pradesh, Rajasthan, Tamil Nadu, Kerala

---

## 2. Current Architecture
- **Frontend:** React 19 + Vite 7 + TypeScript + Tailwind CSS (Vanilla utilities) + Wouter routing
- **Backend:** Node.js + Express + tRPC v11
- **GIS / Mapping:** MapLibre GL
- **Database:** MySQL / TiDB with Drizzle ORM (optional in-memory store active for demonstration)
- **Frontend Deployment Target:** Vercel
- **Backend Deployment:** Railway
- **Railway Backend Public URL:**
  `https://akashvani-production.up.railway.app`

---

## 3. Important Current Git Checkpoint
- **Current Pushed Commit:** `8307385cc6a22c6f9c5676df57fd4488ec25e6a3` (`8307385`)
- **Commit Message:** `fix: connect Vercel frontend to Railway backend`
- **Branch:** `main` (synchronized with `origin/main`)
- **Working Tree:** Clean at checkpoint
- **Previous Important Checkpoint:** `5a77a29` (`feat: configure separated Vercel deployment support`)

---

## 4. Deployment Configuration Already Implemented

### `client/src/main.tsx`
Current tRPC URL logic:
- Reads `import.meta.env.VITE_TRPC_URL`.
- Falls back to `"/api/trpc"` when unset (preserving same-origin and localhost development).
- Cross-origin credentials mode configured conditionally: `trpcUrl.startsWith("http") ? "same-origin" : "include"`. This prevents modern browsers from rejecting cross-origin requests when wildcards or proxy boundaries are involved.

### `server/_core/index.ts`
CORS middleware updated:
- `ALLOWED_ORIGIN` environment variable supported.
- When `ALLOWED_ORIGIN` is `"*"` or unset, the middleware dynamically reflects the requesting `Origin` header (`_req.headers.origin`) and adds `Vary: Origin`, preventing browsers from rejecting credentialed fetches paired with a literal wildcard `*`.
- Responds to `OPTIONS` preflight requests immediately with `HTTP 204 No Content`.

### `vercel.json`
Current intended routing:
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist/public",
  "installCommand": "pnpm install",
  "rewrites": [
    { "source": "/api/trpc", "destination": "https://akashvani-production.up.railway.app/api/trpc" },
    { "source": "/api/trpc/(.*)", "destination": "https://akashvani-production.up.railway.app/api/trpc/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
The purpose of the explicit `/api/trpc` rewrites is to reverse-proxy tRPC API calls to Railway directly at Vercel's Edge CDN, preventing the SPA catch-all rewrite from returning `index.html` for API queries.

---

## 5. Railway Status
- **Status:** **LIVE and verified operational** at `https://akashvani-production.up.railway.app`.
- Directly tested and verified:
  - `OPTIONS /api/trpc` -> `HTTP 204 No Content`
  - `GET /api/trpc/diva.india.states` -> `HTTP 200 OK` (delivers live multi-state models)
  - `GET /api/trpc/diva.dashboard` -> `HTTP 200 OK`
  - `GET /api/trpc/diva.mapData` -> `HTTP 200 OK`
  - Direct browser verification on `https://akashvani-production.up.railway.app/` rendered the full Akashvani UI, interactive map, location context, and decision panels with 0 console errors.
  - Confirmed: **Manus is NOT required** for the standalone application to render.
- **Configured Railway Environment Variables (names only):**
  - `PORT`
  - `NODE_ENV`
  - `ALLOWED_ORIGIN`
  - `VITE_APP_TITLE`
  - `JWT_SECRET`
  - `OWNER_OPEN_ID`
  *(All secret values omitted for security).*

---

## 6. Vercel Status
- Vercel successfully built the repository at commit `5a77a29`:
  - `pnpm install` succeeded
  - `vite build` succeeded
  - `esbuild` backend bundle succeeded
  - Deployment completed
- Deployment URL inspected: `https://akashvani-2jkhk1d2m-25a31a4353.vercel.app`
- Initially showed:
  `"Workspace data is unavailable"`
  `"No live data is represented in this demonstration workspace."`
- Investigation determined this message originates exclusively from `client/src/pages/Home.tsx` line 174 as the failure fallback when initial tRPC queries (`dashboardQuery`, `mapQuery`, `assessmentQuery`) do not return valid data.

---

## 7. Current Deployment Problem — NOT RESOLVED
After deployment fixes were committed and pushed at `8307385`, Vercel environment configuration was updated.

- **Vercel variable:** `VITE_TRPC_URL`
- **Intended value:** `https://akashvani-production.up.railway.app/api/trpc`
- It was initially created as a **Secret** (which prevents Vite from embedding it at build time). It was deleted and recreated as a standard **Config** environment variable.
- Vercel confirmed: *"Added Environment Variable successfully. A new deployment is needed for changes to take effect."*
- A redeployment was triggered.

> [!IMPORTANT]
> **The Vercel application is STILL reported by the user as not working after this redeployment.**
> - Deployment is **NOT** considered finished.
> - Do **NOT** assume the previous fix solved the issue.
> - Do **NOT** tell the user that the Vercel deployment is working until proven via real browser and network inspection.
> - The next agent session must investigate the live Vercel deployment directly.

---

## 8. Exact Next Investigation
When work resumes, **do NOT immediately make random code or configuration changes.**

Follow this systematic procedure:
1. Open the latest Vercel production deployment in the dashboard/CLI.
2. Confirm which exact Git commit was built and deployed by Vercel.
3. Confirm whether `VITE_TRPC_URL` is present in the Production environment during that specific build.
4. Open the live Vercel application URL.
5. Inspect the browser **Console** and **Network** tabs.
6. Check the actual HTTP requests made to `/api/trpc` or `https://akashvani-production.up.railway.app/api/trpc`.
7. Diagnose the specific root failure:
   - Is Vercel reverse-proxy rewrite returning 404/502/HTML?
   - Is `VITE_TRPC_URL` missing from the compiled client bundle?
   - Is there a CORS error or origin mismatch?
   - Is there a tRPC client batching / serialization failure?
   - Is there a frontend runtime exception preventing rendering?
8. Only make targeted, minimal changes once the exact failing request and error response are identified.

---

## 9. Validation Baseline
Before and after today's deployment changes, the local suite remained completely green:
- **Vitest:** 28 test files, **190/190 passed**
- **TypeScript:** `pnpm check` (`tsc --noEmit`) exited with **0 errors**
- **Build:** `pnpm build` passed cleanly
- **Rule:** Never weaken or delete existing tests.

---

## 10. Important Project Methodology
- **Authoritative Provenance:** Akashvani must never fabricate disaster or geographic data.
- **Allowed Provenance Labels:**
  - `OFFICIAL`
  - `OBSERVED`
  - `LIVE_API`
  - `MODELLED`
  - `DERIVED`
  - `FIXTURE`
  - `USER_UPLOADED`
- **Missing Data Rule:** Missing values must remain strictly `null` or `UNAVAILABLE`, never defaulted to `0`.
- **Integrity Rule:** Do not label modelled or derived data as official. Do not fabricate boundary polygons or hazard values.
- **Core Pipeline:**
  `Raw Data` → `GIS Preprocessing` → `Hazard Assessment` → `Exposure / Vulnerability` → `Carrying Capacity` → `Relocation Priority` → `Interactive Map / Decision Dashboard`

---

## 11. Phase Status
- **Phase 3.2B:** Multi-hazard authoritative baseline implemented.
- **Phase 3.2C:** Published India ADM2 district boundaries active across all target states.
- **Phase 3.3:** Carrying capacity, nearby facility discovery, hazard screening, relocation scoring, and candidate sites active.
- **Phase 3.4:** Micro-settlement spatial exposure logic using Census 2011 / SDMA data implemented; 190 tests passing.
- **Phase 3.4 Cleanup:** Localhost and search stability finalized; layer dropdowns audited and streamlined.
- **Phase 3.5 (Deployment):**
  - Backend on Railway: **WORKING AND LIVE**
  - Frontend on Vercel: **IN PROGRESS (NOT YET RESOLVED)**

---

## 12. Rules for the Next Agent
1. **Read this document thoroughly** before taking any actions.
2. **Preserve existing working functionality** and test suite integrity.
3. **Prefer small, surgical fixes** over broad refactors.
4. **Do not redesign** the application or UI.
5. **Do not introduce fake or mock data.**
6. **Do not commit or push** without explicit user approval.
7. Always run `pnpm test`, `pnpm check`, and `pnpm build` after any modifications.
8. Maintain the decoupled architecture: **Vercel Frontend + Railway Backend**.
9. **Never expose secrets** (JWT secrets, API keys) in reports, chat, or artifacts.
