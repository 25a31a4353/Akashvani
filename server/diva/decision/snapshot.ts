/**
 * ResQ Decision Intelligence Engine V2 — Evidence Snapshot & Temporal Alignment
 * 
 * Captures all contributing evidence sources into an immutable, timestamped snapshot.
 * Enforces temporal consistency: explicitly distinguishes CURRENT, HISTORICAL,
 * REFERENCE, FORECAST, MODELLED, and DERIVED data.
 */

import type {
  EvidenceSourceSnapshot,
  ResQDataSnapshot,
  FreshnessClassification,
} from "../../../shared/decisionEngine";
import type { IndiaLocation } from "../../../shared/india";
import type { EnvironmentalContext } from "../../../shared/india";

export function createEvidenceSnapshot(
  location: IndiaLocation,
  environment?: EnvironmentalContext,
  additionalSources?: Record<string, Partial<EvidenceSourceSnapshot>>
): ResQDataSnapshot {
  const now = new Date().toISOString();
  const snapshotId = `SNAP-${location.id}-${Date.now()}`;
  const sources: Record<string, EvidenceSourceSnapshot> = {};

  // 1. Administrative Boundaries (geoBoundaries / DataMeet)
  sources["admin_boundary"] = {
    sourceId: "admin_boundary",
    sourceName: "geoBoundaries ADM1/ADM2 & Election Commission of India",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2023-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2023-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "Sub-district & District Administrative Polygon",
    scale: "1:250,000",
    geometryLevel: "POLYGON",
    confidence: location.boundary ? "HIGH" : "UNAVAILABLE",
  };

  // 2. Population Baseline (Census 2011 / WorldPop)
  const isCensus = (location.populationSource || "").includes("Census");
  sources["population"] = {
    sourceId: "population",
    sourceName: location.populationSource || "Census of India 2011 Primary Census Abstract",
    sourceType: isCensus ? "OFFICIAL" : "MODELLED",
    sourceTimestamp: isCensus ? "2011-03-01T00:00:00.000Z" : "2020-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: isCensus ? "2011-03-01T00:00:00.000Z" : "2020-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: isCensus ? "HISTORICAL" : "MODELLED",
    resolution: location.population ? (location.category === "District" ? "Census District" : "Habitation/Town") : "Unavailable",
    scale: null,
    geometryLevel: "POINT",
    confidence: location.population !== null ? "HIGH" : "UNAVAILABLE",
  };

  // 3. Terrain & Elevation (Copernicus DEM GLO-90 / Esri World Elevation)
  sources["terrain"] = {
    sourceId: "terrain",
    sourceName: "Copernicus DEM GLO-90 & Esri World Elevation",
    sourceType: "OBSERVED",
    sourceTimestamp: "2021-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2021-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "90-meter DEM raster grid",
    scale: "1:50,000 equivalent",
    geometryLevel: "RASTER",
    confidence: "HIGH",
  };

  // 4. Geology & Bedrock Lithology (GSI Bhukosh 1:2M Seamless Geology)
  sources["geology_lithology"] = {
    sourceId: "geology_lithology",
    sourceName: "Geological Survey of India (GSI) Bhukosh 1:2M Bedrock Geology",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2022-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2022-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "1:2,000,000 national bedrock polygon map",
    scale: "1:2,000,000",
    geometryLevel: "POLYGON",
    confidence: "HIGH",
  };

  // 5. Tectonics & Fault Lineaments (GSI Bhukosh 1:2M Seismotectonic Atlas)
  sources["tectonics_faults"] = {
    sourceId: "tectonics_faults",
    sourceName: "Geological Survey of India (GSI) Seismotectonic Atlas of India (SEISAT)",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2021-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2021-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "1:2,000,000 national tectonic polyline atlas",
    scale: "1:2,000,000",
    geometryLevel: "LINE",
    confidence: "HIGH",
  };

  // 6. Geomorphology (NRSC / GSI Bhuvan 1:50,000 Atlas)
  sources["geomorphology"] = {
    sourceId: "geomorphology",
    sourceName: "NRSC / GSI 1:50,000 National Geomorphological Mapping Scheme",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2020-01-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2020-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "1:50,000 geomorphic landform polygons",
    scale: "1:50,000",
    geometryLevel: "POLYGON",
    confidence: "HIGH",
  };

  // 7. Seismic Zoning Baseline (Bureau of Indian Standards BIS IS 1893:2016)
  sources["seismic_baseline"] = {
    sourceId: "seismic_baseline",
    sourceName: "Bureau of Indian Standards BIS IS 1893:2016 Criteria for Earthquake Resistant Design",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2016-12-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "2016-12-01T00:00:00.000Z",
    validUntil: null,
    freshness: "STATIC_REFERENCE",
    resolution: "National regulatory macro-zonation polygons (Zones II to V)",
    scale: "1:5,000,000",
    geometryLevel: "POLYGON",
    confidence: "HIGH",
  };

  // 8. Flood Monitoring & Hydrology (Central Water Commission CWC)
  sources["cwc_hydrology"] = {
    sourceId: "cwc_hydrology",
    sourceName: "Central Water Commission (CWC) National Flood Forecasting Network",
    sourceType: "OFFICIAL",
    sourceTimestamp: now,
    retrievedAt: now,
    validFrom: now,
    validUntil: null,
    freshness: "CURRENT",
    resolution: "Telemetered river gauge telemetry stations",
    scale: "Point observations",
    geometryLevel: "POINT",
    confidence: "HIGH",
  };

  // 9. Historical Flood Footprints (NRSC Inundation Archive)
  sources["flood_historical"] = {
    sourceId: "flood_historical",
    sourceName: "NRSC / ISRO Disaster Management Support Programme Historical Inundation Footprints",
    sourceType: "HISTORICAL",
    sourceTimestamp: "2022-08-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "1998-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "HISTORICAL",
    resolution: "Multi-year satellite flood inundation extents",
    scale: "1:250,000",
    geometryLevel: "POLYGON",
    confidence: "HIGH",
  };

  // 10. Landslide Atlas & Inventory (ISRO / NRSC & GSI)
  sources["landslide_atlas"] = {
    sourceId: "landslide_atlas",
    sourceName: "ISRO / NRSC Landslide Atlas of India (2023) & GSI Historical Landslide Inventory",
    sourceType: "OFFICIAL",
    sourceTimestamp: "2023-02-01T00:00:00.000Z",
    retrievedAt: now,
    validFrom: "1998-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "HISTORICAL",
    resolution: "147 landslide-prone districts ranking & historical event ground zero coordinates",
    scale: "District ranking & point events",
    geometryLevel: "POINT",
    confidence: "HIGH",
  };

  // 11. Weather Telemetry & IMD Warnings
  if (environment) {
    const hasImdWarning = Boolean(environment.imdWarning);
    sources["weather_telemetry"] = {
      sourceId: "weather_telemetry",
      sourceName: hasImdWarning ? `India Meteorological Department (IMD) Nowcast: ${environment.imdWarning?.headline}` : "Open-Meteo Numerical Meteorological Model",
      sourceType: hasImdWarning ? "OFFICIAL" : "MODELLED",
      sourceTimestamp: environment.observedAt || now,
      retrievedAt: now,
      validFrom: environment.observedAt || now,
      validUntil: environment.imdWarning ? environment.imdWarning.validUpto : null,
      freshness: hasImdWarning ? "CURRENT" : "MODELLED",
      resolution: hasImdWarning ? "IMD district meteorological bulletin" : "Global 0.1° numerical weather grid",
      scale: null,
      geometryLevel: "POINT",
      confidence: environment.temperatureC !== null ? "HIGH" : "UNAVAILABLE",
    };
  }

  // 12. Facilities & Shelters (OpenStreetMap / Verified Registers)
  sources["facilities_osm"] = {
    sourceId: "facilities_osm",
    sourceName: "OpenStreetMap Community Geographic Database (Facility Points)",
    sourceType: "OBSERVED",
    sourceTimestamp: now,
    retrievedAt: now,
    validFrom: "2024-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "CURRENT",
    resolution: "Geolocated building nodes / polygons",
    scale: "1:1,000",
    geometryLevel: "POINT",
    confidence: "MEDIUM", // Location is known, capacity is unverified
  };

  // 13. Road Routing Network (Project OSRM Driving Engine)
  sources["road_network"] = {
    sourceId: "road_network",
    sourceName: "Project OSRM Driving Engine / OpenStreetMap Road Graph",
    sourceType: "DERIVED",
    sourceTimestamp: now,
    retrievedAt: now,
    validFrom: "2024-01-01T00:00:00.000Z",
    validUntil: null,
    freshness: "CURRENT",
    resolution: "Routable topological road network",
    scale: "Road centerline",
    geometryLevel: "LINE",
    confidence: "HIGH",
  };

  // Apply any custom additional source overrides
  if (additionalSources) {
    for (const [k, v] of Object.entries(additionalSources)) {
      if (sources[k]) {
        sources[k] = { ...sources[k], ...v } as EvidenceSourceSnapshot;
      }
    }
  }

  // Correlated evidence groups to prevent double counting
  const evidenceGroups: Record<string, string[]> = {
    flood_group: ["cwc_hydrology", "flood_historical"],
    geotechnical_group: ["geology_lithology", "geomorphology", "terrain"],
    tectonic_seismic_group: ["seismic_baseline", "tectonics_faults"],
    atmospheric_group: ["weather_telemetry"],
  };

  return {
    snapshotId,
    timestamp: now,
    sources,
    evidenceGroups,
  };
}
