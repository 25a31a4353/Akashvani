# Akashvani Phase 3.1 Multi-State Real Data Foundation

## Executive Summary

Phase 3.1 transforms Akashvani from a Kerala/Assam-centric analytical prototype into a genuinely multi-state disaster intelligence platform across 13 target states.

This document records the data models, source provenance dimensions, boundary caching, strict missing-data semantics, and API contracts established in Phase 3.1.

---

## 1. Supported State Configurations (13 States)

Akashvani natively indexes 13 states representing India's primary physiographic and hazard regimes:

| Code | State | Region | Primary Hazards | Major River Systems | Focus Districts (Testing Baseline) |
|---|---|---|---|---|---|
| **AS** | Assam | Northeast | Riverine Flood, Riverbank Erosion, Flash Flood | Brahmaputra, Barak, Subansiri, Kopili, Dihing | Dhemaji, Nagaon, Dibrugarh, Charaideo, Sivasagar, Golaghat, South Salmara-Mankachar |
| **AP** | Andhra Pradesh | South Coastal | Tropical Cyclone, Coastal Surge, Riverine Flood | Godavari, Krishna, Penna, Tungabhadra, Nagavali | East Godavari, Krishna, Guntur, Vizianagaram, Kakinada region, Visakhapatnam |
| **MH** | Maharashtra | Western Deccan | Extreme Precipitation & Urban Flood, Drought, Cyclone | Godavari, Krishna, Tapi, Bhima, Mula-Mutha, Ulhas | Mumbai, Nashik, Pune, Sangli, Kolhapur, Nanded, Nandurbar |
| **KA** | Karnataka | Southern Deccan | Drought (North Interior), Riverine Flood, Urban Inundation | Krishna, Kaveri, Sharavathi, Tungabhadra, Netravati | Bengaluru, Kalaburagi, Bidar, Mysuru, Chamarajanagar, Kodagu, Dakshina Kannada |
| **BR** | Bihar | Indo-Gangetic Plain | Recurrent Riverine Flood, River Avulsion, Drought | Ganga, Kosi, Gandak, Bagmati, Kamala, Son | Patna, Darbhanga, Sitamarhi, Madhepura, Khagaria, Araria, West Champaran |
| **JH** | Jharkhand | Chota Nagpur Plateau | Agricultural Drought, Severe Lightning, Flash Flood in Gorges | Subarnarekha, Damodar, Koel, Kharkai, Barakar | Ranchi, Jamshedpur, Dhanbad, Dumka, Palamu, Hazaribagh |
| **MZ** | Mizoram | Northeast / Lushai Hills | Rain-Induced Landslide, Flash Flood in Narrow Valleys, Earthquake | Tlawng, Chhimtuipui (Kaladan), Tut, Tuivawl | Aizawl, Lunglei, Champhai, Lawngtlai |
| **OD** | Odisha | Eastern Coastal | Very Severe Cyclonic Storm, Storm Surge, Mahanadi Basin Flood | Mahanadi, Brahmani, Baitarani, Rushikulya, Subarnarekha | Puri, Kendrapara, Cuttack, Ganjam, Baleswar, Gajapati, Kandhamal |
| **CT** | Chhattisgarh | Central Highlands | Agricultural Drought, Riverine Flash Flood, Extreme Heat | Mahanadi, Shivnath, Indravati, Hasdeo, Arpa | Raipur, Bilaspur, Bastar, Durg, Korba, Raigarh |
| **UP** | Uttar Pradesh | Northern Plains | Riverine Flood (Ganga-Ghaghara-Rapti), Extreme Heatwave, Cold Wave | Ganga, Yamuna, Ghaghara, Rapti, Gomti, Betwa | Gorakhpur, Ballia, Prayagraj, Varanasi, Lucknow, Moradabad, Budaun |
| **RJ** | Rajasthan | Thar / Arid Northwest | Severe Meteorological Drought, Extreme Heatwave, Desert Flash Flood | Chambal, Luni, Banas, Mahi, Sabarmati | Jaipur, Jodhpur, Jaisalmer, Barmer, Ajmer, Nagaur, Kota |
| **TN** | Tamil Nadu | Southern Coromandel | Northeast Monsoon Deluge & Urban Flood, Cyclone, Delta Drought | Kaveri, Vaigai, Palar, Thamirabarani, Bhavani | Chennai, Nagapattinam, Thanjavur, Tirunelveli, Virudhunagar, Vellore, Nilgiris |
| **KL** | Kerala | Malabar Coast (Reference) | Extreme Monsoon Rainfall & Landslide, Riverine Flood, Coastal Erosion | Periyar, Bharathappuzha, Pamba, Chaliyar, Kabini | Wayanad, Ernakulam, Alappuzha, Idukki, Kozhikode |

---

## 2. Separate Source Dimensions

To ensure research rigor and regulatory clarity, national vulnerability indices and models are strictly isolated into distinct typed source dimensions:

1. **CEEW 2021 Climate Vulnerability Index**:
   - Focus: Multi-hazard climate risk, adaptive capacity, and extreme event exposure.
   - Classification: `OFFICIAL` / National Policy Reference.
2. **DST Common Framework Assessment**:
   - Focus: National climate vulnerability assessment using standardized IPCC AR5 methodology across Himalayan and non-Himalayan Indian states.
   - Classification: `OFFICIAL` / Ministry of Science & Technology.
3. **XDI Gross Domestic Climate Risk (2050 Projections)**:
   - Focus: Physical built environment risk projections under extreme warming scenarios.
   - Classification: `MODELLED` / Physical asset risk projections.
4. **DST 2024 District-Level Climate Risk Assessment**:
   - Focus: High-resolution district-level risk mapping across drought, flood, cyclone, and heatwave vectors.
   - Classification: `OFFICIAL` / Updated National Assessment.
5. **geoBoundaries ADM1 & Election Commission / Census 2011**:
   - Focus: Authoritative administrative boundary polygons and census identification.
   - Classification: `OFFICIAL`.

---

## 3. Strict Missing-Data Semantics

To eliminate deceptive analytical placeholders and mock values:

- **Population**:
  - If a geocoder or administrative resolution does NOT return an authoritative population count, `population` is strictly set to `null`.
  - `populationStatus` is set to `"unavailable"`.
  - It is NEVER set to `0` or filled with an arbitrary placeholder.
- **Elevation & Slope**:
  - If the Digital Elevation Model (DEM) lookup fails or is out of range, `elevationMeters` is strictly set to `null`.
  - `slopeDegrees` is set to `null`.
  - `status` is set to `"UNAVAILABLE"` and `confidence` is set to `"UNAVAILABLE"`.
  - Missing elevation is NEVER represented as sea-level (`0`).
- **Hydrology & River Distances**:
  - If a location is outside mapped river courses or monitor buffers, `riverDistanceKm` is strictly set to `null`.
  - `nearestRiver` is set to `null`.
  - `status` is set to `"UNAVAILABLE"`.
  - River distance is NEVER defaulted to `0 km` (which would falsely imply standing in a riverbed).

---

## 4. API Endpoints

The tRPC `diva.india` router exposes the multi-state capabilities:

- `diva.india.states`: Returns array of all 13 supported `StateConfig` objects.
- `diva.india.state({ code: string })`: Returns the specific state configuration along with its cached geoBoundaries polygon.
- `diva.india.districts({ stateCode: string })`: Returns focus district administrative records for the state.
- `diva.india.normalize({ location, stateCode? })`: Normalizes an `IndiaLocation` into a `NormalizedLocationContext` with terrain, hydrology, and provenance.
- `diva.india.context`: Enriched endpoint returning complete selected-location context including terrain, hydrology, categorized infrastructure, and provenance.

---

## 5. Verification & Automated Test Coverage

The multi-state engine is verified by `server/diva/multiState.test.ts` covering 12 comprehensive unit tests matching all target assertions:

1. Verification of all 13 state configurations.
2. Coordinate and bounding box integrity across Indian territory.
3. District hierarchy resolution for valid and invalid codes.
4. Complete normalization of location entities.
5. Missing population `null` semantics.
6. Missing elevation `null` semantics.
7. Hydrology distance `null` semantics.
8. Kerala reference validation with Western Ghats drainage.
9. Assam Brahmaputra valley characteristics.
10. End-to-end normalization of all 13 states without throwing errors.
11. Categorized infrastructure extraction.
12. Standardized data provenance generation.
