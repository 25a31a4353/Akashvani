# ResQ V3.2 Location Decision Context & Triage Report — Integrity, Quality & Provenance Audit

## 1. Executive Summary & Purpose

This document records the architectural standards, defect resolutions, and empirical validation metrics for the **ResQ Location Decision Context & Triage Report (v4.2 / ResQ V3.2)** under SIH 2026 Problem Statement 191.

The report serves as a formal disaster-management decision-support document for operational incident commanders, district magistrates, and technical reviewers. Every statement, metric, route, and risk classification in this document is derived deterministically from the canonical decision engine and authoritative statutory repositories. The report renderer acts strictly as an un-biased, zero-fabrication visualization contract.

---

## 2. Existing Defects Discovered & Root Causes

| Defect ID | Description | Root Cause | Resolution in ResQ V3.2 |
| :--- | :--- | :--- | :--- |
| **DEF-A** | Selected coordinate could fall outside the visible map extent. | Map extent calculation previously relied solely on boundary rings or fallback bounding box without explicitly including the origin point `[longitude, latitude]`. | Guaranteed origin inclusion `pts.push([loc.longitude, loc.latitude])` with minimum 15% margin padding and pre-generation invariant assertion. |
| **DEF-B** | "Exact geographical coordinates & bounds" displayed when administrative bounds were null. | Hardcoded label implied bounds were known even when only a centroid coordinate was resolved. | Dynamic bounds detection: displays exact coordinates if polygon or bounding box exists; explicitly outputs `"Administrative bounds: UNAVAILABLE (centroid reference only)"` otherwise. |
| **DEF-C** | State centroids described as exact habitations. | Ambiguous categorization treated state-level screening reference points identically to village settlements. | Explicit spatial level resolution: State selection is declared as `"STATE-LEVEL SCREENING"` and coordinates are labelled `"State-level screening reference centroid (not an exact habitation/village)"`. |
| **DEF-D** | "VERIFIED SAFE HAVEN" claimed when destination safety was UNKNOWN. | Destination labeling did not gate on `destinationSafety.destinationSafetyStatus`. | Strict destination safety gating: If status is `UNKNOWN`, label is `"CANDIDATE DESTINATION (SAFETY UNKNOWN / UNSCREENED)"` in neutral slate; if `CONDITIONAL`, amber warning. Never claims verified safe without explicit validation. |
| **DEF-E / DEF-F** | Route distance/duration and "turn-by-turn routes" claimed when OSRM routing was unavailable. | Fallback geodesic straight-line distance was displayed in the routing card as an estimated travel time. | Hard Invariant: If `isRoadRoute === false`, route distance is `"UNAVAILABLE"`, duration is `"UNAVAILABLE"`, status is `"ROAD_ROUTING_UNAVAILABLE"`, and travel times are withheld. No straight-line proxy is passed off as a road route. |
| **DEF-G** | Mapped facilities count = 0 while claiming local shelter safe havens. | Spatial scoping did not distinguish between local screening extent and district-level fallback registries. | Explicit spatial distinction: Notes `"0 facilities verified inside immediate local screening extent; regional candidate facilities reside at district/urban reference levels"`. |
| **DEF-H** | Population exposure scored as `0 / 20` when population data was unavailable. | Normalization routine treated `null` population as `0` raw score. | Strict UNKNOWN semantics: displays `"NOT SCORED — DATA UNAVAILABLE (Max: 20)"`. Unknown is never penalized or represented as zero. |
| **DEF-I** | Capacity deficit scored as `0 / 15` when capacity was unverified. | Missing bed capacity was assigned `0` deficit. | Displays `"NOT SCORED — DATA UNAVAILABLE (Max: 15)"` with explicit note that shelter capacities require official DDMA register validation. |
| **DEF-J** | Confidence claimed as HIGH despite multiple critical data gaps. | Static confidence calculation did not penalize simultaneous absence of population, capacity, and routing. | Dynamic confidence penalty degrades to `MEDIUM` or `LOW` with explicit justification and coverage ratio display. |
| **DEF-K** | Source registry presented as if all integrated national datasets contributed to every local decision. | Platform integration catalog was combined with the decision-specific evidence register. | Segregation: Section 8A displays the **Decision Evidence Register** (with `"Used in Decision: YES/NO"`), while Section 8C lists the statutory platform repository catalog with a prominent disclaimer. |
| **DEF-L / DEF-M** | Hazard labels failed to distinguish active disasters from historical records or static baselines. | Generic terms like "Hazard" merged static BIS seismic zones and historical flood footprints with live IMD warnings. | Precise temporal classification: BIS IS 1893:2016 is labelled `"REGULATORY REFERENCE"`, NRSC flood footprints as `"HISTORICAL"`, GSI lithology as `"STATIC GEOLOGICAL CONTEXT"`, and only live IMD bulletins as `"CURRENT (OFFICIAL)"`. |

---

## 3. Report Data Contract

The report renderer consumes the immutable canonical data contract:
```typescript
interface ResQLocationDecisionReport {
  reportMetadata: { title: string; version: string; generatedAt: string; engineVersion: "V3.2" };
  locationIdentity: ReportLocationIdentity;
  spatialContext: { assessmentLevel: string; coordinateMeaning: string; crs: "WGS84 / EPSG:4326"; bounds: string };
  geographicMap: { extent: MapExtentResult; boundaryRings: Point[][]; origin: Point; dest?: Point; route?: Point[] };
  hazardEvidence: { primary: HazardAssessment; secondary: string[]; baselineGeology: GeologyContext; meteorology: EnvironmentContext };
  exposureContext: { population: number | null; source: string; year: number | null; habitations: ExposedHabitation[] };
  vulnerabilityContext: { score: number | null; factors: VulnerabilityFactor[]; rationale: string };
  facilityAssessment: { totalNearby: number; eligibleShelters: number; hospitalsExcluded: number; capacityVerified: boolean; capacityStatus: CapacityStatus };
  destinationAssessment: { candidate: EvacuationFacility | null; safety: DestinationSafetyAssessment | null };
  roadEvacuationRoute: { isRoadRoute: boolean; distanceKm: number | null; durationMinutes: number | null; routeGeometry: Point[] | null };
  responsePriority: { level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"; score: number; components: Record<string, PriorityScoreComponent>; criticalDataMissing: boolean };
  confidenceContext: { level: string; score: number; coverageLabel: string; uncertainty: string[] };
  evidenceRegister: Array<{ id: string; domain: string; source: string; dataset: string; temporal: string; used: string; conf: string }>;
  qualityFlags: Array<{ variable: string; status: string; note: string }>;
}
```

---

## 4. Validation Rules & Guardrails (`validateReportData`)

Before any PDF stream is initialized, `validateReportData(context)` enforces the following gates:
1. **Geographic Coordinate Envelope**: Latitude must be between $5.0^\circ\text{N}$ and $38.0^\circ\text{N}$; Longitude must be between $68.0^\circ\text{E}$ and $98.0^\circ\text{E}$.
2. **Viewport Containment Invariant**: Selected coordinate must satisfy:
   $$\text{south} \le \text{latitude} \le \text{north} \quad \text{and} \quad \text{west} \le \text{longitude} \le \text{east}$$
3. **Routing Status Consistency**: If `isRoadRoute === false`, status cannot be `ROAD_ROUTE_VERIFIED`.
4. **Destination Safety Gating**: Unscreened or unknown destinations cannot be marked as verified safe.
5. **Unknown Scoring Integrity**: `rawValue` cannot be set to 0 for missing population or unverified capacities.

---

## 5. Cartographic & Geographic Rules

1. **Map Projections**: Equirectangular local projection centered on the bounding box with dynamic longitudinal scale correction:
   $$\text{Scale Factor} = 111.32 \times \cos\left(\frac{\text{latitude} \times \pi}{180}\right) \text{ km/deg}$$
2. **Graticule Grid**: Fixed 4-step lat/lon graticule with coordinate labels in degrees North and East.
3. **True North Compass**: Orientated vector compass with dual-shade red/white needle and statutory `N` mark.
4. **Dynamic Kilometric Scale**: Automatically rounded scale bar (5, 10, 20, 50, 100, or 200 km) matched to the exact viewport width.
5. **Synchronized Legend**: Only displays layers actually rendered on the canvas (never displays a road route symbol if routing failed).

---

## 6. Document Architecture (8 Dedicated Pages)

| Page | Title | Contents | Vertical Budget |
| :---: | :--- | :--- | :--- |
| **1** | Location Identity & Decision Summary | RESQ title banner, response priority badge, administrative hierarchy, spatial level, coordinates, executive summary, quick-reference table. | 502 pt / 716 pt max |
| **2** | Geographic Decision Map & Cartography | True vector map, graticule grid, boundary polygon, centroid marker, destination marker, verified OSRM route, scale bar, north arrow, synchronized legend, coordinate CRS metadata. | 546 pt / 716 pt max |
| **3** | Multi-Hazard Evidence & Geological Baseline | Dimension separation cards, primary hazard causality, secondary hazards register, GSI bedrock lithology & lineaments, atmospheric telemetry, IMD warnings. | 488 pt / 716 pt max |
| **4** | Population Exposure & Vulnerability Context | Population resolution, source hierarchy, exposed habitations register, demographic constraints, terrain factors, vulnerability score. | 426 pt / 716 pt max |
| **5** | Evacuation Facilities & Carrying Capacity | Facility existence vs verified capacity warning, shelter vs hospital role gating, required capacity, available capacity, deficit, DDMA field verification guidance. | 366 pt / 716 pt max |
| **6** | Destination Assessment & Road Routing | Destination safety gating, hazard conflict intersection check, OSRM road network routing, turn-by-turn verification, strict non-road fallback disclaimer. | 418 pt / 716 pt max |
| **7** | Decision Engine, Scoring & Causal Chain | PS191 5-factor priority score breakdown with explicit `NOT SCORED` bars, total score card with triage status, 8-step causal decision chain, confidence vs coverage. | 595 pt / 716 pt max |
| **8** | Data Quality, Limitations & Source Registry | Decision evidence register (with `Used: YES`), data quality & completeness flags matrix, platform integrated national source registry, statutory legal notice. | 546 pt / 716 pt max |

---

## 7. Verification & Visual QA Results

### Test Suite Execution
- **Total Test Files**: 37 passed (37/37)
- **Total Tests**: 273 passed (273/273)
- **Report Test Suite**: 17 dedicated unit & integration tests (`selectedLocationReport.test.ts`)
- **TypeScript Compilation**: `npx tsc --noEmit` exited with code 0 (zero errors).
- **Production Build**: `npm run build` compiled client bundle (Vite) and server bundle (esbuild) cleanly.

### Visual QA Benchmark Outputs
All benchmark reports were generated, saved to `artifacts/reports/`, and audited for page count, layout, and visual fidelity:
1. **Andhra Pradesh State-Level Selection** (`15.9129°N, 79.7400°E`):
   - Map viewport: `[S:11.5250, N:21.0150, W:76.6580, E:85.8620]` — centroid verified INSIDE extent.
   - Assessment Level: `"STATE-LEVEL SCREENING"`.
   - Priority: `"UNKNOWN"` (Reference score: `33/100`, critical data missing: `true`).
   - Road Route: `"ROAD_ROUTING_UNAVAILABLE"`, Distance: `"UNAVAILABLE"`, Duration: `"UNAVAILABLE"`.
   - Exact Page Count: **8 Pages** (30.6 KB).
2. **Wayanad District Benchmark** (`11.6854°N, 76.1320°E`):
   - Primary Hazard: Landslide (RED Tier).
   - Priority: `"HIGH"` (Score: `88/100`).
   - Destination: Multi-purpose shelter (Conditional safety status verified).
   - Exact Page Count: **8 Pages** (37.7 KB).
3. **Puri District Benchmark** (`19.8135°N, 85.8312°E`):
   - Primary Hazard: Cyclone (RED Tier).
   - Exact Page Count: **8 Pages**.
4. **Dibrugarh Benchmark** (`27.4728°N, 94.9120°E`):
   - Primary Hazard: Riverine Flood (RED Tier).
   - Exact Page Count: **8 Pages**.
5. **Jodhpur Benchmark** (`26.2389°N, 73.0243°E`):
   - Arid / Low flood baseline (GREEN Tier).
   - Exact Page Count: **8 Pages**.
6. **Sangli Benchmark** (`16.8524°N, 74.5815°E`):
   - Krishna River flood corridor (ORANGE Tier).
   - Exact Page Count: **8 Pages**.
7. **Chamoli Benchmark** (`30.4140°N, 79.3240°E`):
   - Himalayan debris flow / flash flood (RED Tier).
   - Exact Page Count: **8 Pages**.

---

## 8. Remaining Limitations

1. **Sub-district Habitation Micro-mapping**: At the state-wide screening level, individual village boundary shapefiles are not resolved without selecting a specific district or sub-district.
2. **Shelter Bed Ground-Truth**: Bed capacity in OpenStreetMap nodes is largely unpopulated. The platform strictly enforces `CAPACITY_UNAVAILABLE` until local DDMA emergency response databases are synchronized.
3. **OSRM Server Connectivity**: If the external OSRM routing server times out or encounters network limits, the report safely defaults to `ROAD_ROUTING_UNAVAILABLE` without synthesizing artificial routes.
