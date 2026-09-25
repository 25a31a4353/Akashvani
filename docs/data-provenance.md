# ResQ Data Provenance & Authoritative Sources Architecture

## 1. Overview & Provenance Guarantee
The ResQ platform strictly adheres to authoritative provenance integrity. Datasets powering disaster screening, evacuation routing, and geospatial awareness must reflect real-world observations or official regulatory standards.

### Non-Negotiable Rules:
1. **Zero Fabrication**: No synthetic geometry, circular buffers disguised as hazard footprints, or approximated lithology polygons.
2. **Provenance Traceability**: Every displayed attribute retains its originating agency, spatial resolution, CRS, retrieval timestamp, and update frequency.
3. **Hazard Independence**: Geological context serves as geotechnical and environmental evidence; it never arbitrarily overrides physical hazard models.

---

## 2. Integrated Authoritative Datasets Summary

| Category | Primary Agency / Source | Dataset & Scale | Provenance Type | Integration Status | Role in ResQ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Geology & Tectonics** | **Geological Survey of India (GSI)** | Bhukosh 1:2M Seamless Geology & Seismotectonic Atlas | `OFFICIAL` / `REFERENCE` | **INTEGRATED** | Runtime lithology, bedrock age, fault proximity, 1:50K geomorphology |
| **Riverine Hydrology** | **Central Water Commission (CWC)** | National Hydrological Network Monitoring Gauges | `OFFICIAL` / `OBSERVED` | **INTEGRATED** | Live & danger level gauge monitoring, riverine flood early warning |
| **Flood Inundation** | **NRSC / ISRO Disaster Management Support** | Bhuvan Historical Flood Inundation & Hazard Zones | `OFFICIAL` / `OBSERVED` | **INTEGRATED** | Flood hazard footprint screening |
| **Seismic Zoning** | **Bureau of Indian Standards (BIS)** | IS 1893:2016 Seismic Hazard Macro-Zonation | `OFFICIAL` / `REGULATORY` | **INTEGRATED** | Regulatory design seismic acceleration baseline (Zones II–V) |
| **Landslide Atlas** | **ISRO / NRSC & GSI** | National Landslide Susceptibility & Event Inventory | `OFFICIAL` / `OBSERVED` | **INTEGRATED** | Historical landslide event clusters, slope susceptibility |
| **Cyclone Tracks** | **IMD & NOAA IBTrACS** | Official Best-Track Cyclone Paths (1982–2026) | `OFFICIAL` / `OBSERVED` | **INTEGRATED** | Historical cyclone track corridors, wind intensity buffers |
| **Topography & Terrain** | **Copernicus / ESA** | GLO-90 Digital Elevation Model (90 m resolution) | `OFFICIAL` / `OBSERVED` | **INTEGRATED** | Digital elevation, finite-difference slope gradient |
| **Weather & Nowcast** | **India Meteorological Department (IMD)** | IMD Mausam District Alerts & Open-Meteo NWP | `LIVE_API` / `FORECAST` | **INTEGRATED** | Real-time rainfall, temperature, wind vectors, Doppler radar |
| **Administrative Boundaries** | **Survey of India / geoBoundaries** | gbOpen ADM1 (States) & ADM2 (Districts) | `OFFICIAL` / `REFERENCE` | **INTEGRATED** | Administrative jurisdiction mapping |
| **Evacuation Routing** | **OpenStreetMap / OSRM** | Roadway Network Graph | `DERIVED` | **INTEGRATED** | Turn-by-turn road evacuation routes (no straight-line fallbacks) |

---

## 3. Provenance UI States
The ResQ Data Provenance interface (`IndiaOverviewProvenance.tsx`) renders dynamic badges reflecting the state of data for the active query:
- `AVAILABLE`: Real authoritative vector geometry or structured metadata active for the selected location.
- `LIVE`: Telemetry or satellite feed operating in real time (e.g. IMD Mausam alerts, RainViewer Doppler radar).
- `OFFICIAL`: Verified published dataset from an authorized national regulatory agency (e.g. BIS IS 1893, GSI Bhukosh).
- `UNAVAILABLE`: Where machine-readable vector geometry is technically inaccessible without registered credentials or CAPTCHA, the system renders an explicit disclaimer rather than fabricating proxy data.

For comprehensive details on the GSI Bhukosh integration, refer to [GSI Bhukosh Integration Documentation](file:///c:/Users/SHANMUKHESWAR/OneDrive/Desktop/SIH191/Akashvani/docs/gsi-bhukosh-integration.md).
