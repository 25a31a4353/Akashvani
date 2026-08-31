# Assam Data Sources and Coverage Notes

## Authoritative sources reviewed

1. Assam State Disaster Management Authority, Reports directory: https://asdma.assam.gov.in/documents/reports-0. Search results identify the official annual activity reports and the Assam Flood Report web portal, but the page was not retrievable in the sandbox browser during this session.

2. Assam State Disaster Management Authority, Assam Flood Report services: https://asdma.assam.gov.in/information-services/assam-flood-report. This is the official service directory for flood reports and related disaster information; direct extraction was unavailable during this session.

3. Government of Assam, Water Resources Department, “Flood & Erosion Problems”: https://waterresources.assam.gov.in/portlets/flood-erosion-problems. The page states that Assam has a 31.05 lakh hectare flood-prone area against 78.523 lakh hectares total, approximately 39.58% of the state area, with an average annual flood-affected area of 9.31 lakh hectares. It also documents the long-running river-bank erosion problem and reports approximately 4.27 lakh hectares eroded since 1950, with an assessed average annual land loss of nearly 8,000 hectares. These are contextual historical statistics, not a ten-year event series.

4. Open-Meteo weather and air-quality APIs are already used by the application’s server-side selected-location service. Live weather, daily forecast, precipitation, wind, and AQI must remain labelled modelled/provider data with retrieval timestamps; they must not be presented as official warnings.

## Data-status rule

The application must not fabricate an Assam 2016–2025 disaster event series. Year/event/impact rows should come from retrievable ASDMA or other official records, or be shown as unavailable with the source and coverage limitation visible. The existing analytical hazard extents remain screening context and are not official affected-area declarations.

## Assam state-profile facts reviewed

5. Directorate of Economics and Statistics, Government of Assam, State Profile of Assam: https://des.assam.gov.in/information-services/state-profile-of-assam. The page reports 78,438 sq km area, latitude 24–28 N and longitude 90–96 E, Census 2011 population 31,205,576, projected 2023 population 35,713,000, Census 2011 density 398 persons/sq km, literacy 72.19%, average rainfall 2022 of 2,402.9 mm, 33 districts in its 2023 table, 219 blocks, 214 towns, 26,395 villages, and a wide set of transport, health, education, agriculture, energy, forestry, fisheries, and economic indicators. The page also contains conflicting/older administrative wording that mentions 35 districts; the app should display the source year and avoid presenting a single undated current district count.

6. Assam State Portal, “Assam at a Glance”: https://assam.gov.in/about-us/393. It describes Assam’s 78,438 sq km area, borders, tropical monsoon rainforest climate, Census 2011 population of approximately 31.2 million, Census 2011 density of 398 persons/sq km, major natural resources, Brahmaputra and Barak river systems, biodiversity, agriculture, tea, silk, petroleum, and connectivity. These are reference facts with source years, not live operational indicators.

7. Assam State Portal, “Districts”: https://assam.gov.in/about-us/396. It lists 35 administrative districts and five regional divisions, including Barak Valley, Central Assam, Lower Assam, North Assam, and Upper Assam. It identifies the district-list source as the Assam State Portal and notes that administrative configurations can change; UI labels should include the source and retrieval date.
