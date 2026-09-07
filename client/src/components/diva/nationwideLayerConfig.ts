export const nationwideLayerControls = [
  ["nationalStates", "States & union territories"],
  ["population", "Population density"],
  ["terrain", "Physical terrain"],
  ["liveWeather", "Live weather coverage"],
  ["wind", "10 m wind speed & direction"],
  ["earthquakeSensitivity", "Earthquake sensitivity extent"],
  ["landslideSensitivity", "Landslide sensitivity extent"],
  ["floodSensitivity", "Flood sensitivity extent"],
] as const;

export const nationwideMapLayerVisibility = {
  nationalStates: ["national-state-fill", "national-state-line", "national-state-label"],
  population: ["national-population"],
  terrain: ["national-terrain"],
  liveWeather: ["national-weather-fill", "national-weather-line"],
  wind: ["national-wind-symbol"],
  earthquakeSensitivity: ["national-sensitivity-earthquake-fill", "national-sensitivity-earthquake-line"],
  landslideSensitivity: ["national-sensitivity-landslide-fill", "national-sensitivity-landslide-line"],
  floodSensitivity: ["national-sensitivity-flood-fill", "national-sensitivity-flood-line"],
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
  seismicOfficial: ["hazard-seismic-fill", "hazard-seismic-line"],
  cwcGauges: ["hazard-cwc-circle", "hazard-cwc-label"],
  floodPlains: ["hazard-floodplain-fill", "hazard-floodplain-line"],
  erosionCorridors: ["hazard-erosion-line"],
  landslideEvents: ["hazard-landslide-circle", "hazard-landslide-label"],
  cycloneTracks: ["hazard-cyclone-line", "hazard-cyclone-label"],
  redZones: ["hazard-redzone-fill", "hazard-redzone-line", "hazard-redzone-label"],
  facilities: ["hazard-facility-circle", "hazard-facility-label"],
  exposedHabitations: ["hazard-habitation-circle", "hazard-habitation-label"],
  boundaries: ["boundary-line", "district-fill", "district-line", "selected-location-fill", "selected-location-line"],
  infrastructure: ["infrastructure-points"],
};

export const auditedLayerGroups = [
  {
    label: "India Context",
    items: [
      ["nationalStates", "States & union territories"],
      ["boundaries", "District boundary"],
      ["population", "Population density"],
      ["terrain", "Physical terrain"],
    ] as const,
  },
  {
    label: "PS191 Decision Support",
    items: [
      ["redZones", "Red / Orange / Green classification"],
      ["exposedHabitations", "Exposed habitations"],
      ["facilities", "Evacuation facilities (OSM)"],
    ] as const,
  },
  {
    label: "Authoritative Hazards",
    items: [
      ["seismicOfficial", "BIS IS 1893 Seismic Zones"],
      ["cwcGauges", "CWC River Monitoring Gauges"],
      ["floodPlains", "Historical Floodplains (NRSC)"],
      ["erosionCorridors", "Active Riverbank Erosion Corridors"],
      ["landslideEvents", "Observed Landslide Events (ISRO/GSI)"],
      ["cycloneTracks", "Observed Cyclone Tracks (IBTrACS/IMD)"],
    ] as const,
  },
  {
    label: "Live / Modelled",
    items: [
      ["liveWeather", "Live weather coverage"],
      ["wind", "10 m wind speed & direction"],
      ["earthquakeSensitivity", "Earthquake sensitivity extent"],
      ["landslideSensitivity", "Landslide sensitivity extent"],
      ["floodSensitivity", "Flood sensitivity extent"],
    ] as const,
  },
  {
    label: "Reference",
    items: [
      ["infrastructure", "Critical infrastructure (OSM)"],
    ] as const,
  },
] as const;

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


