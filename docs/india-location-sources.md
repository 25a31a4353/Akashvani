# India-wide Location and Environmental Context Sources

The India-wide location search uses the [Nominatim Search API](https://nominatim.org/release-docs/latest/api/Search/) with the `countrycodes=in` filter, `addressdetails=1`, and `polygon_geojson=1` where available. Nominatim provides free-form place search, detailed administrative address components, bounding boxes, and supported GeoJSON place geometry.

The dynamic location population context comes from the [Open-Meteo Geocoding API](https://open-meteo.com/en/docs/geocoding-api), whose India-filtered result records include GeoNames-sourced WGS84 coordinates, administrative hierarchy, feature type, and population where present.

Selected-location temperature and precipitation use the [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs). The service accepts WGS84 latitude and longitude and supports current temperature, precipitation, and weather-code fields. Selected-location air-quality context uses the [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api), which documents current US AQI and PM2.5 fields based on CAMS forecast context.

All weather and air-quality values are shown as modelled environmental context, not as official Indian meteorological or hazard warnings. Nominatim-derived boundaries and Open-Meteo population values are source-labelled; unavailable population values are left unavailable rather than estimated.
