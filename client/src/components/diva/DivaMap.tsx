import { IndiaOverviewProvenance } from "@/components/diva/IndiaOverviewProvenance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssessmentArea } from "@shared/diva";
import type { IndiaLocationContext } from "@shared/india";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Crosshair, Expand, LocateFixed, Map as MapIcon, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

type FeatureCollection = { type: "FeatureCollection"; features: ReadonlyArray<{ type: "Feature"; properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }> };
export type MapData = { center: [number, number]; areas: AssessmentArea[]; hazards: Array<{ id: string; label: string; type: string; level: string; coordinates: number[][] }>; roads: number[][][]; infrastructure: Array<{ id: string; type: string; name: string; longitude: number; latitude: number }>; relocationRoute?: { coordinates: number[][]; destinationLabel: string; distanceKm: number; isPlanningCorridor: true; sourceNote: string }; nearbyInfrastructure?: IndiaLocationContext["infrastructure"]["items"]; boundary: number[][]; districtBoundaries?: FeatureCollection; environment?: { latitude: number; longitude: number; temperatureC: number | null; precipitationMm: number | null; usAqi: number | null; status: string }; activeLocation?: IndiaLocationContext; nationwide?: { states: FeatureCollection; weather: FeatureCollection; geology: FeatureCollection; sensitivity: FeatureCollection; imageCoordinates: [[number, number], [number, number], [number, number], [number, number]]; populationImage: string; terrainImage: string; sources: Record<string, string>; statuses: Record<string, string>; hazardLayers?: { seismicZones: FeatureCollection; cwcGauges: FeatureCollection; landslideEvents: FeatureCollection; cycloneTracks: FeatureCollection; floodZones: FeatureCollection; erosionCorridors: FeatureCollection; habitations: FeatureCollection; facilities?: FeatureCollection; }; classificationLayer?: FeatureCollection; updatedAt: string } };
type MapLayerState = Record<string, boolean>;
const emptyCollection: FeatureCollection = { type: "FeatureCollection", features: [] };
const satelliteTileUrl = import.meta.env.VITE_MAP_TILE_URL ?? "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const osmTileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_MAX_ZOOM = 18;
export const clampMapZoom = (zoom: number) => Math.min(Math.max(zoom, 0), MAP_MAX_ZOOM);
const mapStyle: maplibregl.StyleSpecification = { version: 8, sources: { osm: { type: "raster", tiles: [osmTileUrl], tileSize: 256, maxzoom: MAP_MAX_ZOOM, attribution: "© OpenStreetMap contributors" }, satellite: { type: "raster", tiles: [satelliteTileUrl], tileSize: 256, maxzoom: MAP_MAX_ZOOM, attribution: "Tiles © Esri" } }, layers: [{ id: "background", type: "background", paint: { "background-color": "#07141b" } }, { id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.5, "raster-contrast": 0.2, "raster-brightness-min": 0.02, "raster-brightness-max": 0.44, "raster-opacity": 0.96 } }, { id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": 0.04, "raster-contrast": 0.14, "raster-brightness-min": 0.03, "raster-brightness-max": 0.64, "raster-opacity": 0.42 } }] };
const riskColor = (score: number) => score >= 85 ? "#bd3034" : score >= 70 ? "#e66e2d" : score >= 50 ? "#d3a52d" : "#31825d";
const activeZoom = (location?: IndiaLocationContext["location"]) => location?.category === "Locality" ? 11 : location?.category === "City" ? 9.5 : location?.category === "District" ? 8.4 : location ? 7.1 : 6.65;

// Safely update a GeoJSON source without crashing if it doesn't exist yet
function safeSetData(map: MapLibreMap, sourceId: string, data: unknown) {
  try {
    const src = map.getSource(sourceId);
    if (src && src.type === "geojson") {
      (src as maplibregl.GeoJSONSource).setData(data as GeoJSON.FeatureCollection | GeoJSON.Feature);
    }
  } catch {
    // source not yet added or map is being removed — ignore
  }
}

function setVisibility(map: MapLibreMap, id: string, enabled: boolean) { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", enabled ? "visible" : "none"); }
function applyLayers(map: MapLibreMap, layers: MapLayerState, opacity: number, baseStyle: "muted" | "terrain") {
  const layerMap: Array<[string, string]> = [
    ["population-points", "population"], ["boundary-line", "boundaries"], ["district-fill", "boundaries"],
    ["district-line", "boundaries"], ["selected-location-fill", "boundaries"], ["selected-location-line", "boundaries"],
    ["national-terrain", "terrain"], ["national-population", "population"], ["national-state-fill", "nationalStates"],
    ["national-state-line", "nationalStates"], ["national-state-label", "nationalStates"], ["national-weather-fill", "liveWeather"],
    ["national-weather-line", "liveWeather"], ["national-wind-symbol", "wind"],
    ["hazard-redzone-fill", "redZones"], ["hazard-redzone-line", "redZones"], ["hazard-redzone-label", "redZones"],
    ["hazard-seismic-fill", "seismicOfficial"], ["hazard-seismic-line", "seismicOfficial"],
    ["hazard-cwc-circle", "cwcGauges"], ["hazard-cwc-label", "cwcGauges"],
    ["hazard-floodplain-fill", "floodPlains"], ["hazard-floodplain-line", "floodPlains"],
    ["hazard-erosion-line", "erosionCorridors"],
    ["hazard-landslide-circle", "landslideEvents"], ["hazard-landslide-label", "landslideEvents"],
    ["hazard-cyclone-line", "cycloneTracks"], ["hazard-cyclone-label", "cycloneTracks"],
    ["hazard-habitation-circle", "exposedHabitations"], ["hazard-habitation-label", "exposedHabitations"],
    ["hazard-facility-circle", "facilities"], ["hazard-facility-label", "facilities"],
    ["national-sensitivity-earthquake-fill", "earthquakeSensitivity"], ["national-sensitivity-earthquake-line", "earthquakeSensitivity"],
    ["national-sensitivity-landslide-fill", "landslideSensitivity"], ["national-sensitivity-landslide-line", "landslideSensitivity"],
    ["national-sensitivity-flood-fill", "floodSensitivity"], ["national-sensitivity-flood-line", "floodSensitivity"],
    ["infrastructure-points", "infrastructure"],
    ["relocation-route-glow", "routes"], ["relocation-route-line", "routes"], ["relocation-route-destination", "routes"]
  ];
  layerMap.forEach(([id, key]) => setVisibility(map, id, Boolean(layers[key])));
  ["hazard-fill", "landslide-fill", "hazard-redzone-fill", "population-points"].forEach(id => { if (!map.getLayer(id)) return; map.setPaintProperty(id, id.endsWith("fill") ? "fill-opacity" : "circle-opacity", (id === "hazard-redzone-fill" ? 0.38 : id.includes("hazard") || id.includes("landslide") ? 0.2 : 0.56) * opacity); });
  if (map.getLayer("satellite")) { map.setPaintProperty("satellite", "raster-saturation", baseStyle === "terrain" ? 0 : -0.34); map.setPaintProperty("satellite", "raster-contrast", baseStyle === "terrain" ? 0.14 : 0.02); map.setPaintProperty("satellite", "raster-opacity", baseStyle === "terrain" ? 0.56 : 0.42); }
}

export function DivaMap({ data, selectedId, onSelect, layers, opacity, baseStyle, className, showContextPanel = true, zoomOverride }: { data?: MapData; selectedId?: string; onSelect: (id: string) => void; layers: MapLayerState; opacity: number; baseStyle: "muted" | "terrain"; className?: string; showContextPanel?: boolean; zoomOverride?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const mapReadyRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const zoom = zoomOverride ?? activeZoom(data?.activeLocation?.location);

  const sources = useMemo(() => {
    if (!data) return null;
    const active = data.activeLocation;
    return {
      areas: { type: "FeatureCollection" as const, features: (active ? [] : data.areas).map(area => ({ type: "Feature" as const, properties: { ...area, markerColor: riskColor(area.hazardSeverity) }, geometry: { type: "Point" as const, coordinates: [area.longitude, area.latitude] } })) },
      selectedArea: { type: "FeatureCollection" as const, features: (!active ? data.areas.filter(area => area.id === selectedId) : []).map(area => ({ type: "Feature" as const, properties: { ...area }, geometry: { type: "Point" as const, coordinates: [area.longitude, area.latitude] } })) },
      relocationRoute: data.relocationRoute ? { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: { destinationLabel: data.relocationRoute.destinationLabel, distanceKm: data.relocationRoute.distanceKm, isPlanningCorridor: data.relocationRoute.isPlanningCorridor, sourceNote: data.relocationRoute.sourceNote }, geometry: { type: "LineString" as const, coordinates: data.relocationRoute.coordinates } }] } : emptyCollection,
      relocationDestination: data.relocationRoute ? { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: { destinationLabel: data.relocationRoute.destinationLabel, distanceKm: data.relocationRoute.distanceKm, isPlanningCorridor: data.relocationRoute.isPlanningCorridor, sourceNote: data.relocationRoute.sourceNote }, geometry: { type: "Point" as const, coordinates: data.relocationRoute.coordinates.at(-1) ?? data.center } }] } : emptyCollection,
      activeMarker: active ? { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: { id: active.location.id, name: active.location.name, priority: active.screening.priority, riskScore: active.screening.riskScore }, geometry: { type: "Point" as const, coordinates: [active.location.longitude, active.location.latitude] } }] } : emptyCollection,
      hazards: { type: "FeatureCollection" as const, features: (active ? [] : data.hazards).map(hazard => ({ type: "Feature" as const, properties: hazard, geometry: { type: "Polygon" as const, coordinates: [hazard.coordinates] } })) },
      roads: { type: "FeatureCollection" as const, features: (active ? [] : data.roads).map((coordinates, index) => ({ type: "Feature" as const, properties: { id: `RD-${index}` }, geometry: { type: "LineString" as const, coordinates } })) },
      infrastructure: { type: "FeatureCollection" as const, features: (active ? (data.nearbyInfrastructure ?? []) : data.infrastructure).map(item => ({ type: "Feature" as const, properties: item, geometry: { type: "Point" as const, coordinates: [item.longitude, item.latitude] } })) },
      boundary: active?.location.boundary ?? { type: "Feature" as const, properties: { source: "DIVA DEMO DATA" }, geometry: { type: "Polygon" as const, coordinates: [data.boundary] } },
      districts: data.districtBoundaries ?? emptyCollection,
      environmental: data.environment ? { type: "FeatureCollection" as const, features: [{ type: "Feature" as const, properties: data.environment, geometry: { type: "Point" as const, coordinates: [data.environment.longitude, data.environment.latitude] } }] } : emptyCollection,
      selectedLocation: active?.location.boundary ? { type: "FeatureCollection" as const, features: [active.location.boundary] } : emptyCollection,
      states: data.nationwide?.states ?? emptyCollection,
      weather: data.nationwide?.weather ?? emptyCollection,
      geology: data.nationwide?.geology ?? emptyCollection,
      sensitivity: data.nationwide?.sensitivity ?? emptyCollection,
      hazardSeismic: data.nationwide?.hazardLayers?.seismicZones ?? emptyCollection,
      hazardCwc: data.nationwide?.hazardLayers?.cwcGauges ?? emptyCollection,
      hazardLandslides: data.nationwide?.hazardLayers?.landslideEvents ?? emptyCollection,
      hazardCyclones: data.nationwide?.hazardLayers?.cycloneTracks ?? emptyCollection,
      hazardFloodplains: data.nationwide?.hazardLayers?.floodZones ?? emptyCollection,
      hazardErosion: data.nationwide?.hazardLayers?.erosionCorridors ?? emptyCollection,
      hazardHabitations: data.nationwide?.hazardLayers?.habitations ?? emptyCollection,
      hazardFacilities: data.nationwide?.hazardLayers?.facilities ?? emptyCollection,
      hazardClassification: data.nationwide?.classificationLayer ?? emptyCollection,
    };
  }, [data, selectedId]);

  // ── Map initialization — runs ONCE per mount ──────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !data || !sources) return;

    const initialCenter = data.center;
    const initialZoom = clampMapZoom(zoomOverride ?? activeZoom(data.activeLocation?.location));

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: initialCenter,
      zoom: initialZoom,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: false,
    });
    mapRef.current = map;
    mapReadyRef.current = false;

    const resize = () => map.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    if (containerRef.current.parentElement) observer.observe(containerRef.current.parentElement);
    const timer = window.setTimeout(resize, 250);

    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      if (!mapRef.current) return; // unmounted before load fired

      const add = (id: string, source: unknown) => map.addSource(id, { type: "geojson", data: source as GeoJSON.FeatureCollection | GeoJSON.Feature });
      add("areas", sources.areas);
      add("selected-area", sources.selectedArea);
      add("relocation-route", sources.relocationRoute);
      add("relocation-destination", sources.relocationDestination);
      add("active-marker", sources.activeMarker);
      add("hazards", sources.hazards);
      add("roads", sources.roads);
      add("infrastructure", sources.infrastructure);
      add("boundary", sources.boundary);
      add("districts", sources.districts);
      add("environmental", sources.environmental);
      add("selected-location", sources.selectedLocation);
      add("states", sources.states);
      add("weather", sources.weather);
      add("geology", sources.geology);
      add("sensitivity", sources.sensitivity);
      add("hazard-seismic", sources.hazardSeismic);
      add("hazard-cwc", sources.hazardCwc);
      add("hazard-landslides", sources.hazardLandslides);
      add("hazard-cyclones", sources.hazardCyclones);
      add("hazard-floodplains", sources.hazardFloodplains);
      add("hazard-erosion", sources.hazardErosion);
      add("hazard-habitations", sources.hazardHabitations);
      add("hazard-facilities", sources.hazardFacilities);
      add("hazard-redzones", sources.hazardClassification);

      if (data.nationwide) {
        map.addSource("national-terrain", { type: "image", url: data.nationwide.terrainImage, coordinates: data.nationwide.imageCoordinates });
        map.addSource("national-population", { type: "image", url: data.nationwide.populationImage, coordinates: data.nationwide.imageCoordinates });
        map.addLayer({ id: "national-terrain", type: "raster", source: "national-terrain", paint: { "raster-opacity": 0.48 } });
        map.addLayer({ id: "national-population", type: "raster", source: "national-population", paint: { "raster-opacity": 0.56 } });
      }

      // national-geology removed — no toggle, always-on, low-value overlay
      map.addLayer({ id: "national-state-fill", type: "fill", source: "states", paint: { "fill-color": "#cf4c3f", "fill-opacity": 0.035 } });
      map.addLayer({ id: "national-state-line", type: "line", source: "states", paint: { "line-color": "#24485a", "line-width": 1.15 } });
      map.addLayer({ id: "national-state-label", type: "symbol", source: "states", layout: { "text-field": ["get", "stateName"], "text-size": 9 }, paint: { "text-color": "#153847", "text-halo-color": "#ffffff", "text-halo-width": 1.1 } });
      map.addLayer({ id: "hazard-redzone-fill", type: "fill", source: "hazard-redzones", paint: { "fill-color": ["match", ["get", "classification"], "RED", "#c62828", "ORANGE", "#e65100", "GREEN", "#2e7d32", "rgba(0,0,0,0)"], "fill-opacity": 0.38 } });
      map.addLayer({ id: "hazard-redzone-line", type: "line", source: "hazard-redzones", paint: { "line-color": ["match", ["get", "classification"], "RED", "#b71c1c", "ORANGE", "#bf360c", "GREEN", "#1b5e20", "rgba(0,0,0,0)"], "line-width": 1.8 } });
      map.addLayer({ id: "hazard-redzone-label", type: "symbol", source: "hazard-redzones", layout: { "text-field": ["concat", ["get", "areaName"], " [", ["get", "classification"], "]"], "text-size": 9.5, "text-offset": [0, 0], "text-anchor": "center" }, paint: { "text-color": ["match", ["get", "classification"], "RED", "#b71c1c", "ORANGE", "#bf360c", "GREEN", "#1b5e20", "#333333"], "text-halo-color": "#ffffff", "text-halo-width": 1.2 } });
      map.addLayer({ id: "hazard-seismic-fill", type: "fill", source: "hazard-seismic", paint: { "fill-color": ["match", ["get", "zone"], "ZONE_V", "#9c27b0", "ZONE_IV", "#e91e63", "#ff9800"], "fill-opacity": 0.16 } });
      map.addLayer({ id: "hazard-seismic-line", type: "line", source: "hazard-seismic", paint: { "line-color": "#ab47bc", "line-width": 1.15 } });
      map.addLayer({ id: "hazard-floodplain-fill", type: "fill", source: "hazard-floodplains", paint: { "fill-color": "#1976d2", "fill-opacity": 0.22 } });
      map.addLayer({ id: "hazard-floodplain-line", type: "line", source: "hazard-floodplains", paint: { "line-color": "#1565c0", "line-width": 1.4 } });
      map.addLayer({ id: "hazard-erosion-line", type: "line", source: "hazard-erosion", paint: { "line-color": "#d81b60", "line-width": 2.2, "line-dasharray": [2, 2] } });
      map.addLayer({ id: "hazard-cyclone-line", type: "line", source: "hazard-cyclones", paint: { "line-color": "#00897b", "line-width": 2.0, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "hazard-cyclone-label", type: "symbol", source: "hazard-cyclones", layout: { "text-field": ["get", "name"], "text-size": 9 }, paint: { "text-color": "#004d40", "text-halo-color": "#ffffff", "text-halo-width": 1 } });
      map.addLayer({ id: "hazard-cwc-circle", type: "circle", source: "hazard-cwc", paint: { "circle-radius": 5.5, "circle-color": "#00acc1", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });
      map.addLayer({ id: "hazard-cwc-label", type: "symbol", source: "hazard-cwc", layout: { "text-field": ["get", "name"], "text-size": 9, "text-offset": [0, 1.2] }, paint: { "text-color": "#006064", "text-halo-color": "#ffffff", "text-halo-width": 1 } });
      map.addLayer({ id: "hazard-landslide-circle", type: "circle", source: "hazard-landslides", paint: { "circle-radius": 6.5, "circle-color": "#e53935", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.8 } });
      map.addLayer({ id: "hazard-landslide-label", type: "symbol", source: "hazard-landslides", layout: { "text-field": ["get", "name"], "text-size": 9, "text-offset": [0, 1.2] }, paint: { "text-color": "#b71c1c", "text-halo-color": "#ffffff", "text-halo-width": 1 } });
      map.addLayer({ id: "hazard-habitation-circle", type: "circle", source: "hazard-habitations", paint: { "circle-radius": 5, "circle-color": "#fb8c00", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.2 } });
      map.addLayer({ id: "hazard-habitation-label", type: "symbol", source: "hazard-habitations", layout: { "text-field": ["get", "name"], "text-size": 8.5, "text-offset": [0, 1.2] }, paint: { "text-color": "#e65100", "text-halo-color": "#ffffff", "text-halo-width": 1 } });
      map.addLayer({ id: "hazard-facility-circle", type: "circle", source: "hazard-facilities", paint: { "circle-radius": 6.5, "circle-color": ["match", ["get", "suitability"], "PREFERRED", "#15803d", "CONDITIONAL", "#ea580c", "UNSUITABLE", "#b91c1c", "#475569"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addLayer({ id: "hazard-facility-label", type: "symbol", source: "hazard-facilities", layout: { "text-field": ["get", "name"], "text-size": 8.5, "text-offset": [0, 1.25], "text-anchor": "top" }, paint: { "text-color": "#1e3a8a", "text-halo-color": "#ffffff", "text-halo-width": 1.4 } });
      map.addLayer({ id: "national-weather-fill", type: "fill", source: "weather", paint: { "fill-color": ["interpolate", ["linear"], ["coalesce", ["get", "temperatureC"], 0], 10, "#5ba96a", 22, "#d1cf50", 30, "#f68f37", 38, "#c83f36"], "fill-opacity": 0.34 } });
      map.addLayer({ id: "national-weather-line", type: "line", source: "weather", paint: { "line-color": "#ffffff", "line-opacity": 0.65, "line-width": 0.6 } });
      map.addLayer({ id: "national-wind-symbol", type: "symbol", source: "weather", layout: { "text-field": "↟", "text-size": 13, "text-rotate": ["coalesce", ["get", "windDirectionDegrees"], 0] }, paint: { "text-color": "#133e59", "text-halo-color": "#ffffff", "text-halo-width": 1 } });
      (["earthquake", "landslide", "flood"] as const).forEach(kind => {
        const hazard = `${kind[0].toUpperCase()}${kind.slice(1)} sensitivity`;
        const color = kind === "earthquake" ? "#8b3f72" : kind === "landslide" ? "#a76932" : "#267da0";
        map.addLayer({ id: `national-sensitivity-${kind}-fill`, type: "fill", source: "sensitivity", filter: ["==", ["get", "hazard"], hazard], paint: { "fill-color": color, "fill-opacity": 0.19 } });
        map.addLayer({ id: `national-sensitivity-${kind}-line`, type: "line", source: "sensitivity", filter: ["==", ["get", "hazard"], hazard], paint: { "line-color": color, "line-width": 1.25, "line-dasharray": [3, 2] } });
      });
      // national-sensitivity-combined removed — redundant with individual earthquake/landslide/flood toggles
      map.addLayer({ id: "roads", type: "line", source: "roads", layout: { "visibility": "none" }, paint: { "line-color": "#f3f7ef", "line-width": 1.35, "line-opacity": 0.82, "line-dasharray": [2.5, 2.5] } });
      map.addLayer({ id: "relocation-route-glow", type: "line", source: "relocation-route", paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.2, "line-blur": 1.4 } });
      map.addLayer({ id: "relocation-route-line", type: "line", source: "relocation-route", paint: { "line-color": "#ffffff", "line-width": 2.2, "line-opacity": 0.96, "line-dasharray": [1.1, 1.25] } });
      map.addLayer({ id: "relocation-route-destination", type: "circle", source: "relocation-destination", paint: { "circle-radius": 6, "circle-color": "#55d46b", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addLayer({ id: "boundary-line", type: "line", source: "boundary", paint: { "line-color": "#a8d4b0", "line-width": 1.35, "line-dasharray": [3, 2] } });
      map.addLayer({ id: "district-fill", type: "fill", source: "districts", paint: { "fill-color": "#4e96aa", "fill-opacity": 0.05 } });
      map.addLayer({ id: "district-line", type: "line", source: "districts", paint: { "line-color": "#356b7c", "line-width": 1.05 } });
      map.addLayer({ id: "selected-location-fill", type: "fill", source: "selected-location", paint: { "fill-color": "#2f8aa0", "fill-opacity": 0.12 } });
      map.addLayer({ id: "selected-location-line", type: "line", source: "selected-location", paint: { "line-color": "#155b75", "line-width": 2.2 } });
      map.addLayer({ id: "active-marker", type: "circle", source: "active-marker", paint: { "circle-radius": 9, "circle-color": "#1d788d", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.3 } });
      map.addLayer({ id: "hazard-fill", type: "fill", source: "hazards", layout: { "visibility": "none" }, filter: ["!=", ["get", "type"], "Landslide"], paint: { "fill-color": ["match", ["get", "level"], "Critical", "#d9534f", "High", "#e58b3a", "Moderate", "#edc856", "#e58b3a"], "fill-opacity": 0.2 } });
      map.addLayer({ id: "hazard-line", type: "line", source: "hazards", layout: { "visibility": "none" }, filter: ["!=", ["get", "type"], "Landslide"], paint: { "line-color": "#bc7041", "line-width": 1.2 } });
      map.addLayer({ id: "landslide-fill", type: "fill", source: "hazards", layout: { "visibility": "none" }, filter: ["==", ["get", "type"], "Landslide"], paint: { "fill-color": "#bd3034", "fill-opacity": 0.2 } });
      map.addLayer({ id: "landslide-line", type: "line", source: "hazards", layout: { "visibility": "none" }, filter: ["==", ["get", "type"], "Landslide"], paint: { "line-color": "#984b2d", "line-width": 1.2 } });
      map.addLayer({ id: "population-points", type: "circle", source: "areas", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "populationDensity"], 800, 5, 2200, 10, 5000, 17], "circle-color": ["get", "markerColor"], "circle-opacity": 0.78, "circle-stroke-color": "#f7fff5", "circle-stroke-width": 1.2 } });
      map.addLayer({ id: "selected-area-ring", type: "circle", source: "selected-area", paint: { "circle-radius": 15, "circle-color": "#ffffff", "circle-opacity": 0.18, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.2 } });
      map.addLayer({ id: "selected-area-core", type: "circle", source: "selected-area", paint: { "circle-radius": 7, "circle-color": "#ff4a4f", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.2 } });
      map.addLayer({ id: "assessment-labels", type: "symbol", source: "areas", layout: { "text-field": ["get", "name"], "text-size": 10, "text-offset": [0, 1.35], "text-anchor": "top" }, paint: { "text-color": "#ffffff", "text-halo-color": "#10232a", "text-halo-width": 1.4, "text-opacity": 0.92 } });
      // vulnerable-points, rainfall-points, temperature-points, aqi-points removed
      // — orphan layers with no toggle mapping, drawn from DIVA demo areas source (empty in India context mode)
      map.addLayer({ id: "infrastructure-points", type: "circle", source: "infrastructure", paint: { "circle-radius": 6, "circle-color": "#163e5b", "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });

      // Click handlers
      map.on("click", "population-points", event => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("click", "hazard-redzone-fill", event => {
        const feat = event.features?.[0];
        if (!feat || !feat.properties) return;
        const p = feat.properties as Record<string, unknown>;
        const name = String(p.areaName || p.areaId || "Habitation");
        const classification = String(p.classification || "UNAVAILABLE");
        const tier = String(p.redZoneTier || "N/A");
        const score = p.score !== undefined ? `${p.score}/100` : "N/A";
        const state = String(p.state || "");
        const district = String(p.district || "");
        let dominantHazardsStr = "None";
        if (p.dominantHazards) { dominantHazardsStr = typeof p.dominantHazards === "string" ? p.dominantHazards : (Array.isArray(p.dominantHazards) ? p.dominantHazards.join(", ") : String(p.dominantHazards)); }
        let triggersStr = "None";
        if (p.deterministicTriggers) { triggersStr = typeof p.deterministicTriggers === "string" ? p.deterministicTriggers : (Array.isArray(p.deterministicTriggers) ? p.deterministicTriggers.join(", ") : String(p.deterministicTriggers)); }
        const resolution = String(p.spatialResolution || "DISTRICT");
        const evidence = String(p.evidenceStatus || "DERIVED");
        const limitations = String(p.limitations || "");
        const badgeColor = classification === "RED" ? "#c62828" : classification === "ORANGE" ? "#e65100" : classification === "GREEN" ? "#2e7d32" : "#555555";
        const popupHtml = `<div style="font-family:inherit;padding:4px;max-width:280px;color:#1e293b"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px"><strong style="font-size:13px;color:#0f172a">${name}</strong><span style="background:${badgeColor};color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px">${classification}</span></div><div style="font-size:11px;color:#64748b;margin-bottom:6px">${district}, ${state}</div><div style="font-size:11px;display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;background:#f8fafc;padding:6px;border-radius:6px;border:1px solid #e2e8f0"><div><strong>Tier:</strong> ${tier}</div><div><strong>Score:</strong> ${score}</div><div><strong>Status:</strong> ${evidence}</div><div><strong>Resolution:</strong> ${resolution}</div></div>${dominantHazardsStr !== "None" && dominantHazardsStr !== "[]" ? `<div style="font-size:10.5px;margin-bottom:4px"><strong>Hazards:</strong> ${dominantHazardsStr}</div>` : ""}${triggersStr !== "None" && triggersStr !== "[]" ? `<div style="font-size:10.5px;margin-bottom:4px;color:#b91c1c"><strong>Triggers:</strong> ${triggersStr}</div>` : ""}<div style="margin-top:6px;padding:4px 6px;background:#e0f2fe;border-radius:4px;font-size:9px;color:#0369a1;font-weight:600">PS191 Carrying Capacity: See Sidebar Decision Panel</div><div style="font-size:9px;color:#94a3b8;margin-top:6px;border-top:1px solid #e2e8f0;padding-top:4px"><em>Administrative Resolution: ${resolution}. ${limitations}</em></div></div>`;
        new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" }).setLngLat(event.lngLat).setHTML(popupHtml).addTo(map);
      });
      map.on("mouseenter", "hazard-redzone-fill", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "hazard-redzone-fill", () => { map.getCanvas().style.cursor = ""; });
      map.on("click", "hazard-facility-circle", event => {
        const feat = event.features?.[0];
        if (!feat || !feat.properties) return;
        const p = feat.properties as Record<string, unknown>;
        const name = String(p.name || "Evacuation Facility");
        const role = String(p.role || "UNKNOWN").replace(/_/g, " ");
        const suitability = String(p.suitability || "UNKNOWN");
        const tier = String(p.hazardTier || "UNSCREENED");
        const score = p.hazardScore !== null && p.hazardScore !== undefined ? `${p.hazardScore}/100` : "N/A";
        const note = String(p.note || "");
        const source = String(p.source || "OpenStreetMap");
        const badgeColor = suitability === "PREFERRED" ? "#15803d" : suitability === "CONDITIONAL" ? "#ea580c" : suitability === "UNSUITABLE" ? "#b91c1c" : "#64748b";
        const popupHtml = `<div style="font-family:inherit;padding:4px;max-width:280px;color:#1e293b"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px"><strong style="font-size:12px;color:#0f172a">${name}</strong><span style="background:${badgeColor};color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px">${suitability}</span></div><div style="font-size:10.5px;color:#475569;margin-bottom:6px">Role: <strong>${role}</strong></div><div style="font-size:10px;background:#f8fafc;padding:5px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:6px"><div><strong>Hazard screening:</strong> ${tier} (${score})</div><div><strong>Capacity:</strong> <span style="color:#64748b">UNAVAILABLE from OSM</span></div></div><div style="font-size:9.5px;color:#334155;line-height:1.3;margin-bottom:4px">${note}</div><div style="font-size:8.5px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:4px">Source: ${source}</div></div>`;
        new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px" }).setLngLat(event.lngLat).setHTML(popupHtml).addTo(map);
      });
      map.on("mouseenter", "hazard-facility-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "hazard-facility-circle", () => { map.getCanvas().style.cursor = ""; });

      // Apply initial layer visibility and fly to active location if any
      applyLayers(map, layers, opacity, baseStyle);
      if (data.activeLocation?.location.boundingBox) {
        const [south, west, north, east] = data.activeLocation.location.boundingBox;
        map.fitBounds([[west, south], [east, north]], { padding: 56, maxZoom: initialZoom, duration: 0 });
      }

      mapReadyRef.current = true;
    });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      mapReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — map mounts once per DOM container

  // ── Update GeoJSON sources when data/selectedId changes ───────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sources) return;
    const doUpdate = () => {
      safeSetData(map, "areas", sources.areas);
      safeSetData(map, "selected-area", sources.selectedArea);
      safeSetData(map, "relocation-route", sources.relocationRoute);
      safeSetData(map, "relocation-destination", sources.relocationDestination);
      safeSetData(map, "active-marker", sources.activeMarker);
      safeSetData(map, "hazards", sources.hazards);
      safeSetData(map, "roads", sources.roads);
      safeSetData(map, "infrastructure", sources.infrastructure);
      safeSetData(map, "boundary", sources.boundary);
      safeSetData(map, "districts", sources.districts);
      safeSetData(map, "environmental", sources.environmental);
      safeSetData(map, "selected-location", sources.selectedLocation);
      safeSetData(map, "states", sources.states);
      safeSetData(map, "weather", sources.weather);
      safeSetData(map, "geology", sources.geology);
      safeSetData(map, "sensitivity", sources.sensitivity);
      safeSetData(map, "hazard-seismic", sources.hazardSeismic);
      safeSetData(map, "hazard-cwc", sources.hazardCwc);
      safeSetData(map, "hazard-landslides", sources.hazardLandslides);
      safeSetData(map, "hazard-cyclones", sources.hazardCyclones);
      safeSetData(map, "hazard-floodplains", sources.hazardFloodplains);
      safeSetData(map, "hazard-erosion", sources.hazardErosion);
      safeSetData(map, "hazard-habitations", sources.hazardHabitations);
      safeSetData(map, "hazard-facilities", sources.hazardFacilities);
      safeSetData(map, "hazard-redzones", sources.hazardClassification);
    };
    if (map.isStyleLoaded()) {
      doUpdate();
    } else {
      map.once("load", doUpdate);
    }
  }, [sources]);

  // ── Update layer visibility / opacity / base style ────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyLayers(map, layers, opacity, baseStyle);
  }, [layers, opacity, baseStyle]);

  // ── Fly to new active location ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const location = data?.activeLocation?.location;
    if (!map || !location) return;
    const doFly = () => {
      if (!mapRef.current) return;
      if (location.boundingBox) {
        const [south, west, north, east] = location.boundingBox;
        map.fitBounds([[west, south], [east, north]], { padding: 56, maxZoom: activeZoom(location), duration: 720 });
      } else {
        map.flyTo({ center: [location.longitude, location.latitude], zoom: activeZoom(location), duration: 720, essential: true });
      }
    };
    if (map.isStyleLoaded()) {
      doFly();
    } else {
      map.once("load", doFly);
    }
  }, [data?.activeLocation]);

  const changeZoom = useCallback((delta: number) => {
    const map = mapRef.current;
    if (map) map.zoomTo(clampMapZoom((map.getZoom() ?? zoom) + delta), { duration: 250 });
  }, [zoom]);

  return (
    <div className={cn("relative overflow-hidden bg-[#07141b]", className)}>
      <div
        ref={containerRef}
        data-testid="india-gis-map"
        data-map-mode={data?.nationwide ? "nationwide" : "selected-location"}
        data-active-layers={Object.entries(layers).filter(([, enabled]) => enabled).map(([key]) => key).join(",")}
        data-map-max-zoom={MAP_MAX_ZOOM}
        className="absolute inset-0 h-full w-full"
        style={{ position: "absolute", inset: 0 }}
        aria-label="Interactive India GIS map"
      />
      {/* Location decision context panel — fixed text colors for dark background */}
      {showContextPanel && data?.activeLocation && (
        <div data-testid="map-location-decision-context" className="pointer-events-none absolute right-16 top-16 z-10 w-[244px] rounded-xl border border-[#476571] bg-[#081720]/95 p-3 text-[#dcebf0] shadow-2xl backdrop-blur">
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Location decision context</p>
          <p className="mt-1 text-xs font-bold">{data.activeLocation.location.name}</p>
          <p className="mt-0.5 text-[10px] text-[#6d838d]">{data.activeLocation.location.category} · {data.activeLocation.location.address.state ?? "India"}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
            <span className="rounded bg-[#0f2e3a] px-2 py-1 text-[#c8dde4]">Population: {data.activeLocation.location.population?.toLocaleString("en-IN") ?? "Unavailable"}</span>
            <span className="rounded bg-[#0f2e3a] px-2 py-1 text-[#c8dde4]">Priority: {data.activeLocation.screening.priority}</span>
            <span className="rounded bg-[#12303e] px-2 py-1 text-[#c8dde4]">{data.activeLocation.environment.temperatureC ?? "—"}°C</span>
            <span className="rounded bg-[#12303e] px-2 py-1 text-[#c8dde4]">Rain: {data.activeLocation.environment.precipitationMm ?? "—"} mm</span>
            <span className="rounded bg-[#12303e] px-2 py-1 text-[#c8dde4]">Next max: {data.activeLocation.environment.forecast[0]?.temperatureMaxC ?? "—"}°C</span>
            <span className="rounded bg-[#12303e] px-2 py-1 text-[#c8dde4]">Wind: {data.activeLocation.environment.forecast[0]?.windSpeedMaxKph ?? "—"} km/h</span>
          </div>
          <p className="mt-2 text-[9px] font-semibold leading-snug text-[#52717e]">Modelled forecast updated {data.activeLocation.environment.observedAt ? new Date(data.activeLocation.environment.observedAt).toLocaleString("en-IN") : "unavailable"}</p>
          <p className="mt-2 text-[9px] leading-snug text-[#6a808a]">{data.activeLocation.screening.hazardContext}</p>
        </div>
      )}
      {/* Zoom controls */}
      <div className="absolute right-4 top-4 z-20 flex flex-col overflow-hidden rounded-xl border border-[#395460] bg-[#0b202a]/90 shadow-2xl backdrop-blur">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-b border-[#2b4651] text-[#d8e9ed] hover:bg-[#153440] hover:text-white" aria-label="Zoom in" onClick={() => changeZoom(1)}><Plus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-b border-[#2b4651] text-[#d8e9ed] hover:bg-[#153440] hover:text-white" aria-label="Zoom out" onClick={() => changeZoom(-1)}><Minus className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none border-b border-[#2b4651] text-[#d8e9ed] hover:bg-[#153440] hover:text-white" aria-label="Reset map view" onClick={() => mapRef.current?.flyTo({ center: data?.center, zoom: clampMapZoom(zoom), duration: 650 })}><RotateCcw className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none text-[#d8e9ed] hover:bg-[#153440] hover:text-white" aria-label="Toggle fullscreen map" onClick={() => containerRef.current?.requestFullscreen()}><Expand className="h-4 w-4" /></Button>
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-lg border border-[#415c67] bg-[#081720]/90 px-2.5 py-1.5 text-[10px] font-medium text-[#b4c9ce] shadow-lg backdrop-blur"><MapIcon className="h-3.5 w-3.5 text-[#77cc81]" /> Satellite imagery · Esri</div>
      {data?.activeLocation?.location.boundary && <div data-testid="map-boundary-status" className="pointer-events-none absolute bottom-14 left-4 z-10 rounded-lg border border-[#415c67] bg-[#081720]/90 px-2.5 py-1.5 text-[10px] font-semibold text-[#c6dadd]">Boundary rendered · {data.activeLocation.location.name} state extent</div>}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-lg border border-[#415c67] bg-[#081720]/90 px-2.5 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#add7b0] shadow-lg backdrop-blur"><Crosshair className="h-3.5 w-3.5" /> INDIA LOCATION CONTEXT</div>
      {data?.relocationRoute && <div className="pointer-events-none absolute bottom-14 left-4 z-10 max-w-[270px] rounded-lg border border-[#415c67] bg-[#081720]/90 px-2.5 py-1.5 text-[9px] font-medium text-[#c6dadd] shadow-lg backdrop-blur"><span className="font-bold text-white">Planning corridor</span> · {data.relocationRoute.distanceKm} km · destination coordinates pending verification</div>}
      {data?.nationwide ? <IndiaOverviewProvenance sources={data.nationwide.sources} statuses={data.nationwide.statuses} updatedAt={data.nationwide.updatedAt} /> : <div className="pointer-events-none absolute bottom-14 right-4 z-10 hidden items-center gap-1.5 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-[#547080] lg:flex"><LocateFixed className="h-3 w-3" /> Coordinates WGS84</div>}
    </div>
  );
}
