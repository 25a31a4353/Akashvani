import type { AssessmentArea } from "../../shared/diva";
import { KERALA_DISTRICT_BOUNDARIES, KERALA_REFERENCE_SOURCES } from "./kerala-boundaries";

const hazards: AssessmentArea["primaryHazard"][] = ["Flood", "Landslide", "Extreme Rainfall", "River Erosion"];
const highTerrainDistricts = new Set(["Wayanad", "Idukki", "Pathanamthitta"]);
const coastalDistricts = new Set(["Alappuzha", "Kollam", "Ernakulam", "Kannur", "Kasaragod", "Kozhikode", "Thiruvananthapuram"]);
const keralaFeatures = KERALA_DISTRICT_BOUNDARIES.features as unknown as Array<{ properties: { id: string; district: string; population: number; households: number; areaKm2: number; populationDensity: number; longitude: number; latitude: number }; geometry: { type: string; coordinates: number[][][] } }>;

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export const KERALA_REFERENCE_TIMESTAMP = "Boundary context: geoBoundaries ADM2 (2021-represented) · Population context: Census 2011";

export function getDemoAreas(): AssessmentArea[] {
  return keralaFeatures.map((feature, index) => {
    const props = feature.properties;
    const terrain = highTerrainDistricts.has(props.district);
    const coastal = coastalDistricts.has(props.district);
    const primaryHazard = terrain ? "Landslide" : coastal ? "Flood" : hazards[index % hazards.length];
    const hazardSeverity = clamp(42 + (terrain ? 28 : 0) + (coastal ? 16 : 0) + (index * 7 % 19), 30, 92);
    return {
      id: props.id,
      name: props.district,
      district: props.district,
      state: "Kerala, India",
      latitude: props.latitude,
      longitude: props.longitude,
      population: props.population,
      households: props.households,
      areaKm2: props.areaKm2,
      populationDensity: props.populationDensity,
      vulnerablePopulation: Math.round(props.population * (terrain ? .25 : .18)),
      primaryHazard,
      hazardSeverity,
      rainfallMm: 0,
      temperatureC: 0,
      aqi: 0,
      hospitalDistanceKm: 0,
      shelterCapacity: Math.round(props.population * .1),
      roadAccessScore: clamp(76 - (terrain ? 22 : 0) - (index * 3 % 14), 35, 85),
      waterAvailabilityScore: clamp(80 - (index * 5 % 18), 45, 88),
      incidentIndex: clamp(hazardSeverity - 8, 20, 86),
      dataStatus: "KERALA REFERENCE CONTEXT + ANALYTICAL DEMONSTRATION",
      updatedAt: KERALA_REFERENCE_TIMESTAMP,
    };
  });
}

export function getDemoArea(id: string) { return getDemoAreas().find(area => area.id === id); }

export function getDemoMapData() {
  const areas = getDemoAreas();
  const featureFor = (district: string) => keralaFeatures.find(feature => feature.properties.district === district);
  const zone = (district: string, label: string, type: string, level: string) => {
    const feature = featureFor(district); const bounds = feature?.geometry.coordinates[0] ?? []; const sampled = bounds.filter((_: unknown, index: number) => index % Math.max(1, Math.floor(bounds.length / 12)) === 0).slice(0, 12); return { id: `HZ-${district.slice(0, 3).toUpperCase()}`, label, type, level, coordinates: sampled.length >= 4 ? [...sampled, sampled[0]] : [] };
  };
  return {
    center: [76.42, 10.42] as [number, number],
    areas,
    districtBoundaries: KERALA_DISTRICT_BOUNDARIES,
    hazards: [
      zone("Wayanad", "Wayanad terrain review zone", "Landslide susceptibility review", "High"),
      zone("Idukki", "Idukki terrain review zone", "Landslide susceptibility review", "Moderate"),
      zone("Alappuzha", "Alappuzha coastal review zone", "Flood exposure review", "High"),
    ].filter(item => item.coordinates.length >= 4),
    roads: [],
    infrastructure: areas.slice(0, 6).map(area => ({ id: `REF-${area.id}`, type: "District reference point", name: `${area.district} district reference`, longitude: area.longitude, latitude: area.latitude })),
    boundary: [[74.85, 8.2], [77.45, 8.2], [77.45, 12.9], [74.85, 12.9], [74.85, 8.2]],
    source: `${KERALA_REFERENCE_SOURCES.boundaries}; ${KERALA_REFERENCE_SOURCES.population}. Hazard review polygons are analytical visual aids, not official hazard maps.`,
    updatedAt: KERALA_REFERENCE_TIMESTAMP,
    status: "KERALA REFERENCE CONTEXT + ANALYTICAL DEMONSTRATION" as const,
  };
}
