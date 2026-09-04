/**
 * Akashvani Phase 3.4 — Centralized Data Source Provenance Registry
 *
 * Single source of truth for all dataset metadata, provenance, and licensing.
 * Do NOT scatter source strings across modules — reference this registry instead.
 *
 * Provenance tiers:
 *   OFFICIAL      — Government / regulatory body publication
 *   AUTHORITATIVE — Published academic / intergovernmental dataset
 *   COMMUNITY_MAPPED — OpenStreetMap / community observation
 *   COMMUNITY_MAPPED_CURATED — Subset of OSM curated with verification
 *   DERIVED       — Computed from other sources; not directly observed
 *   LIVE_API      — Retrieved from live API at runtime
 *   FIXTURE       — Hardcoded baseline for testing / fallback
 *   UNAVAILABLE   — Source not yet integrated or retrievable
 */

export type SourceProvenanceType =
  | "OFFICIAL"
  | "AUTHORITATIVE"
  | "COMMUNITY_MAPPED"
  | "COMMUNITY_MAPPED_CURATED"
  | "DERIVED"
  | "LIVE_API"
  | "FIXTURE"
  | "UNAVAILABLE";

export interface DataSourceRecord {
  id: string;
  name: string;
  provider: string;
  url: string | null;
  version: string | null;
  spatialResolution: string | null;
  temporalCoverage: string | null;
  license: string | null;
  retrievedAt: string | null;
  provenanceType: SourceProvenanceType;
  integrationStatus: "INTEGRATED" | "DOCUMENTED_NOT_INTEGRATED" | "PARTIAL";
  notes: string | null;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export const DATA_SOURCE_REGISTRY: Record<string, DataSourceRecord> = {

  // ── Population ──────────────────────────────────────────────────────────────

  CENSUS_2011_DISTRICT: {
    id: "CENSUS_2011_DISTRICT",
    name: "Census of India 2011 — District-Level Population",
    provider: "Registrar General & Census Commissioner of India",
    url: "https://censusindia.gov.in/census.website/data/census-tables",
    version: "Census 2011 (Primary Census Abstracts)",
    spatialResolution: "District",
    temporalCoverage: "Reference date: 1 March 2011",
    license: "Government of India Open Data License (GOIDL)",
    retrievedAt: "2026-09-01",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "Embedded as CENSUS_2011_DISTRICT_POPULATION lookup and per-district population fields in realDistricts.ts",
  },

  CENSUS_2011_HABITATION: {
    id: "CENSUS_2011_HABITATION",
    name: "Census of India 2011 — Village / Habitation Population",
    provider: "Registrar General & Census Commissioner of India",
    url: "https://censusindia.gov.in/census.website/data/census-tables",
    version: "Census 2011 (Village-level Primary Census Abstracts)",
    spatialResolution: "Village / habitation point",
    temporalCoverage: "Reference date: 1 March 2011",
    license: "Government of India Open Data License (GOIDL)",
    retrievedAt: "2026-09-04",
    provenanceType: "OFFICIAL",
    integrationStatus: "PARTIAL",
    notes: "28 verified settlements embedded in habitations.ts for 13 target states. Full 640,000-village dataset not embedded. Habitation coordinates are authoritative SDMA / Census registration points.",
  },

  WORLDPOP_INDIA_100M: {
    id: "WORLDPOP_INDIA_100M",
    name: "WorldPop India Population Grid 2020 (100m)",
    provider: "WorldPop, University of Southampton",
    url: "https://www.worldpop.org/geodata/summary?id=6545",
    version: "2020 constrained individual countries, unconstrained",
    spatialResolution: "~100m raster grid",
    temporalCoverage: "2020",
    license: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    retrievedAt: null,
    provenanceType: "AUTHORITATIVE",
    integrationStatus: "DOCUMENTED_NOT_INTEGRATED",
    notes: "Would provide SPATIAL_POPULATION_INTERSECTION exposure method. Requires server-side raster tile processing (GDAL/GeoTIFF). File size ~400MB compressed. Not integrated in Phase 3.4 due to infrastructure cost. Recommended for Phase 3.5+.",
  },

  HABITATIONS_CURATED: {
    id: "HABITATIONS_CURATED",
    name: "Akashvani Curated Habitation Records — 13-State Baseline",
    provider: "Akashvani / Census of India 2011 / SDMA Directories",
    url: null,
    version: "Phase 3.4 baseline (2026-09-04)",
    spatialResolution: "Village / settlement point",
    temporalCoverage: "Census 2011 (population); SDMA records (2020–2024 for hazard context)",
    license: "Derived from public domain sources",
    retrievedAt: "2026-09-04",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "28 verified settlements covering all 13 target states. Each record has: Census 2011 population (or null if unverified), coordinates from official records, primary hazard exposures from SDMA/Census. Point-based only — no synthetic polygon boundaries.",
  },

  // ── Boundaries ──────────────────────────────────────────────────────────────

  GEOBOUNDARIES_INDIA_ADM2: {
    id: "GEOBOUNDARIES_INDIA_ADM2",
    name: "geoBoundaries India ADM2 District Boundaries",
    provider: "William & Mary geoLab",
    url: "https://www.geoboundaries.org/country/IND/",
    version: "gbOpen ADM2 (ODbL 1.0)",
    spatialResolution: "Administrative district polygon",
    temporalCoverage: "2020 edition (based on Delimitation Order 2008)",
    license: "Open Database License (ODbL 1.0)",
    retrievedAt: "2026-09-01",
    provenanceType: "AUTHORITATIVE",
    integrationStatus: "INTEGRATED",
    notes: "Used as authoritative ADM2 district polygon geometry in realDistricts.ts",
  },

  // ── Hazard ──────────────────────────────────────────────────────────────────

  CWC_HYDROLOGY: {
    id: "CWC_HYDROLOGY",
    name: "Central Water Commission — Flood Forecasting & Gauge Network",
    provider: "Central Water Commission, Ministry of Jal Shakti, Government of India",
    url: "https://ffs.india.gov.in",
    version: "Phase 3.2B embedded baseline (updated 2026)",
    spatialResolution: "River gauge station points + historical inundation polygons",
    temporalCoverage: "Historical flood events 1970–2024; gauge records 1980–present",
    license: "Official Government Data — Public Domain",
    retrievedAt: "2026-09-01",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "Flood hazard layer in Phase 3.2B engine. Live gauge data deferred to Phase 3.5.",
  },

  GSI_LANDSLIDE_ATLAS: {
    id: "GSI_LANDSLIDE_ATLAS",
    name: "ISRO National Landslide Atlas of India (GSI / NRSC)",
    provider: "Geological Survey of India / NRSC / ISRO",
    url: "https://www.gsi.gov.in/webcenter/portal/OCBIS/landslideHazard",
    version: "2023 edition (147 susceptible districts)",
    spatialResolution: "District macro-zonation + historical event points",
    temporalCoverage: "Historical events 1900–2022",
    license: "Official Government Publication",
    retrievedAt: "2026-09-01",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "ISRO district ranking (1–147) and susceptibility class embedded in landslideAtlas.ts",
  },

  IMD_CYCLONE_TRACKS: {
    id: "IMD_CYCLONE_TRACKS",
    name: "IMD Historical Cyclone Best Track Data (IBTrACS)",
    provider: "India Meteorological Department / NOAA IBTrACS",
    url: "https://rsmcnewdelhi.imd.gov.in/report.php?internal_menu=MzQ=",
    version: "IBTrACS v04r00 (1891–2023)",
    spatialResolution: "Track line coordinates (6-hourly positions)",
    temporalCoverage: "1891–2023",
    license: "Public domain / open access",
    retrievedAt: "2026-09-01",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "Historical cyclone tracks in cycloneTracks.ts",
  },

  BIS_SEISMIC_ZONES: {
    id: "BIS_SEISMIC_ZONES",
    name: "BIS IS 1893 (Part 1) — Seismic Zonation of India",
    provider: "Bureau of Indian Standards",
    url: "https://www.bis.gov.in/other/civil/is1893.htm",
    version: "IS 1893:2016 (Part 1) — Sixth Revision",
    spatialResolution: "Administrative seismic zone polygons (Zone II–V)",
    temporalCoverage: "2016 (regulatory)",
    license: "BIS Standard — Regulatory baseline",
    retrievedAt: "2026-09-01",
    provenanceType: "OFFICIAL",
    integrationStatus: "INTEGRATED",
    notes: "Official regulatory seismic hazard zonation. Zone factor Z embedded in seismicZones.ts.",
  },

  // ── Facilities ──────────────────────────────────────────────────────────────

  OSM_OVERPASS: {
    id: "OSM_OVERPASS",
    name: "OpenStreetMap Overpass API",
    provider: "OpenStreetMap Foundation",
    url: "https://overpass-api.de",
    version: "Live API (runtime queries)",
    spatialResolution: "Point / polygon features",
    temporalCoverage: "Continuously updated (OSM community)",
    license: "Open Database License (ODbL 1.0)",
    retrievedAt: null,   // Runtime
    provenanceType: "COMMUNITY_MAPPED",
    integrationStatus: "INTEGRATED",
    notes: "Live facility discovery with 3s timeout and 1h server cache. Capacity = null (OSM does not publish evacuation capacity).",
  },

  OSM_BASELINE_CURATED: {
    id: "OSM_BASELINE_CURATED",
    name: "Akashvani Curated OSM Facility Baseline",
    provider: "OpenStreetMap / Akashvani curation",
    url: null,
    version: "Phase 3.3 baseline (2026-09-04)",
    spatialResolution: "Point features (facility coordinates)",
    temporalCoverage: "2026",
    license: "ODbL 1.0",
    retrievedAt: "2026-09-04",
    provenanceType: "COMMUNITY_MAPPED_CURATED",
    integrationStatus: "INTEGRATED",
    notes: "High-speed fallback for key districts when Overpass is unavailable. Capacity remains null.",
  },

  OSRM_ROUTING: {
    id: "OSRM_ROUTING",
    name: "Project OSRM Driving Route API",
    provider: "Project OSRM / OpenStreetMap",
    url: "http://router.project-osrm.org",
    version: "OSRM v5 (car driving profile)",
    spatialResolution: "Road network (OSM roads)",
    temporalCoverage: "OSM road data (continuously updated)",
    license: "ODbL 1.0",
    retrievedAt: null,   // Runtime
    provenanceType: "LIVE_API",
    integrationStatus: "INTEGRATED",
    notes: "2s timeout, 24h server cache. Returns road distance (km) and travel time (minutes). Falls back to STRAIGHT_LINE_PROXY when unavailable.",
  },
};

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Get a source record by ID. Returns undefined if not found. */
export function getDataSource(id: string): DataSourceRecord | undefined {
  return DATA_SOURCE_REGISTRY[id];
}

/** Get provenance label string for a source ID. */
export function getSourceProvenanceLabel(id: string): string {
  const src = DATA_SOURCE_REGISTRY[id];
  if (!src) return "Source unknown";
  return `${src.name} (${src.provider}) — ${src.provenanceType}`;
}

/** Standard provenance strings used across the codebase. */
export const SOURCE_LABELS = {
  CENSUS_2011_DISTRICT: DATA_SOURCE_REGISTRY.CENSUS_2011_DISTRICT!.name,
  CENSUS_2011_HABITATION: DATA_SOURCE_REGISTRY.CENSUS_2011_HABITATION!.name,
  HABITATIONS_CURATED: DATA_SOURCE_REGISTRY.HABITATIONS_CURATED!.name,
  WORLDPOP_100M: DATA_SOURCE_REGISTRY.WORLDPOP_INDIA_100M!.name,
  OSM_OVERPASS: DATA_SOURCE_REGISTRY.OSM_OVERPASS!.name,
  OSRM_ROUTING: DATA_SOURCE_REGISTRY.OSRM_ROUTING!.name,
} as const;
