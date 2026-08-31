# Nationwide India GIS Layer Sources

## Administrative and terrain reference

The Survey of India Online Maps Portal describes pan-India topographical data at 1:50,000 scale, including administrative boundaries, hydrology, hypsography, vegetation, and a digital terrain model. The portal also describes administrative-boundary products for the entire country through district and sub-district levels. The application should present this government source as a reference provenance statement rather than imply that a live government service is embedded.

Source: https://onlinemaps.surveyofindia.gov.in/AboutPortal.aspx

For browser delivery, the state and union-territory boundary layer can use geoBoundaries ADM1 metadata and its simplified GeoJSON distribution. The metadata identifies 36 ADM1 units, a State / Union Territory canonical type, a 2011 represented boundary year, and DataMeet India community / Election Commission of India as sources under CC BY 2.5 India. This is a portable public reference layer; it is not a substitute for the Survey of India’s authoritative boundary product.

Source: https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/

## Population-density reference

WorldPop publishes an India population-grid product in WGS84 GeoTIFF form at approximately 100 m resolution, with units of people per pixel and a random-forest dasymetric redistribution methodology. The source page labels the underlying India product as a 2020 spatial distribution and releases WorldPop datasets under CC BY 4.0. A web map should not download the 1.72 GB national GeoTIFF at runtime; it should display a lightweight reference summary or a pre-aggregated representation with clear year/method status.

Source: https://hub.worldpop.org/geodata/summary?id=6527

The ArcGIS WorldPop Population Density 1 km image service is suitable for a lightweight national visual overlay. Its own web-map configuration identifies the map-service endpoint as `https://worldpop.arcgis.com/arcgis/rest/services/WorldPop_Population_Density_1km/ImageServer` and describes values as people per km². The service warns that small-scale national rendering can take 10–15 seconds or time out, so DIVA should use a single bounded image export, a low-opacity display, and an explicit unavailable state.

Source: https://www.arcgis.com/sharing/rest/content/items/f9cb5e481ecc48bfbdd6486c42e19a24/data?f=pjson

## Live weather context

Open-Meteo supports batched lists of WGS84 coordinates and current variables including temperature, precipitation, cloud cover, wind, and weather code. It combines model outputs from multiple meteorological providers, so this application must label the resulting grid as live modelled weather context, not an official warning. The service documentation limits the free tier to non-commercial usage under its stated thresholds.

Source: https://open-meteo.com/en/docs

Open-Meteo documents current 10 m wind speed, direction, and gusts alongside temperature, precipitation, cloud cover, and weather code. Requests may contain coordinate lists, but values remain modelled conditions at requested/grid-selected locations; any rendered national surface is an interpolated decision-support visualization, not a measured wall-to-wall observation or official warning.

Source: https://open-meteo.com/en/docs

The ArcGIS World Elevation Terrain image service was successfully checked for a WGS84 India-bounds image export. It should be treated as a physical-terrain visual reference, not as a local elevation survey or hazard analysis layer.

Source: https://utility.arcgis.com/usrsvcs/servers/6ff9b2ff0b2940c3bd5febf68a643a50/rest/services/WorldElevation/Terrain/ImageServer/exportImage

## Geological reference

The intended national geology provenance is the Geological Survey of India Bhukosh/NGDR ecosystem. The public Bhukosh endpoint was unavailable during the initial review, so no live GSI service URL is embedded in the application without a successful availability and licensing check. Any interim geological display must be marked as broad reference context, with its source status visible.

Candidate portal: https://bhukosh.gsi.gov.in/Bhukosh/Public

An independently accessible fallback is the public USGS South Asia geologic-map dataset. It includes geology, faults, inferred faults, rivers, and mapped geological provinces covering the India extent, although its live web-map service currently returned an access-denied response. The initial implementation should use an explicit geology-reference availability state rather than silently substitute an invented geological layer.

Source: https://catalog.data.gov/dataset/geologic-map-of-south-asia-geo8ag

## Hazard-area coverage

ISRO/NRSC Bhuvan documents OGC-compatible WMS/WMTS delivery for thematic layers including flood hazard and annual flood layers. Its disaster service catalog also identifies near-real-time flood monitoring, landslide hazard inventory and early warning, and earthquake damage assessment. Availability, recency, and extent vary by service and event; DIVA must expose the source and retrieval status, treat the layers as mapped reference/event context, and not label them as official action orders.

Sources: https://bhuvan.nrsc.gov.in/wiki/index.php/How_to_use_WMS_services ; https://bhuvan.nrsc.gov.in/wiki/index.php/Disaster_Services
