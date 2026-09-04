# Phase 3.2C — Real Geographic District Classification Layer

**Project:** Akashvani — Intelligent Disaster Management & Decision Support System  
**SIH Problem Statement:** PS 191 / SIH26191  
**Title:** “Intelligent Identification of Hazard-Based Red Zones, Carrying Capacity Assessment, and Immediate Relocation Needs for Vulnerable Habitations”  
**Date:** September 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary & Objective

In early prototypes, risk classification visual overlays used synthetic circular buffers or point approximations centered on district coordinates. 

**Phase 3.2C replaces synthetic buffers with real administrative district boundary polygons across India**, establishing the core spatial foundation for PS 191:

1. **Authoritative Administrative Geometries**: Integrates official ADM2 district boundary polygons derived from `geoBoundaries India ADM2` (William & Mary GeoLab / Survey of India) and verified Kerala ADM2 boundaries.
2. **Deterministic Tier-to-Presentation Mapping**: Derives `RED` / `ORANGE` / `GREEN` / `UNAVAILABLE` classification colors directly from the Phase 3.2B Multi-Hazard Engine (`RedZoneAssessment`), filling the actual geographic extent of each district polygon.
3. **Census 2011 District Data Integration**: Embeds official Census of India 2011 district populations directly into `realDistricts.ts`.
4. **Strict Data Hygiene**:
   - `GREEN` requires genuine low-hazard evidence. Missing or unverified data maps strictly to `UNAVAILABLE` (neutral/unclassified).
   - No circular radius buffers or synthetic boundaries.
   - Spatial resolution is explicitly declared as `DISTRICT`.

---

## 2. Technical Architecture & Components

### 2.1 Spatial Classification Engine (`server/diva/hazards/classification.ts`)
- **`buildDistrictClassificationGeoJSON()`**: Generates MapLibre-compatible GeoJSON `FeatureCollection` mapping each district's multi-hazard profile onto its authentic ADM2 polygon.
- **Color Invariants**:
  - `RED` (`#c62828`): High Multi-Hazard Red Zone (Triggered by critical CWC flood, ISRO landslide, IMD cyclone, or BIS seismic exposure).
  - `ORANGE` (`#e65100`): Moderate Risk Zone.
  - `GREEN` (`#2e7d32`): Confirmed Low Hazard Baseline.
  - `UNAVAILABLE` (`rgba(0,0,0,0)`): Unassessed or unverified data.
- **Consistent Visual Encodings**: Fixed opacity (0.40 fill) and stroke width (2.0 line) across all client rendering.

### 2.2 Real District Database (`server/diva/hazards/data/realDistricts.ts`)
- Carries full geoBoundaries ADM2 boundary geometries, centroids, Census 2011 population figures, and state codes for target districts.
- Provides indexed lookup via `findRealDistrict(query)`.

---

## 3. Verification & Test Suite

The Phase 3.2C implementation is validated by 17 automated tests in `server/diva/classification.test.ts`:
- GeoJSON structure and geometry validation (`Polygon` / `MultiPolygon`).
- Color consistency between engine output and map layer properties.
- Absence of circular or synthetic buffer geometries.
- Verification that missing data produces `UNAVAILABLE` rather than false `GREEN`.

All 17/17 tests pass with zero regressions.
