# Akashvani

## Smart India Hackathon (SIH) — Problem Statement 191
**"Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations"**

Akashvani is an evidence-driven, deterministic GIS decision-intelligence platform built for SIH Problem Statement 191. It provides multi-hazard red zone identification, carrying-capacity assessment, vulnerable habitation exposure analysis, safe facility screening, and road-network evacuation routing across India.

### Core Decision Workflow
```
AUTHORITATIVE HAZARD EVIDENCE (CWC / ISRO / IMD / BIS)
        ↓
PHYSICAL HAZARD FOOTPRINT / CORRIDOR
        ↓
VULNERABLE HABITATIONS (Census 2011)
        ↓
POPULATION EXPOSURE & VULNERABILITY
        ↓
DETERMINISTIC RELOCATION PRIORITY (0–100)
        ↓
SUITABLE RELOCATION FACILITY DISCOVERY (OSM)
        ↓
VERIFIED ROAD ROUTE (OSRM Road Network)
        ↓
EXPLAINABLE RELOCATION DECISION & REASON CODES
```

> **Important:** Akashvani is a decision-support demonstration and analytical platform. All risk scores, rankings, and priority formulas are deterministic and traceable to authoritative inputs (CWC floodplains, ISRO landslide atlas, IMD storm tracks, BIS IS 1893:2016 seismic zoning). No machine-learning or LLM hallucinations are used in risk calculations.

## Primary Demonstration Cases

| Case | Location | Hazard Type | Key Capabilities Demonstrated |
| :--- | :--- | :--- | :--- |
| **Case A** | **Dibrugarh, Assam** | **Flood + Seismic** | Brahmaputra riverine corridor footprint, Census 2011 exposed habitations, Zone V regulatory baseline, safe relief shelter discovery, verified OSRM road route (7.2 km, ~18 min). |
| **Case B** | **Wayanad, Kerala** | **Landslide** | ISRO Landslide Atlas Rank #13/147, Chooralmala vulnerable settlement origin, Wayanad District Collectorate safe destination, verified OSRM road route (19.5 km, ~34 min). |
| **Case C** | **Puri, Odisha** | **Cyclone / Coastal** | IMD/IBTrACS coastal storm track buffer (3.59 km proximity), Pentakata fishermen village origin, Puri Cyclone Shelter destination, verified OSRM road route (3.9 km, ~4 min). |
| **Case D** | **Jodhpur, Rajasthan** | **Low / Baseline** | Genuine GREEN classification (20/100), arid baseline, relocation not required, 0 unnecessary evacuation routes, 0 fake destinations. |

## 13 Target States
The platform supports a unified architecture across 13 Indian states:
**Assam (AS), Andhra Pradesh (AP), Maharashtra (MH), Karnataka (KA), Bihar (BR), Jharkhand (JH), Mizoram (MZ), Odisha (OD), Chhattisgarh (CT), Uttar Pradesh (UP), Rajasthan (RJ), Tamil Nadu (TN), and Kerala (KL)**.

## Workspaces & Capabilities

| Workspace | What it provides |
| :--- | :--- |
| **Decision Map (PS191)** | Real MapLibre satellite GIS with Esri World Imagery, administrative ADM2 boundaries, physical hazard footprints, Census 2011 habitations, safe facilities, OSRM evacuation routes, and compact data provenance. |
| **Hazard & Red-Zone Engine** | Deterministic multi-hazard evaluation identifying Primary Hazard Driver, Causal Reasoning, Secondary Hazards, and Authoritative Verified Triggers. |
| **Carrying Capacity** | Strict capacity semantics: displays verified capacity when known, displays `Capacity: Unavailable` when absent; rejects fake occupancy estimates. |
| **Relocation Planning** | Proximity-aware candidate screening: `EMERGENCY_SHELTER` > `RELIEF_CENTRE` > `SCHOOL_EVACUATION_SUPPORT`. Hospitals excluded from mass evacuation. |
| **Data Provenance** | Clear 7-tier classification: `OFFICIAL`, `OBSERVED`, `LIVE_API`, `MODELLED`, `DERIVED`, `FIXTURE`, `UNAVAILABLE`. |

## Technical architecture

Akashvani is a full-stack TypeScript application using React 19 and Vite on the client, Express and tRPC 11 on the server, Drizzle ORM with MySQL/TiDB-compatible persistence, and MapLibre GL for interactive GIS rendering. Shared TypeScript contracts under `shared/` keep location, assessment, historical, and API vocabulary consistent between client and server.

```text
client/                 React pages, dashboard, GIS workspace, Dataset Lab, reports, and UI components
  src/pages/Home.tsx    Main dashboard and workspace orchestration
  src/components/diva/  Map, location search, Assam panels, historical lab, reports, and decision panels
server/                 Express/tRPC procedures and domain services
  routers.ts            Typed API router composition
  diva/                 Analysis, India context, environment, history, narratives, reports, and map data
drizzle/                Database schema, relations, and migration metadata
shared/                 Cross-layer TypeScript contracts and domain types
scripts/                Browser-level verification and diagnostic scripts
```

### Persistence and storage

Structured records such as assessment areas, report metadata, source-artifact metadata, parsed geometry, and historical case-study state are persisted through the database layer. File bytes are handled through object storage references rather than database BLOB columns. Environment secrets are injected by the hosting environment and must not be committed to the repository.

### Authentication and API conventions

The application template includes Manus OAuth integration. Authentication state is resolved by the server context, protected procedures receive the authenticated user, and frontend data access uses typed tRPC hooks under `/api/trpc`. Do not add client-side cookie handling or commit local environment files.

## Local development

### Requirements

Install Node.js 22 or a compatible current Node.js release, pnpm, and access to the configured database and hosting environment variables. The repository uses pnpm as its package manager.

### Install and run

```bash
pnpm install
pnpm dev
```

The development server starts the Vite/Express application using the port supplied by the runtime environment. Do not hardcode a production port.

### Validation commands

```bash
pnpm check   # TypeScript validation
pnpm test    # Vitest unit and integration suite
pnpm build   # Production client and server build
pnpm start   # Start the generated production server
```

Database schema generation and migration are project-managed. When database changes are required, update `drizzle/schema.ts`, generate the migration, review it, and apply it through the project’s managed database workflow rather than issuing destructive ad hoc SQL.

## Environment configuration

The managed environment provides the application’s database, authentication, storage, and built-in API configuration. Common variables include `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID`, `OWNER_NAME`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, and `VITE_FRONTEND_FORGE_API_KEY`. Optional map configuration may use `VITE_MAP_TILE_URL` for an approved imagery provider.

Do not commit `.env`, `.env.local`, provider tokens, database credentials, OAuth secrets, or object-storage credentials. Use the hosting project’s secret-management flow for both development and production values.

## Testing status

The current validated project includes unit, integration, DOM, and browser-level coverage for the India location contract, Assam context, map layers, Dataset Lab parsing and remapping, historical analysis, narratives, reports, archive refresh, selected-location decision panels, and branding. The latest validation recorded **22 Vitest files and 53 passing tests**, a passing TypeScript check, a passing production build, Assam browser verification, and mobile/tablet responsive verification.

The map regression specifically checks that the real MapLibre canvas is present, Assam boundary context is rendered, hazard filters produce a visible state change, and OpenStreetMap requests do not exceed zoom 18. This protects the public OpenStreetMap tile service from the invalid zoom-20 request that was previously observed.

## Authentic-data validation boundary

The Dataset Lab and historical replay implementation supports uploaded source data, but the final end-to-end evidence path using paired `PRE_EVENT` and `GROUND_TRUTH` vector files remains deferred until authentic files are supplied. The application does not fabricate ground truth, reviews, ratings, validation scores, or customer data. Once the paired files are available, the intended validation sequence is:

1. Upload and map both datasets in Dataset Lab.
2. Validate geometry, coordinates, duplicates, missing values, and phase separation.
3. Persist and reload the case study.
4. Run replay, predicted-versus-actual comparison, timeline, and what-if analysis.
5. Verify IoU, precision, recall, F1, area overlap, population variance, infrastructure metrics, and the historical PDF archive/download path.

## Demonstration routes and workflows

The main route opens the India-wide dashboard with Assam selected as the current test case. The search field accepts Indian states, districts, cities, and localities. The map workspace exposes the interactive GIS controls, while the dashboard, risk assessment, site capacity, relocation, Dataset Lab, historical replay, analyst review, and Reports workspaces preserve the broader DIVA workflow.

For a fast smoke test, open the dashboard, confirm the Assam location context and live weather cards, switch to **Map**, open **Layers**, toggle a hazard or nationwide layer, use the search field to select another Indian location, and verify that the map framing and decision context update. Reports generated by the application are available through the Reports workspace when the corresponding workflow has produced a persisted record.

## Responsible use

Akashvani supports analyst review and scenario planning. It should not be used as the sole basis for evacuation, emergency response, land acquisition, compensation, infrastructure safety certification, or public warning decisions. Analysts should review source provenance, timestamps, boundary currency, modelled-data status, local conditions, and current official advisories before acting.

## License

This project declares the MIT license in `package.json`. Review organizational, government-data, map-provider, and upstream-service terms before redistributing deployments or data-derived outputs.

## References

[1]: https://www.geoboundaries.org/ "geoBoundaries"
[2]: https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/ "geoBoundaries India ADM2 API"
[3]: https://www.openstreetmap.org/ "OpenStreetMap"
[4]: https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer "Esri World Imagery"
[5]: https://worldpop.arcgis.com/ "WorldPop population density"
[6]: https://utility.arcgis.com/usrsvcs/servers/6ff9b2ff0b2940c3bd5febf68a643a50/rest/services/WorldElevation/Terrain/ImageServer "ArcGIS World Elevation Terrain"
[7]: https://open-meteo.com/en/docs "Open-Meteo forecast API"
[8]: https://open-meteo.com/en/docs/air-quality-api "Open-Meteo air-quality API"
[9]: https://nominatim.openstreetmap.org/ "Nominatim"
[10]: https://overpass-api.de/ "Overpass API"
[11]: https://des.assam.gov.in/information-services/state-profile-of-assam "Directorate of Economics and Statistics, Assam state profile"
[12]: https://assam.gov.in/about-us/393 "Government of Assam State Portal"
[13]: https://asdma.assam.gov.in/documents/reports-0 "Assam State Disaster Management Authority reports"
[14]: https://waterresources.assam.gov.in/portlets/flood-erosion-problems "Assam Water Resources Department flood and erosion context"
