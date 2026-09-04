# Akashvani Phase 3.2B — Hazard Intelligence Engine: Technical Reference

> **Status**: Production-ready baseline.  
> **Test Coverage**: 109/109 tests passing.  
> **Build**: `pnpm build` exits with code 0.  
> **Date**: September 2026  
> **Scope**: 8 hazard domains · 13 target states · Evidence-backed red-zone classification

---

## 1. Architecture Overview

Phase 3.2B implements the PS 191 core intelligence pipeline:

```
HAZARD EVIDENCE → HAZARD EXPOSURE → RED ZONE IDENTIFICATION → HABITATION EXPOSURE
```

The engine is a pure server-side TypeScript module with no runtime network dependency. All spatial reasoning is performed against embedded, source-cited datasets.

### Module Structure

| File | Purpose |
|------|---------|
| `server/diva/hazards/engine.ts` | Primary spatial query and red-zone scoring engine |
| `server/diva/hazards/riskBridge.ts` | Bridge to existing `buildAssessmentAnalysis` risk engine |
| `server/diva/hazards/data/seismicZones.ts` | BIS IS 1893:2016 seismic zone polygons |
| `server/diva/hazards/data/landslideAtlas.ts` | ISRO Landslide Atlas 2023 rankings and historical events |
| `server/diva/hazards/data/cwcHydrology.ts` | CWC gauge network and historical flood inundation polygons |
| `server/diva/hazards/data/cycloneTracks.ts` | NOAA IBTrACS and IMD Best Track cyclone records |
| `server/diva/hazards/data/coastalErosionDrought.ts` | Active erosion corridors, heatwave zones, drought baselines |
| `server/diva/hazards/data/habitations.ts` | 25 representative habitations across 13 states |

---

## 2. Datasets Integrated

### 2.1 Seismic Hazard

**Source**: BIS IS 1893 (Part 1): 2016 — Criteria for Earthquake Resistant Design of Structures  
**Published by**: Bureau of Indian Standards, New Delhi  
**Reference CRS**: WGS 84 (EPSG:4326)  
**Spatial Resolution**: State + district-level administrative boundary overrides

| Zone | PGA (g) | Representative States |
|------|---------|----------------------|
| V (Very High) | ≥ 0.36 | AS (northeast), JH (Dhanbad belt) |
| IV (High) | 0.24 | JH, BR, MH (Bhuj belt), UP (central) |
| III (Moderate) | 0.16 | KL, KA, AP, TN, MH (coastal) |
| II (Low) | 0.10 | RJ (southern), TN (interior) |

**District overrides**: Ranchi (JH) → Zone III; Kakinada (AP) → Zone III (GSI district records).  
**Deterministic trigger**: Zone IV or V → `[SEISMIC_ZONE_V]` fires → RED zone contribution.

---

### 2.2 Landslide Hazard

#### Rankings Dataset
**Source**: ISRO Landslide Atlas of India, 2023  
**Published by**: National Remote Sensing Centre (NRSC), ISRO, Hyderabad  
**Coverage**: 147 districts across 17 states  
**Metric**: Relative Frequency Score (RFS) per district

Key districts integrated:

| District | State | Rank | Trigger |
|---------|-------|------|---------|
| Aizawl | MZ | 4 | `[ISRO_LANDSLIDE_RANK_TOP15]` |
| Wayanad | KL | 13 | `[ISRO_LANDSLIDE_RANK_TOP15]` |
| Nilgiris | TN | 7 | `[ISRO_LANDSLIDE_RANK_TOP15]` |
| Rudraprayag | UK | 2 | `[ISRO_LANDSLIDE_RANK_TOP15]` |

#### Historical Events Dataset
**Source**: ISRO NRSC Post-Disaster Studies, IMD Event Reports, NDMA Situation Reports  
**Coverage**: 10 verified catastrophic events (5 major; 5 secondary)

| Event | Date | District | State | Deaths |
|-------|------|---------|-------|--------|
| Chooralmala landslide | 2024-07-30 | Wayanad | KL | 400+ |
| Malin landslide | 2014-07-30 | Pune | MH | 151 |
| Pettimudi landslide | 2020-08-06 | Idukki | KL | 70 |
| Irshalwadi landslide | 2023-07-19 | Raigad | MH | 84 |
| Aizawl landslide | 2024-05-08 | Aizawl | MZ | 27 |

**Ground-zero rule**: Query point within 6 km of event epicentre → `CRITICAL` landslide level + `[HISTORICAL_LANDSLIDE_IMPACT]` trigger fires.

---

### 2.3 Flood Hazard

**Source**: CWC National Flood Forecasting Network; Historical Inundation Studies  
**Published by**: Central Water Commission, Ministry of Jal Shakti

#### Gauge Stations (15 key stations)

| Station | River | State |
|--------|-------|-------|
| Neamatighat | Brahmaputra | AS |
| Dibrugarh | Brahmaputra | AS |
| Guwahati | Brahmaputra | AS |
| Patna | Ganga | BR |
| Bahraich | Rapti/Ghaghra | UP |
| Darbhanga | Kosi | BR |
| Naraj (Cuttack) | Mahanadi | OD |
| Vijayawada | Krishna | AP |
| Polavaram | Godavari | AP |
| Nanded | Godavari | MH |
| Cheruthoni | Periyar | KL |

#### Historical Flood Inundation Polygons (6 events)

| Event | Year | River | States | Trigger |
|-------|------|-------|--------|---------|
| Brahmaputra Great Flood | 2022 | Brahmaputra | AS | `[HISTORICAL_FLOODPLAIN]` |
| Bihar Kosi Flood | 2008 | Kosi | BR, UP | `[HISTORICAL_FLOODPLAIN]` |
| Odisha Cyclone Flood | 2021 | Mahanadi | OD | `[HISTORICAL_FLOODPLAIN]` |
| Andhra Godavari Flood | 2022 | Godavari | AP | `[HISTORICAL_FLOODPLAIN]` |
| Kerala Red Alert Flood | 2018 | Periyar/Pampa | KL | `[HISTORICAL_FLOODPLAIN]` |
| Uttarakhand Kedarnath | 2013 | Mandakini | UK | `[HISTORICAL_FLOODPLAIN]` |

The Brahmaputra polygon extends to latitude 27.6° to cleanly encompass Dhemaji district.

---

### 2.4 Cyclone Hazard

**Source**: NOAA IBTrACS v4 + IMD Best Track Dataset  
**Published by**: National Oceanic and Atmospheric Administration; India Meteorological Department

| Storm | Year | Peak Intensity | States Affected |
|-------|------|----------------|----------------|
| Hudhud | 2014 | Cat-4 / 185 km/h | AP, OD |
| Fani | 2019 | Cat-5 / 250 km/h | OD, WB |
| Amphan | 2020 | Cat-5 / 270 km/h | WB, OD |
| Ockhi | 2017 | Cat-3 / 185 km/h | KL, TN |
| Nisarga | 2020 | Cat-2 / 110 km/h | MH |
| Michaung | 2023 | Cat-1 / 90 km/h | AP, TN |

**Coastline proximity rule**: < 200 km → EXTREME cyclone exposure; < 500 km → HIGH.

---

### 2.5 Riverbank Erosion

**Source**: Brahmaputra Board erosion studies; CWC Erosion Susceptibility Maps  
**Published by**: Ministry of Jal Shakti; Brahmaputra Board, Guwahati

| Reach | River | State |
|-------|-------|-------|
| Dhemaji Erosion Reach | Brahmaputra | AS |
| Majuli Island Reach | Brahmaputra | AS |
| Rohmoria Erosion Reach | Brahmaputra | AS |
| North Bihar Kosi Reach | Kosi | BR |

**Trigger**: Point within active erosion corridor → `[ACTIVE_EROSION_CORRIDOR]` (CRITICAL).

---

### 2.6 Extreme Rainfall

**Source**: IMD Extreme Rainfall Statistics (1901–2023)  
**Published by**: India Meteorological Department

Criteria: Annual rainfall > 2500 mm OR event exceeds 200 mm/24h → HIGH/EXTREME designation.  
States with embedded baselines: MZ, KL, MH (Konkan), OD (coastal), AS.

---

### 2.7 Drought

**Source**: DST Climate Vulnerability Atlas 2022 + IMD Agricultural Drought Records  
**Published by**: Department of Science and Technology; IMD

States with HIGH drought baselines: RJ, MH (Vidarbha), KA (northern), AP (Rayalaseema), TN (interior), UP (Bundelkhand).

---

### 2.8 Extreme Heat

**Source**: IMD Heatwave Statistics + NDMA Heat Action Plans  
**Published by**: India Meteorological Department

Districts with embedded EXTREME heatwave designation: Churu (RJ), Bikaner (RJ), Prayagraj (UP), Banda (UP), Nagpur (MH), Wardha (MH), Nalgonda (TS), Vizianagaram (AP), Bolangir (OD), Kalahandi (OD).

---

## 3. Datasets Considered but Rejected

| Dataset | Reason for Rejection |
|---------|---------------------|
| NDVI satellite indices | Live satellite API dependency; offline baseline unavailable |
| MODIS Active Fire data | Real-time dependency; outside Phase 3.2B scope |
| World Risk Index 2023 | Country-level only; insufficient spatial granularity |
| IPCC AR6 downscaled projections | Probabilistic future data; outside evidence scope |
| NASA SRTM DEM (elevation) | Slope analysis deferred to Phase 3.3+ |

---

## 4. Coordinate Reference System

- **Input CRS**: WGS 84 (EPSG:4326)
- **Spatial Model**: Decimal degrees (longitude, latitude)
- **Distance Calculations**: Haversine formula (Earth radius 6371 km)
- **Point-in-Polygon**: Ray-casting algorithm (Jordan curve theorem)
- No projection transformation applied; all spatial queries run in geographic coordinates.

---

## 5. Red-Zone Classification Logic

### 5.1 Domain Weights

| Domain | Weight |
|--------|--------|
| Flood | 0.20 |
| Landslide | 0.20 |
| Cyclone | 0.15 |
| Seismic | 0.15 |
| Erosion | 0.10 |
| Extreme Rainfall | 0.10 |
| Drought | 0.05 |
| Extreme Heat | 0.05 |

Domain score mapping: `CRITICAL→1.0, EXTREME→0.8, HIGH→0.6, MODERATE→0.4, LOW→0.2, UNAVAILABLE→null` (excluded from denominator).

### 5.2 Tier Assignment

| Score | Tier | isRedZone | Meaning |
|-------|------|-----------|---------|
| ≥ 75 | RED | true | Immediate action zone |
| 50–74 | ORANGE | false | High vigilance zone |
| 25–49 | YELLOW | false | Standard monitoring |
| < 25 | LOW | false | Routine baseline |

### 5.3 Deterministic Triggers

Any of these triggers forces RED CRITICAL regardless of composite score:

| Trigger Code | Source Rule |
|-------------|-------------|
| `[SEISMIC_ZONE_V]` | BIS IS 1893 Zone V designation |
| `[HISTORICAL_LANDSLIDE_IMPACT]` | ISRO verified catastrophic event within 6 km |
| `[ISRO_LANDSLIDE_RANK_TOP15]` | ISRO Atlas district in national top 15 |
| `[ACTIVE_EROSION_CORRIDOR]` | CWC/Brahmaputra Board active erosion reach |
| `[HISTORICAL_FLOODPLAIN]` | CWC verified historical inundation polygon |

---

## 6. Missing Data Semantics

The engine enforces strict null-safety:

- Missing hazard evidence → `status: "UNAVAILABLE"`, `level: null`. Never converted to `LOW` or `0`.
- Unverified habitation population → `population: null`. Never `0`.
- `UNAVAILABLE` hazards are excluded from score denominator (not treated as zero risk).
- All `HazardObservation` records carry explicit `DataProvenance` (source, publisher, citation, retrieval date).

---

## 7. Known Limitations

1. **Point-based queries only**: The engine takes a single centroid coordinate. Polygon area queries are deferred.
2. **No DEM/slope integration**: Landslide exposure relies on district Atlas rankings, not per-pixel slope analysis.
3. **Coarse flood polygons**: Historical flood extents are administratively simplified. Sub-district inundation boundaries not yet encoded.
4. **Cyclone tracks are centrelines**: Wind-field radius and storm surge zones are not yet embedded.
5. **Static climate baselines**: Heatwave, drought, and extreme rainfall baselines are climatological averages; real-time IMD forecast integration is Phase 3.3+.
6. **25 representative habitations**: Comprehensive Census 2011 village data is Phase 3.3+.
7. **Carrying capacity not computed**: Evacuation capacity allocation is strictly Phase 3.3 scope.
8. **No live gauge data**: CWC gauge `currentLevel` is stored as `null`; live API integration is Phase 3.3+.

---

## 8. Integration Points

### Server Functions
- `buildMultiHazardProfile(lat, lon, stateCode, districtName?)` → `MultiHazardProfile`
- `findExposedHabitations(lat, lon, stateCode)` → `HabitationExposure[]`
- `getHazardMapLayers()` → GeoJSON `FeatureCollection` for each layer type
- `bridgeMultiHazardToAssessment(profile, location?)` → `AssessmentArea` compatible with `buildAssessmentAnalysis`

### Client Map Layer IDs
- `bis-seismic-zones-fill` + `bis-seismic-zones-border`
- `cwc-gauges-circle`
- `isro-landslide-events-circle`
- `cyclone-tracks-line`
- `cwc-floodplains-fill` + `cwc-floodplains-border`
- `erosion-corridors-line`
- `census-habitations-circle`

### Shared Types
Interfaces in `shared/hazards.ts`. Location context in `shared/india.ts` (`IndiaLocationContext.hazardProfile`, `IndiaLocationContext.redZone`).

---

*Akashvani — PS 191 Smart India Hackathon 2024 · Team SIH191*
