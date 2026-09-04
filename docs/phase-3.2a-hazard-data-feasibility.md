# Phase 3.2A — Hazard Data Research & Integration Feasibility Audit
**Technical Architecture, Source Verification, and Feasibility Assessment for Multi-Hazard Real Data Integration**

---

## 1. Executive Summary

Akashvani has established a stable, Manus-independent, multi-state real data foundation across 13 Indian states in Phase 3.1. All 71 tests pass, TypeScript compiles with zero errors, and strict missing-data semantics are in effect.

**Phase 3.2A** is an architectural and source-verification research audit. In strict accordance with the Phase 3.2A guidelines:
- **No application code or functionality is modified in this phase.**
- **No fake datasets, synthetic polygons, or arbitrary risk values are created.**
- **Modelled screening layers are strictly distinguished from authoritative government hazard maps.**
- **Existing working layers and fixtures remain untouched.**

This document provides a comprehensive feasibility analysis of authoritative Indian geospatial datasets across **10 hazard categories** and **13 target states**, defining the exact technical specifications, coordinate systems, access methods, spatial query mechanics, and data models required for Phase 3.2B implementation.

---

## 2. Complete Hazard Source Inventory (Task 1)

The following inventory details realistic candidate datasets across all 10 hazard categories, evaluating technical accessibility, coverage, licensing, and integration feasibility:

| Hazard | Source Organization | Dataset Name | Official / Scientific Source | URL | Data Type | Observed / Forecast / Modelled / Derived | Raster / Vector / Point / Grid | Spatial Resolution | Temporal Coverage | Update Frequency | India Coverage | Target-State Coverage (13 States) | API Available? | WMS Available? | WFS Available? | Download Available? | Authentication Required? | Public Access? | Likely Integration Difficulty | Provenance Quality | Recommended for Akashvani? | Reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Flood** | NRSC / ISRO | Bhuvan Flood Hazard Zonation (Multi-year inundation) | Official (NRSC/ISRO) | `https://bhuvan.nrsc.gov.in/` | Thematic GIS Layer | Observed (Satellite SAR/Optical composite) | Vector (Polygon) / WMS Raster | 30m - 50m | 1998–2024 annual flood series | Annual / Event-based | Yes (Major flood basins) | AS, BR, UP, OD, AP, KL, MH, TN | No direct public REST API | Yes (Bhuvan OGC WMS) | Restricted | Bulk download restricted; map viewing open | Yes for bulk; No for public viewer | Public View; WMS token-based | Moderate (WMS proxy or digitized regional baseline) | HIGH (Authoritative national space agency) | **MUST INTEGRATE** | True ground-truth multi-year inundation frequency polygons. |
| **Flood** | CWC / NWIC | Central Water Commission Flood Forecast & Gauge Levels | Official (Ministry of Jal Shakti) | `https://ffs.india-water.gov.in/` & `https://india-water.gov.in/ffs/` | Hydro-meteorological Gauge Observations | Observed & Forecast (Gauge levels, warning, danger, HFL) | Point (Gauge stations) | Gauge station points (338+ national stations) | Current year + historical extremes | 3-hourly during monsoon | National river basins | All 13 states | Semi-documented JSON endpoints | No | No | CSV/XLS export on portal | No (Public portal) | Yes | Moderate (Server-side gauge fetcher & station mapping) | HIGH (Authoritative national river regulatory agency) | **MUST INTEGRATE** | Provides real-time water levels vs Warning/Danger/HFL thresholds. |
| **Flood** | Google Research / CWC Partner | Google Flood Forecasting API | Modelled / Scientific Partnership | `https://floodforecasting.apis.google.com/` | Hydrological Modelled Inundation & Alert | Modelled & Short-term Forecast (1-7 days) | Vector (Polygons & gauge points) | Variable (gauge reach) | 2020–present | Daily | Selected river basins | High in AS, BR, UP, OD | Yes (REST API) | No | No | JSON via API | Yes (API Key required) | Developer signup required | Low-Moderate | MEDIUM-HIGH (Validated with CWC benchmarks) | **SHOULD INTEGRATE** | High-resolution reach alerts where official feeds lack live APIs. |
| **River Erosion** | ASDMA / Brahmaputra Board | Historical Riverbank Erosion & Embankment Vulnerability | Official (Assam State Disaster Management Authority & Brahmaputra Board) | `https://asdma.assam.gov.in/` | Vector & Administrative Surveys | Observed & Derived (Bankline migration) | Vector (LineString / Polygon) | 1:50,000 / Village level | 1954–2023 cumulative | Multi-annual | Assam & Brahmaputra valley | AS (Primary), BR/UP (Ganga system partial) | No | No | No | PDF reports / Atlas downloads | No | Yes | Moderate (Digitized baseline geojson) | HIGH (State statutory disaster agency) | **MUST INTEGRATE** | Prevents conflation of erosion with inundation. |
| **Landslide** | NRSC / ISRO | Landslide Atlas of India | Official (NRSC/ISRO) | `https://www.isro.gov.in/` & `https://bhuvan.nrsc.gov.in/` | Comprehensive Landslide Inventory & Risk Database | Observed (Satellite & field verified event database) | Point & District Ranking Vector | Point coordinates + 147 district vulnerability rankings | 1998–2022 (80,000+ landslides) | Climatological baseline / Periodic | Hilly regions of India | KL, MZ, AS, MH, KA, TN (all 6 hilly states) | No | Yes (Bhuvan Disaster Services) | Restricted | PDF Atlas public; shapefile via Bharatlas / academic mirrors | No for PDF/mirrors | Yes | Low-Moderate (Static district index + key event point GeoJSON) | HIGH (Authoritative national landslide repository) | **MUST INTEGRATE** | Golden standard for historical landslide validation. |
| **Landslide** | GSI (Geological Survey of India) | National Landslide Susceptibility Mapping (NLSM) | Official (Ministry of Mines) | `https://bhukosh.gsi.gov.in/` | Macro-scale Susceptibility Zonation | Modelled / Physical-heuristic (Slope, lithology, structure) | Vector / Raster (High, Moderate, Low zones) | 1:50,000 scale | 2014–2020 coverage | Static baseline | 4.2 lakh sq km hilly terrain | KL, MZ, AS, MH, KA, TN | No | Intermittent WMS on Bhukosh | No | Restricted / Request-based | Yes for GSI portal | Viewing portal open; raw download restricted | High (WMS uptime unreliable; use curated vector extraction) | HIGH (National geological authority) | **SHOULD INTEGRATE** | Differentiates slope failure susceptibility. |
| **Cyclone** | IMD / RSMC New Delhi | Cyclone e-Atlas & Best Track Archives | Official (India Meteorological Department) | `https://rsmcnewdelhi.imd.gov.in/` | Cyclone Track History & Intensity | Observed (Post-storm verified best tracks) | Vector (LineString & Point) | 0.1° / 3-6 hr track points | 1891–2024 (130+ years) | Seasonal / Post-event | North Indian Ocean (Bay of Bengal & Arabian Sea) | AP, OD, TN, MH, KL (all coastal states) | No public JSON API | No | No | Tabular / Text download | No | Yes | Moderate (Pre-processed GeoJSON track database) | HIGH (WMO designated regional specialized centre) | **MUST INTEGRATE** | Fundamental for coastal cyclone risk and Historical Lab. |
| **Cyclone** | NOAA / NCEI | IBTrACS (International Best Track Archive for Climate Stewardship) | Scientific (NOAA / IMD partner) | `https://www.ncei.noaa.gov/products/international-best-track-archive` | Global Cyclone Best Track Database | Observed / Reanalyzed | Vector (Shapefile / GeoJSON / NetCDF) | Precise track coordinates & central pressure/wind | 1848–present | Annual update | North Indian Ocean | All 5 coastal target states | Yes (HTTP/FTP download) | No | No | Direct open download | No | Yes | Low (Standard GeoJSON format) | HIGH (Global scientific benchmark) | **MUST INTEGRATE** | Clean, ready-to-use GIS geometries for cyclone paths. |
| **Storm Surge** | INCOIS | Coastal Vulnerability Index (CVI) & Multi-Hazard Mapping | Official (Ministry of Earth Sciences) | `https://incois.gov.in/` | Coastal Exposure & Storm Surge Hazard | Modelled / Observed (ADCIRC/SLOSH coastal models) | Vector (Coastal segment polygons/lines) | 1 km coastal segments | Climatological baseline | Multi-annual | Entire 7,516 km Indian coastline | AP, OD, TN, MH, KL | No | Yes (INCOIS Ocean Web Services) | No | Technical reports / Viewers | No | Yes | Moderate (Coastal segment vector extraction) | HIGH (National oceanographic authority) | **MUST INTEGRATE** | Grounded coastal vulnerability and storm surge buffer. |
| **Drought** | DST / IIT / IISc | National Climate Vulnerability Assessment (Common Framework) | Official (Department of Science & Technology) | `https://dst.gov.in/` | Standardized IPCC AR5 District Vulnerability Index | Derived / Analytical composite (Sensitivity, Exposure, Adaptive Capacity) | Tabular / Administrative District Vector | District level (612 districts) | 2021 baseline | Multi-annual | Pan-India | All 13 target states | No | No | No | PDF / Open Government Data table | No | Yes | Low (Direct mapping to district boundaries) | HIGH (Cabinet-endorsed national assessment) | **MUST INTEGRATE** | Authoritative comparative vulnerability baseline. |
| **Drought** | MNCFC / MoA&FW | NADAMS (National Agricultural Drought Assessment and Monitoring System) | Official (Ministry of Agriculture & Farmers Welfare) | `https://ncfc.gov.in/` | Satellite Agricultural Drought Index | Observed & Derived (NDVI, NDWI, Soil Moisture, Rainfall) | Vector (District / Sub-district) & Raster | Sub-district / District | 2006–present | Bi-weekly during Kharif/Rabi | 14 drought-prone states | RJ, KA, MH, AP, TN, JH, CT, BR, UP, OD | No | Yes (Internal) | No | Periodic bulletin PDFs | No | Yes (Reports) | Moderate (District seasonal vulnerability mapping) | HIGH (National agricultural remote sensing centre) | **SHOULD INTEGRATE** | Captures agricultural drought vs meteorological drought. |
| **Extreme Heat** | IMD | IMD High-Resolution Gridded Daily Temperature | Official (IMD Pune) | `https://imdpune.gov.in/` | Gridded Temperature Climatology & Extremes | Observed (Interpolated station network) | Grid (0.5° × 0.5° / 1° × 1° Binary/NetCDF) | ~50 km grid | 1951–present | Daily / Annual | Pan-India | All 13 target states | No open REST | No | No | Data request / NetCDF archive | Registration required for bulk | Yes | Moderate (Pre-compiled heatwave frequency climatology) | HIGH (National meteorological service) | **MUST INTEGRATE** | Baseline for extreme heat (>40°C, >45°C days per year). |
| **Extreme Heat** | NDMA / States | Heat Action Plan (HAP) Designated Vulnerability Zones | Official (NDMA & State SDMAs) | `https://ndma.gov.in/` | Administrative Heatwave Action Classification | Policy / Derived | Vector (District level) | District level | 2016–2024 updates | Annual | Selected heatwave states | RJ, UP, BR, CT, OD, AP, MH, JH | No | No | No | PDF reports | No | Yes | Low (Tabular district attribute) | HIGH (Statutory disaster planning mandate) | **SHOULD INTEGRATE** | Directly correlates with operational mitigation priorities. |
| **Seismic** | BIS / BMTPC / NDMA | Seismic Zonation of India (IS 1893:2016) | Official (Bureau of Indian Standards / BMTPC) | `https://www.bmtpc.org/` & `https://bis.gov.in/` | Seismic Hazard Zonation Map (Zones II to V) | Modelled / Regulatory standard | Vector (Polygon) | 1:1,000,000 / District level | Regulatory standard (current) | Decadal revision | Pan-India | All 13 target states (Zone V in AS, MZ) | No | No | No | PDF / Digitized GIS vector | No | Yes | Low (Standard administrative & polygon layer) | HIGH (Legally binding national engineering code) | **MUST INTEGRATE** | Essential regulatory foundation for seismic risk. |
| **Seismic** | NCS / MoES | National Centre for Seismology Historical Earthquake Catalog | Official (Ministry of Earth Sciences) | `https://seismo.gov.in/` | Real-time & Historical Earthquake Catalog | Observed (Seismograph network) | Point (Epicenters with magnitude, depth) | Epicentral coordinates (M2.5+) | 1505–present | Near-real-time (Daily) | Pan-India & South Asia | All 13 states | RSS / JSON feed on website | No | No | CSV download available | No | Yes | Low (GeoJSON point collection) | HIGH (Official seismological monitoring network) | **SHOULD INTEGRATE** | Powers seismic ground-truth and historical replay. |
| **Wildfire** | FSI (Forest Survey of India) | Van Agni 2.0 & Forest Fire Danger Rating System (FFDRS) | Official (Ministry of Environment, Forest & CC) | `http://vanagniportal.fsiforestfire.gov.in/` | Satellite Fire Detections & Fire Weather Index | Observed (MODIS/SNPP-VIIRS) & Modelled (FWI) | Point (Hotspots) & Raster/Vector (Danger zones) | 375m (VIIRS) / Forest beat level | 2004–present | Real-time (multiple daily passes) | Pan-India forested areas | Forest regions in CT, OD, JH, MH, AS, MZ, KL | Internal WMS | Yes (State forest departments) | No | KML / CSV downloads | Yes for agency WMS; Open for KML alerts | Public KML/CSV alerts | Moderate (API wrapper or periodic hotspot sync) | HIGH (National forest survey agency) | **OPTIONAL** | High value for forest interfaces; lower for urban hab. |
| **Extreme Rainfall** | IMD Pune | IMD 0.25° × 0.25° Daily Gridded Rainfall Dataset | Official (IMD National Data Centre) | `https://imdpune.gov.in/` | High-Resolution Gridded Precipitation Climatology | Observed (Interpolated rain gauge network) | Grid (0.25° × 0.25° ~27 km NetCDF/Binary) | ~27 km grid | 1901–present | Daily / Annual | Pan-India landmass | All 13 target states | No direct REST | No | No | Public download via portal/registration | Registration | Yes | Moderate (Pre-compute return periods / IDF thresholds) | HIGH (National benchmark precipitation series) | **MUST INTEGRATE** | Authoritative climatological rainfall return periods. |
| **Extreme Rainfall** | Open-Meteo | Open-Meteo Weather Forecast & Reanalysis API | Scientific / Commercial Composite (ECMWF, DWD, NOAA) | `https://open-meteo.com/` | Real-time & 5-Day Numerical Weather Prediction | Modelled / Live API | Point / Regular Grid (0.1°) | ~11 km | Current + 5-day forecast | Hourly / 6-hourly | Global / India | All 13 target states | Yes (REST JSON) | No | No | JSON API | No (within rate limits) | Yes | Already integrated in Akashvani | HIGH (Operational model composite) | **RETAIN AS LIVE FEED** | Provides real-time weather & 5-day outlook. |

---

## 3. Detailed Hazard Domain Analyses

### 3.1 Flood Hazard Analysis (Task 2)
- **Authoritative Inundation Layers**:
  - **NRSC/ISRO Bhuvan**: Provides multi-year flood hazard layer maps categorized into 5 frequency classes (Zone 1: Very Low to Zone 5: Very High / Chronically Flooded).
  - **Technical Accessibility**: Bhuvan provides WMS endpoints (`https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms`), but external requests are frequently throttled or require institutional tokens. For Phase 3.2B, the optimal approach is a **pre-vectorized regional flood hazard GeoJSON** derived from published Bhuvan hazard zonation for key river basins.
- **Real-Time River Gauging**:
  - **CWC Flood Forecasting Site (FFS)** monitors 338+ national hydrological stations. Each station tracks:
    - `Current Water Level (m)`
    - `Warning Level (m)`
    - `Danger Level (m)`
    - `Highest Flood Level (HFL) (m)` and date of occurrence.
  - **Feasibility**: High value for Assam (Brahmaputra at Dibrugarh, Guwahati, Tezpur), Bihar (Ganga at Patna, Kosi at Baltara), UP (Ganga, Yamuna, Ghaghara), and Odisha (Mahanadi).
- **Target States Coverage**:
  - Assam, Bihar, UP, Odisha, AP have full CWC and Bhuvan coverage. Kerala floodplains (Periyar, Pamba) are mapped post-2018.

### 3.2 River-Bank Erosion Analysis (Task 3)
- **The Physical Phenomenon**: Riverbank erosion in alluvial braided systems (notably the Brahmaputra in Assam and Kosi in Bihar) is physically distinct from seasonal submergence. While floodwaters recede, bank erosion causes permanent land loss, destroying habitations and infrastructure.
- **Existing Sources**:
  - **Assam State Disaster Management Authority (ASDMA)** and the **Brahmaputra Board**: Publish historical bankline migration atlases documenting bank retreat rates exceeding 100–200 meters/year in chronically eroded reaches (e.g. Majuli, Dhemaji, Morigaon, South Salmara).
  - **Ganga Flood Control Commission (GFCC)**: Documents river migration in Malda/Murshidabad and Bihar (Kosi avulsion corridor).
- **Architectural Decision**: **Erosion MUST be modeled as a distinct hazard layer**, not merged into general flood hazard. A vector line layer indicating `Active Bank Erosion Reach` with buffer corridors (100m, 250m, 500m) will represent physical land-loss exposure.

### 3.3 Landslide Hazard Analysis (Task 4)
- **Authoritative Baselines**:
  - **ISRO Landslide Atlas of India (2023)**:
    - Documents 80,000+ landslides mapped between 1998 and 2022 across 147 districts in 17 states/UTs.
    - District vulnerability ranking: Ranks districts based on landslide exposure (e.g. Rudraprayag, Tehri Garhwal in Himalayas; Wayanad, Idukki, Kozhikode in Kerala; Nilgiris in Tamil Nadu; Aizawl in Mizoram).
  - **Geological Survey of India (GSI) NLSM**:
    - National Landslide Susceptibility Mapping at 1:50,000 scale covering 4.2 lakh sq km.
    - Classifies terrain into High, Moderate, and Low susceptibility zones.
- **Historical Lab Ground-Truth Usability**:
  - Key historical events (Wayanad Chooralmala 2024, Malin Pune 2014, Kavalappara 2019, Aizawl Cyclone Remal 2024) have verified coordinates and extents that provide ground-truth targets for spatial accuracy validation in Historical Lab.

### 3.4 Cyclone & Storm Surge Analysis (Tasks 5 & 6)
- **Historical Tracks Vectorization**:
  - **IMD RSMC New Delhi & NOAA IBTrACS**: Provide standardized best-track coordinates, minimum central pressure, and sustained maximum wind speeds at 3–6 hour intervals.
  - **Representation**: Polyline tracks with point nodes representing intensity categories:
    - Depression (DD): < 61 km/h
    - Cyclonic Storm (CS): 62–88 km/h
    - Severe Cyclonic Storm (SCS): 89–117 km/h
    - Very Severe Cyclonic Storm (VSCS): 118–166 km/h
    - Extremely Severe Cyclonic Storm (ESCS): 167–221 km/h
    - Super Cyclonic Storm (SuCS): > 222 km/h
- **Coastal Storm Surge & Inundation**:
  - **INCOIS Coastal Vulnerability Index (CVI)**: Maps coastal segments based on tidal range, wave height, coastal slope, shoreline change rate, geomorphology, and relative sea-level rise.
  - **Location-Level Exposure**: Combining elevation (Copernicus DEM 90m) + distance to shoreline + coastal vulnerability class provides an objective, transparent storm surge exposure calculation without synthetic flood polygons.

### 3.5 Drought Hazard Analysis (Task 7)
- **Multi-Dimensional Approaches**:
  - **Meteorological Drought**: IMD Standardized Precipitation Index (SPI) tracking 3-month and 6-month rainfall deficits.
  - **Agricultural Drought**: MNCFC NADAMS tracking vegetation condition index (VCI), soil moisture, and crop stress.
  - **Systemic Vulnerability**: DST Common Framework drought vulnerability component.
- **Recommendation**: Drought is an administrative and regional hazard. It should be represented as a **District-Level Vulnerability Index** with a 3-tier rating (`High`, `Moderate`, `Low`) rather than a localized GIS polygon.

### 3.6 Extreme Heat Analysis (Task 8)
- **Climatological Baseline vs Real-Time Conditions**:
  - Real-time heat: Sourced from Open-Meteo / IMD daily temperature observations (already live in Akashvani).
  - Long-term Hazard: Sourced from IMD Pune Heatwave Climatology (average number of heatwave days per season, 95th percentile summer temperatures).
  - **Key Distinction**: An area experiencing 32°C today is not in immediate danger, but if it is in an IMD-classified severe heatwave zone (e.g., Western Rajasthan, Bundelkhand UP, Vidarbha MH), its structural adaptation risk is high.

### 3.7 Seismic Hazard Analysis (Task 9)
- **National Regulatory Standard**:
  - **Bureau of Indian Standards IS 1893 (Part 1): 2016**:
    - **Zone V (Very High Damage Risk, Zone Factor Z = 0.36)**: Northeast India (Assam, Mizoram), parts of J&K, Himachal, Uttarakhand, Rann of Kutch, North Bihar.
    - **Zone IV (High Damage Risk, Z = 0.24)**: Remaining parts of Gangetic Plain, Delhi, coastal Maharashtra.
    - **Zone III (Moderate Damage Risk, Z = 0.16)**: Western Ghats, central Deccan.
    - **Zone II (Low Damage Risk, Z = 0.10)**: Stable peninsular shield.
- **Recommendation**: High feasibility. Clean vector polygon boundaries covering the entire country are readily available and legally authoritative.

### 3.8 Forest Fire / Wildfire Analysis (Task 10)
- **FSI Van Agni Geo-portal**:
  - Detects near-real-time hotspots via MODIS and SNPP-VIIRS (375m).
  - Tracks Fire Weather Index (FWI) pre-fire alerts.
- **Evaluation**: Forest fire risk is concentrated in specific forested tracts (Chhattisgarh, Odisha, Jharkhand, Western Ghats). While high quality, it is a specialized ecological hazard. **Recommendation: OPTIONAL / TIER 3**.

### 3.9 Extreme Rainfall Analysis (Task 11)
- **IMD 0.25° Gridded Rainfall Climatology**:
  - Defines 24-hour extreme precipitation return periods (e.g. 50-year, 100-year rainfall thresholds).
  - Open-Meteo supplies live precipitation and 5-day forecasts; the historical IMD baseline supplies the context to determine whether a 100mm forecast constitutes an extreme anomaly for that specific coordinate.

---

## 4. GIS Format, CRS, and MapLibre Compatibility (Task 12)

| Format / Protocol | Compatibility with MapLibre GL JS | Performance Characteristics | Optimal Use Case in Akashvani | Limitations / Considerations |
|---|---|---|---|---|
| **GeoJSON (Vector)** | Native (`map.addSource('...', { type: 'geojson' })`) | Excellent up to ~5 MB (~15,000 vertices). Degrades above 15 MB without clustering/tiling. | Administrative boundaries, focus district polygons, CWC gauge points, cyclone track polylines, historical landslide points. | Large files must be simplified or served via viewport bbox filter. |
| **Vector Tiles (MVT / .pbf)** | Native (`type: 'vector'`) | Ultra-high performance for large national datasets (e.g., all-India seismic zones, national flood hazard). | Nationwide hazard layers with millions of vertices. | Requires pre-generating tilesets (via Tippecanoe) or hosting on tile server. |
| **OGC WMS (Raster Web Map Service)** | Native (`type: 'raster'`, tile URL) | Excellent client performance; server renders image tiles. | Bhuvan Flood Hazard, INCOIS coastal overlays, FSI fire maps. | Dependent on external government server uptime; CORS issues common without reverse proxy. |
| **Cloud-Optimized GeoTIFF (COG)** | Supported via client GeoTIFF parsers (geotiff.js) or server tile proxy | High bandwidth if served raw; best if proxied to PNG raster tiles. | Digital Elevation Models (DEM), gridded rainfall anomalies, population density rasters. | Direct browser rendering of multi-band GeoTIFFs causes UI stutter; use server-side point sampling. |
| **Tabular / CSV with Lat/Lon** | Parsed in server / client to GeoJSON Point FeatureCollection | Instantaneous for thousands of points. | Gauge stations, earthquake catalogs, landslide inventories. | Must have valid WGS84 coordinates. |

### Datasets That CANNOT Be Loaded Directly into MapLibre:
1. **WorldPop 100m National GeoTIFF (1.72 GB)**: Exceeds browser memory; must use ArcGis 1km image service or server-side zonal sampler.
2. **Raw Multi-Gigabyte NetCDF4 / GRIB files (IMD Gridded Temp/Rain)**: Must be pre-processed server-side into lightweight GeoJSON or lookup matrices.
3. **Complex Unsimplified GSI Cadastral Geometries**: Raw national GSI shapefiles contain millions of unindexed polygons; must be simplified to 1:50,000 web resolution.

---

## 5. Spatial Query & Normalization Architecture (Tasks 13 & 14)

### 5.1 Spatial Query Execution Pipeline

```
User Query / Location Click
           │
           ▼
[Location Coordinates: WGS84 Lat, Lon]
           │
     ┌─────┴────────────────────────────────┐
     ▼                                      ▼
[Polygon Query Pipeline]              [Point / Line Buffer Pipeline]
  • Point-in-Polygon (Turf.js)          • Radius Distance Query (Turf.js)
  • Seismic Zone Polygon                • Nearest Major River & CWC Gauge
  • Flood Hazard Susceptibility Zone    • Distance to Active Erosion Reach
  • Coastal Surge Inundation Zone       • Distance to Historical Cyclone Track
     │                                      │
     └──────────────────┬───────────────────┘
                        ▼
            [Raster Grid Sampling]
              • Elevation (DEM 90m)
              • Precipitation Return-Period Exceedance
                        ▼
            [Administrative Composite]
              • DST Common Framework Vulnerability
              • CEEW Climate Vulnerability Index
                        ▼
           [MultiHazardProfile Synthesizer]
              • Strict Provenance Badges
              • Null-Safe Indicators
```

### 5.2 Conceptual Hazard Schema (`HazardObservation`)

```typescript
export interface HazardObservation {
  hazardType:
    | "Riverine Flood"
    | "Riverbank Erosion"
    | "Landslide"
    | "Tropical Cyclone"
    | "Storm Surge"
    | "Agricultural Drought"
    | "Extreme Heatwave"
    | "Seismic"
    | "Extreme Rainfall"
    | "Wildfire";
  
  hazardLevel: "Critical" | "High" | "Moderate" | "Low" | "Unavailable";
  rawNumericValue: number | null; // e.g., 42.5 mm, 140 knots, 0.36g
  rawUnit: string | null;          // "mm", "knots", "g", "meters", "ratio"
  normalizedScore: number | null; // 0 to 100 scale; NULL if missing
  
  geometryType: "Point" | "LineString" | "Polygon" | "AdministrativeDistrict" | "RasterCell";
  distanceToFeatureKm: number | null; // NULL if outside radius, NEVER 0
  
  provenance: {
    sourceOrganization: string;
    datasetName: string;
    sourceType: "OFFICIAL" | "OBSERVED" | "LIVE_API" | "MODELLED" | "DERIVED";
    sourceUrl: string;
    observedAt: string | null;
    temporalCoverage: string;
    spatialResolution: string;
    confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";
    provenanceLabel: string;
    regulatoryStandard?: string; // e.g. "BIS IS 1893:2016"
  };
  
  limitations: string[];
}
```

---

## 6. Official vs. Modelled Classification & UI Badges (Task 15)

To prevent deceptive presentation, every hazard layer in Akashvani must carry an explicit visual badge:

| Classification | Definition | Example Source | Required UI Badge |
|---|---|---|---|
| **OFFICIAL** | Published by a statutory government authority or ministry under formal mandate. | BIS IS 1893 Seismic Code, CWC Water Levels, geoBoundaries ADM1 | `[🏛 OFFICIAL GOVERNMENT SOURCE]` |
| **OBSERVED** | Direct empirical measurement from satellite sensors, gauges, or field surveys. | IMD Weather Station, NRSC Satellite Inundation, NCS Seismograph | `[📡 OBSERVED EMPIRICAL DATA]` |
| **LIVE_API** | Real-time dynamic network request refreshed on query. | Open-Meteo Forecast, CWC 3-Hourly Gauge Level | `[⚡ LIVE API FEED]` |
| **MODELLED** | Numerical simulation or scientific projection based on physical heuristics. | Copernicus DEM 90m, XDI 2050 Built Environment, ADCIRC Surge | `[📊 MODELLED ESTIMATE]` |
| **DERIVED** | Calculated within Akashvani using deterministic multi-source formulas. | Carrying Capacity Score, Screening Priority, Proximity Buffers | `[⚙ AKASHVANI DERIVED SCREENING]` |
| **USER_UPLOADED**| Geospatial data provided by an analyst in Historical Lab. | GeoJSON shapefile uploaded for historical replay | `[📁 USER SUPPLIED DATASET]` |

---

## 7. 13-State × 10-Hazard Coverage Matrix (Task 17)

| State | Flood | Erosion | Landslide | Cyclone | Coastal / Surge | Drought | Heat | Seismic | Wildfire | Extreme Rainfall |
|---|---|---|---|---|---|---|---|---|---|---|
| **Assam (`AS`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (ASDMA/Board) | REAL OFFICIAL (Landslide Atlas) | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone V) | REAL OBSERVED (FSI Van Agni) | REAL OBSERVED (IMD Gridded) |
| **Andhra Pradesh (`AP`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (Delta reaches) | MODELLED (Eastern Ghats) | REAL OFFICIAL (IMD/IBTrACS) | REAL OFFICIAL (INCOIS CVI) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Maharashtra (`MH`)** | REAL OFFICIAL (Bhuvan/CWC) | UNAVAILABLE | REAL OFFICIAL (Landslide Atlas) | REAL OFFICIAL (IMD/IBTrACS) | REAL OFFICIAL (INCOIS CVI) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone III/IV) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Karnataka (`KA`)** | REAL OFFICIAL (Bhuvan/CWC) | UNAVAILABLE | REAL OFFICIAL (Landslide Atlas) | UNAVAILABLE (Inland interior) | REAL OFFICIAL (INCOIS Karavali) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Bihar (`BR`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (Kosi/Ganga Board) | UNAVAILABLE (Plains) | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone IV/V) | UNAVAILABLE | REAL OBSERVED (IMD Gridded) |
| **Jharkhand (`JH`)** | REAL OFFICIAL (CWC Damodar) | UNAVAILABLE | UNAVAILABLE (Plateau) | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Mizoram (`MZ`)** | REAL OFFICIAL (Valley floods) | UNAVAILABLE | REAL OFFICIAL (Landslide Atlas) | UNAVAILABLE (Inland storm) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST Common) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone V) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Odisha (`OD`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (Mahanadi delta) | MODELLED (Eastern Ghats) | REAL OFFICIAL (IMD/IBTrACS) | REAL OFFICIAL (INCOIS CVI) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Chhattisgarh (`CT`)** | REAL OFFICIAL (CWC Mahanadi) | UNAVAILABLE | UNAVAILABLE | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Uttar Pradesh (`UP`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (Ganga/Ghaghara) | UNAVAILABLE | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone III/IV) | UNAVAILABLE | REAL OBSERVED (IMD Gridded) |
| **Rajasthan (`RJ`)** | REAL OFFICIAL (Flash floods) | UNAVAILABLE | UNAVAILABLE | UNAVAILABLE (Inland) | UNAVAILABLE (Inland) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III/IV) | UNAVAILABLE | REAL OBSERVED (IMD Gridded) |
| **Tamil Nadu (`TN`)** | REAL OFFICIAL (Bhuvan/CWC) | UNAVAILABLE | REAL OFFICIAL (Landslide Atlas) | REAL OFFICIAL (IMD/IBTrACS) | REAL OFFICIAL (INCOIS CVI) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone II/III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |
| **Kerala (`KL`)** | REAL OFFICIAL (Bhuvan/CWC) | REAL OFFICIAL (Coastal erosion) | REAL OFFICIAL (Landslide Atlas) | REAL OFFICIAL (Arabian Sea Tracks) | REAL OFFICIAL (INCOIS CVI) | REAL OFFICIAL (DST/MNCFC) | REAL OFFICIAL (IMD Climatology) | REAL OFFICIAL (IS 1893 Zone III) | REAL OBSERVED (FSI) | REAL OBSERVED (IMD Gridded) |

---

## 8. Current Mock Data Audit (Task 19)

| Existing File & Component | Current Content | Purpose | Assessment & Recommendation for Phase 3.2B |
|---|---|---|---|
| [server/diva/fixtures.ts](file:///c:/Users/SHANMUKHESWAR/OneDrive/Desktop/SIH191/Akashvani/server/diva/fixtures.ts) (`getDemoMapData().hazards`) | 3 subsampled bounding polygons for Wayanad, Idukki, Alappuzha | Demonstration hazard overlay in Kerala prototype view | **REMAIN & RELABEL**: Keep as explicit `KERALA REFERENCE FIXTURE` for baseline demo backward compatibility. Do not delete. |
| [server/diva/nationwideMap.ts](file:///c:/Users/SHANMUKHESWAR/OneDrive/Desktop/SIH191/Akashvani/server/diva/nationwideMap.ts) (`sensitivity` features) | 6 hardcoded rectangular/trapezoidal bounding boxes (Himalayan seismic, Kutch seismic, Himalayan landslide, Western Ghats landslide, Ganga-Brahmaputra flood, coastal flood) | National sensitivity screening visualization | **REPLACE IN PHASE 3.2B** with real vector layers: BIS IS 1893:2016 seismic polygons, NRSC Landslide Atlas district polygons, and CWC basin reaches. |
| [client/src/components/diva/AssamStateProfile.tsx](file:///c:/Users/SHANMUKHESWAR/OneDrive/Desktop/SIH191/Akashvani/client/src/components/diva/AssamStateProfile.tsx) | Textual state profile and hazard descriptions for Assam | Operational contextual summary | **RETAIN**: Already source-labelled and factually accurate based on ASDMA publications. |
| [server/diva/historical.ts](file:///c:/Users/SHANMUKHESWAR/OneDrive/Desktop/SIH191/Akashvani/server/diva/historical.ts) | Turf.js geometry comparison (`compareHistoricalGeometry`) | Analytical IoU and precision/recall validation of uploaded vs predicted polygons | **RETAIN**: Math and geometry functions are rigorous and format-agnostic. Ready for ground-truth GeoJSON comparison. |

---

## 9. Recommended Phase 3.2B Stack (Tasks 18 & 22)

To deliver a high-value, rock-solid Phase 3.2 implementation without unnecessary complexity, datasets are categorized into 4 tiers:

### Tier 1: Must Integrate (The Core Foundation)
1. **BIS IS 1893:2016 Seismic Zonation Polygons (Zones II, III, IV, V)**
   - *Why*: Legally binding national standard, 100% pan-India coverage, clean vector format, zero API fragility.
2. **CWC Real-Time Hydrological Gauge Network & Flood Stage Thresholds**
   - *Why*: Authoritative live river monitoring across all major basins (Assam, Bihar, UP, Odisha, AP).
3. **IMD / IBTrACS Historical Cyclone Best Tracks (1891–2024)**
   - *Why*: Comprehensive vector tracks with verified wind and pressure metrics for coastal states.
4. **ISRO / NRSC Landslide Atlas of India (District Vulnerability Rankings & Historical Inventory Points)**
   - *Why*: Authoritative national space agency baseline for Western Ghats and Himalayan states.
5. **DST Common Framework Standardized Climate Vulnerability Index (District Level)**
   - *Why*: Direct government benchmark covering all 13 states across flood, drought, and adaptive capacity.
6. **INCOIS Coastal Vulnerability Index (CVI) & Buffer Segments**
   - *Why*: Physically grounded coastal exposure for all 5 coastal target states.

### Tier 2: Should Integrate (High-Value Extensions)
7. **ASDMA / Brahmaputra Board Riverbank Erosion Reach Corridors (Assam)**
8. **IMD Pune Gridded Rainfall Return Period Climatology (0.25° grid)**
9. **NCS Historical Earthquake Catalog (Points M3.5+)**
10. **NDMA Heat Action Plan Priority Districts Baseline**

### Tier 3: Optional (Post-3.2 Consideration)
11. **FSI Van Agni Real-Time Forest Fire Detections (VIIRS 375m)**
12. **GSI National Landslide Susceptibility Mapping (WMS dependent)**

### Tier 4: Do Not Integrate (Rejected Datasets & Rationale)
- **Raw WorldPop 100m National Raster (1.72 GB)**: *Rejected* due to extreme browser memory load. Replaced by ArcGIS 1km image service.
- **Unverified Third-Party Commercial Risk APIs**: *Rejected* to prevent ungrounded proprietary scores lacking public auditability.
- **Dynamic Unauthenticated Scraping of Bhuvan Web Pages**: *Rejected* due to severe fragility, rate-limiting, and legal terms.

---

## 10. Failure & Fallback Strategy (Task 21)

When a live hazard service or boundary query fails:

```
[Target Hazard Query]
        │
        ▼
Is live authoritative service reachable within 3,500 ms?
        ├── YES ──► Display LIVE OBSERVATION with official provenance badge
        └── NO  ──► Fallback to cached authoritative baseline
                         │
                         ▼
Is cached authoritative baseline available?
        ├── YES ──► Display CACHED BASELINE with timestamp & provenance
        └── NO  ──► Display EXPLICIT "OFFICIAL LAYER UNAVAILABLE" BADGE
                         │
                         ▼
             NEVER DEFAULT TO ZERO RISK (0)
```

The system must never interpret missing data as zero hazard. If flood data is unavailable, the UI badge states:
`"Official flood layer temporarily unavailable — Risk score not computed from flood input"`.

---

## 11. Phase 3.2B Implementation Roadmap (Task 25)

The subsequent Phase 3.2B implementation will be ordered logically to maintain system stability:

1. **Step 1: Core Static Vector Hazard Layers** (Seismic IS 1893, Landslide Atlas districts, INCOIS Coastal buffer).
2. **Step 2: Hydrological Gauge Integration** (CWC stations with Warning/Danger levels).
3. **Step 3: Cyclone Track & Landfall Vector Engine** (IBTrACS North Indian Ocean tracks).
4. **Step 4: Multi-Hazard Spatial Intersector & Normalizer** (`server/diva/hazards.ts`).
5. **Step 5: MapLibre Interactive Layer Toggles & Client Provenance Cards** (`DivaMap.tsx` & UI panels).
6. **Step 6: Automated Test Suite & Multi-State Verification**.
