# Kerala Data Source Register

## Administrative boundaries

The Survey of India Online Maps portal describes administrative boundary products covering state, district, taluk/sub-district, and village levels. DIVA will retain this portal as the authoritative integration target for future official Kerala boundary replacement. Until a licensed or downloaded official dataset is connected, the application must label in-app Kerala boundary geometry as **reference context** rather than an authoritative legal boundary.

Source: https://onlinemaps.surveyofindia.gov.in/AboutPortal.aspx

For the present application, Kerala district reference geometry is sourced from the geoBoundaries `gbOpen` India ADM2 release. The programmatic endpoint reports 2021-represented India district boundaries, with 736 administrative units, source metadata, and an Open Data Commons Open Database License 1.0. The extracted Kerala subset contains the fourteen Kerala district names. Attribution must remain visible in the interface.

Sources: https://www.geoboundaries.org/api.html and https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/

## Population context

District population and area values are sourced from the Census of India 2011 A-01 table, which covers villages, towns, households, population, and area for states, districts, and sub-districts. The Government of Kerala’s Economic and Statistics data explorer also publishes district-level Census 2011 population values. DIVA labels this layer **CENSUS 2011 CONTEXT**, not current population, and calculates density only from the cited census population and district area values.

Sources: https://censusindia.gov.in/census.website/data/census-tables and https://www.ecostat.kerala.gov.in/data-subset/262

## Environmental context

Current weather and precipitation map values are retrieved from the Open-Meteo Forecast API using WGS84 coordinates and the `current` weather variables. The provider documents temperature, precipitation, wind, cloud cover, and other hourly/current variables, along with a local-time timezone option. DIVA requests Kerala locations with `timezone=Asia/Kolkata` and shows the provider timestamp.

Air-quality context is retrieved from the Open-Meteo Air Quality API. The provider documents 15-minute current US AQI, PM2.5, PM10, nitrogen dioxide, ozone, and other pollutant fields. The provider identifies the global CAMS atmospheric-composition forecast as the global source. DIVA displays this layer as **MODELLED ENVIRONMENTAL CONTEXT**, not an official regulatory monitoring observation.

Sources: https://open-meteo.com/en/docs and https://open-meteo.com/en/docs/air-quality-api

## Hazard context

The Kerala State Disaster Management Authority hazard-map portal provides district flood-hazard probability maps and exposure context; state-level historic and RCP 8.5 flood-probability raster downloads; GSI 2022 district landslide-susceptibility shapefiles; and further drought, lightning, coastal-hazard, earthquake, and industrial-hazard mapping resources. DIVA will expose these source categories, timestamps, and data status in the layer catalog. The interface must not imply that displayed analytical overlays are a direct copy of an official KSDMA hazard product unless the corresponding source file has actually been imported and processed.

Source: https://sdma.kerala.gov.in/hazard-maps/
