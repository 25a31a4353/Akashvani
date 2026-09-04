export const nationwideLayerControls = [
  ["nationalStates", "States & union territories"],
  ["population", "Population density"],
  ["terrain", "Physical terrain"],
  ["geology", "Geological reference"],
  ["liveWeather", "Live weather coverage"],
  ["wind", "10 m wind speed & direction"],
  ["earthquakeSensitivity", "Earthquake sensitivity extent"],
  ["landslideSensitivity", "Landslide sensitivity extent"],
  ["floodSensitivity", "Flood sensitivity extent"],
  ["combinedSensitivity", "Combined multi-hazard screening"],
] as const;

export const nationwideMapLayerVisibility = {
  nationalStates: ["national-state-fill", "national-state-line", "national-state-label"],
  population: ["national-population"],
  terrain: ["national-terrain"],
  geology: ["national-geology"],
  liveWeather: ["national-weather-fill", "national-weather-line"],
  wind: ["national-wind-symbol"],
  earthquakeSensitivity: ["national-sensitivity-earthquake-fill", "national-sensitivity-earthquake-line"],
  landslideSensitivity: ["national-sensitivity-landslide-fill", "national-sensitivity-landslide-line"],
  floodSensitivity: ["national-sensitivity-flood-fill", "national-sensitivity-flood-line"],
  combinedSensitivity: ["national-sensitivity-combined"],
} as const;

export const authoritativeHazardLayerControls = [
  ["seismicOfficial", "[OFFICIAL] BIS IS 1893 Seismic Zones"],
  ["cwcGauges", "[OFFICIAL] CWC River Monitoring Gauges"],
  ["floodPlains", "[OFFICIAL] Historical Floodplains (NRSC)"],
  ["erosionCorridors", "[OFFICIAL] Active Riverbank Erosion Corridors"],
  ["landslideEvents", "[OBSERVED] Landslide Events (ISRO/GSI)"],
  ["cycloneTracks", "[OBSERVED] Cyclone Tracks (IBTrACS/IMD)"],
  ["redZones", "[PS191] Red / Orange / Green Classification"],
  ["facilities", "[PS191] Evacuation Facilities (OSM)"],
  ["exposedHabitations", "[DERIVED] Exposed Habitations"],
] as const;

export const authoritativeHazardMapLayerVisibility = {
  seismicOfficial: ["hazard-seismic-fill", "hazard-seismic-line", "hazard-seismic-label"],
  cwcGauges: ["hazard-cwc-circle", "hazard-cwc-label"],
  floodPlains: ["hazard-floodplain-fill", "hazard-floodplain-line"],
  erosionCorridors: ["hazard-erosion-line"],
  landslideEvents: ["hazard-landslide-circle", "hazard-landslide-label"],
  cycloneTracks: ["hazard-cyclone-line", "hazard-cyclone-label"],
  redZones: ["hazard-redzone-fill", "hazard-redzone-line", "hazard-redzone-label"],
  facilities: ["hazard-facility-circle", "hazard-facility-label"],
  exposedHabitations: ["hazard-habitation-circle", "hazard-habitation-label"],
};

export function resolveNationwideMapLayerVisibility(layers: Record<string, boolean>): Record<string, boolean> {
  const combinedMap = {
    ...nationwideMapLayerVisibility,
    ...authoritativeHazardMapLayerVisibility,
  };
  return Object.entries(combinedMap).reduce<Record<string, boolean>>((visibility, [control, mapLayerIds]) => {
    mapLayerIds.forEach(mapLayerId => { visibility[mapLayerId] = Boolean(layers[control]); });
    return visibility;
  }, {});
}

