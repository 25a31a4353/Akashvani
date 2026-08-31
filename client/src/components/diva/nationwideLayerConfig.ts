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

export function resolveNationwideMapLayerVisibility(layers: Record<string, boolean>): Record<string, boolean> {
  return Object.entries(nationwideMapLayerVisibility).reduce<Record<string, boolean>>((visibility, [control, mapLayerIds]) => {
    mapLayerIds.forEach(mapLayerId => { visibility[mapLayerId] = Boolean(layers[control]); });
    return visibility;
  }, {});
}
