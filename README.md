# Akashvani

## Disaster Intelligence & Vulnerability Assessment Platform for India

Akashvani is a GIS-based decision-support platform for disaster intelligence, vulnerability assessment, carrying-capacity analysis, relocation planning, and historical disaster replay across India. The application retains the **DIVA** full form—**Disaster Intelligence & Vulnerability Assessment**—as its domain and methodology terminology; **Akashvani** is the product name.

The platform is designed for India-wide location search and analysis. Assam is the current demonstration and regression-test case because it provides a representative combination of flood exposure, riverine geography, live environmental context, administrative boundaries, and a documented ten-year disaster-history window. Assam is not the limit of the platform’s geographic scope: users can search Indian states, districts, cities, and major localities through the same location-aware workflow.

> **Important:** Akashvani is a decision-support demonstration and analytical platform. It is not an authoritative warning system, emergency-dispatch service, or substitute for official government advisories.

## Capabilities

| Workspace                   | What it provides                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| India location intelligence | Search for Indian states, districts, cities, and major localities; retrieve coordinates, available boundaries, population context, infrastructure context, environmental conditions, and a selected-location screening summary.                                                                                                      |
| Interactive GIS             | Real MapLibre rendering with OpenStreetMap and Esri imagery, location-driven framing, administrative boundaries, population-density and terrain references, live weather coverage, wind context, hazard screening extents, infrastructure, relocation corridors, legends, opacity, base-style, zoom, reset, and fullscreen controls. |
| Hazard and risk assessment  | Interpretable risk scores, severity classifications, indicator contributions, hazard context, trend information, and analyst-reviewable decision-support explanations.                                                                                                                                                               |
| Carrying capacity           | Capacity, access, suitability, constraints, and candidate-site comparison for relocation planning.                                                                                                                                                                                                                                   |
| Relocation prioritization   | Explainable priority ranking, recommended actions, planning corridors, and selected-location decision tables.                                                                                                                                                                                                                        |
| Live environmental context  | Current temperature, precipitation, weather code, forecast conditions, wind speed and gusts, and air-quality indicators from modelled provider responses with timestamps and status disclosures.                                                                                                                                     |
| Assam test case             | Source-labelled Assam state profile, environmental and hazard context, and a 2016–2025 disaster-history panel with unavailable-data handling.                                                                                                                                                                                        |
| Dataset Lab                 | Upload metadata, source-column mapping, geospatial validation, WGS84 readiness checks, duplicate and missing-coordinate diagnostics, parsed geometry persistence, case-study management, replay, comparison, and what-if workflow foundations.                                                                                       |
| Historical replay           | Pre-event and ground-truth separation, predicted-versus-actual comparison modes, timeline comparison, uploaded-data-driven accuracy metrics, and historical analysis reporting.                                                                                                                                                      |
| Reports                     | Downloadable assessment and historical-analysis PDF records with a unified report archive and persisted storage references.                                                                                                                                                                                                          |
| Analyst review              | Grounded narrative generation that uses supplied analysis outputs and falls back to deterministic, reviewable text when the optional LLM provider is unavailable.                                                                                                                                                                    |

## Geographic and data scope

The default dashboard view is currently Assam for demonstration continuity, while the core location contract and map workflow are India-wide. The map can move to a selected state, district, city, or locality and displays the available boundary, population, environment, infrastructure, hazard-screening, and risk context for that selection.

| Data or layer                    | Current source or provider                                                                                                                                                                                                                                                                                                                                                               | Interpretation and limitations                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Indian administrative boundaries | [geoBoundaries India ADM1](https://www.geoboundaries.org/) [1] and [geoBoundaries India ADM2 API](https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/) [2]                                                                                                                                                                                                                        | Reference boundaries for map framing and geographic context; boundary currency and resolution are disclosed in the interface.                                          |
| Basemap imagery                  | [OpenStreetMap](https://www.openstreetmap.org/) [3] and [Esri World Imagery](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) [4]                                                                                                                                                                                                                         | Interactive basemap context. Attribution is shown in the map. Availability depends on the upstream tile services.                                                      |
| Population density               | [WorldPop population-density service](https://worldpop.arcgis.com/) [5]                                                                                                                                                                                                                                                                                                                  | Nationwide raster context, not a current state-total or census replacement. Resolution, reference year, and coverage status are disclosed in the provenance panel.     |
| Physical terrain                 | [ArcGIS World Elevation Terrain service](https://utility.arcgis.com/usrsvcs/servers/6ff9b2ff0b2940c3bd5febf68a643a50/rest/services/WorldElevation/Terrain/ImageServer) [6]                                                                                                                                                                                                               | Terrain reference surface for geographic interpretation, not a geological survey or engineering assessment.                                                            |
| Live weather and forecast        | [Open-Meteo forecast API](https://open-meteo.com/en/docs) [7]                                                                                                                                                                                                                                                                                                                            | Modelled current and forecast environmental context. It is time-stamped and explicitly not an official warning.                                                        |
| Air quality                      | [Open-Meteo air-quality API](https://open-meteo.com/en/docs/air-quality-api) [8]                                                                                                                                                                                                                                                                                                         | Modelled air-quality context including US AQI and PM2.5 where available. Missing provider values remain unavailable rather than fabricated.                            |
| Indian place search and context  | [Nominatim](https://nominatim.openstreetmap.org/) [9] and [Overpass API](https://overpass-api.de/) [10]                                                                                                                                                                                                                                                                                  | Search, reverse-geographic context, nearby infrastructure, and available feature enrichment. Provider responses are treated as external data and validated before use. |
| Assam official context           | [Government of Assam state profile](https://des.assam.gov.in/information-services/state-profile-of-assam) [11], [Assam State Portal](https://assam.gov.in/about-us/393) [12], [Assam disaster-management reports](https://asdma.assam.gov.in/documents/reports-0) [13], and [Assam Water Resources Department](https://waterresources.assam.gov.in/portlets/flood-erosion-problems) [14] | Source-labelled reference context used by the Assam demonstration panels. Source year differences are retained and shown where relevant.                               |

The geology layer is intentionally labelled unavailable until a verified nationwide geology service is integrated. Screening extents for earthquake, landslide, flood, and combined multi-hazard context are analytical references and are not official hazard declarations.

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
