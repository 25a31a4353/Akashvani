import type { AssessmentAnalysis, AssessmentArea } from "@shared/diva";
import type { IndiaLocation, IndiaLocationContext } from "@shared/india";

type RouteSource = {
  infrastructure: Array<{ name: string; longitude: number; latitude: number }>;
  nearbyInfrastructure?: Array<{ name: string; longitude: number; latitude: number }>;
};

export type RelocationRoute = {
  coordinates: number[][];
  destinationLabel: string;
  distanceKm: number;
  isPlanningCorridor: true;
  sourceNote: string;
};

export function formatMapMetric(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-IN");
}

export function mapRiskColor(level: string) {
  return level === "Critical" ? "#ff4a4f" : level === "High" ? "#ff8a20" : level === "Moderate" ? "#ffd25c" : "#43c95b";
}

export function getRecommendedSite(analysis: AssessmentAnalysis) {
  return analysis.candidateSites[0] ?? null;
}

export function buildSelectedLocationSummary(context: IndiaLocationContext) {
  const next = context.environment.forecast[0];
  return {
    title: `${context.location.category}: ${context.location.name}`,
    subtitle: context.location.displayName,
    population: context.location.population == null ? "Unavailable" : formatMapMetric(context.location.population),
    risk: context.screening.riskScore == null ? "Unavailable" : `${context.screening.riskScore}/100`,
    riskLevel: context.screening.riskLevel,
    priority: context.screening.priority,
    temperature: context.environment.temperatureC == null ? "Unavailable" : `${context.environment.temperatureC}°C`,
    precipitation: context.environment.precipitationMm == null ? "Unavailable" : `${context.environment.precipitationMm} mm`,
    airQuality: context.environment.usAqi == null ? "Unavailable" : `AQI ${context.environment.usAqi}`,
    nextForecast: next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable",
    facilityCount: context.infrastructure.items.length ? formatMapMetric(context.infrastructure.items.length) : "Unavailable",
    action: context.screening.hazardContext,
    source: context.location.source,
  };
}

function buildPlanningCorridor(origin: { latitude: number; longitude: number }, source: RouteSource, preferredSiteName?: string): RelocationRoute {
  const originPoint: [number, number] = [origin.longitude, origin.latitude];
  const candidates = [...(source.nearbyInfrastructure ?? []), ...source.infrastructure]
    .filter(item => Math.abs(item.longitude - origin.longitude) + Math.abs(item.latitude - origin.latitude) > 0.01)
    .sort((a, b) => (Math.abs(a.longitude - origin.longitude) + Math.abs(a.latitude - origin.latitude)) - (Math.abs(b.longitude - origin.longitude) + Math.abs(b.latitude - origin.latitude)));
  const destination = candidates[0];
  const destinationPoint: [number, number] = destination ? [destination.longitude, destination.latitude] : [origin.longitude + 0.035, origin.latitude + 0.022];
  const distanceKm = Math.round(Math.sqrt(((destinationPoint[0] - originPoint[0]) * 96) ** 2 + ((destinationPoint[1] - originPoint[1]) * 111) ** 2) * 10) / 10;
  const bend: [number, number] = [originPoint[0] + (destinationPoint[0] - originPoint[0]) * 0.46, originPoint[1] + (destinationPoint[1] - originPoint[1]) * 0.46 + 0.008];
  return {
    coordinates: [originPoint, bend, destinationPoint],
    destinationLabel: preferredSiteName ?? destination?.name ?? "Nearest mapped context point",
    distanceKm: Math.max(distanceKm, 2.4),
    isPlanningCorridor: true,
    sourceNote: destination ? `Candidate site coordinates are not yet verified; corridor terminates at nearest mapped context point: ${destination.name}.` : "Candidate site coordinates are not yet verified; corridor uses a planning offset until a mapped destination is supplied.",
  };
}

export function buildRelocationRoute(area: AssessmentArea, source: RouteSource, preferredSiteName?: string): RelocationRoute {
  return buildPlanningCorridor(area, source, preferredSiteName);
}

export function buildLocationPlanningCorridor(location: IndiaLocation, source: RouteSource, preferredSiteName?: string): RelocationRoute {
  return buildPlanningCorridor(location, source, preferredSiteName);
}

export interface VerifiedEvacuationRoute {
  coordinates: number[][];
  destinationLabel: string;
  originLabel: string;
  distanceKm: number | null;
  travelTimeMinutes: number | null;
  isRoadRoute: boolean;
  sourceNote: string;
}

/**
 * Builds verified road evacuation route from OSRM driving geometry.
 * Invariant: Never fabricates road geometry if OSRM is unreachable.
 * If OSRM returned no geometry, returns null so no fake line is drawn.
 */
export function buildVerifiedRoadEvacuationRoute(
  origin: { name: string; latitude: number; longitude: number },
  destination: { name: string; latitude: number; longitude: number },
  osrmResult?: {
    coordinates: number[][];
    routeDistanceKm: number | null;
    travelTimeMinutes: number | null;
    status: string;
  } | null
): VerifiedEvacuationRoute | null {
  if (!origin || !destination || origin.latitude == null || destination.latitude == null) {
    return null;
  }
  if (osrmResult && osrmResult.status === "OK" && osrmResult.coordinates && osrmResult.coordinates.length > 0) {
    return {
      coordinates: osrmResult.coordinates,
      destinationLabel: destination.name,
      originLabel: origin.name,
      distanceKm: osrmResult.routeDistanceKm,
      travelTimeMinutes: osrmResult.travelTimeMinutes,
      isRoadRoute: true,
      sourceNote: `Verified road route via OSRM: ${osrmResult.routeDistanceKm ?? "—"} km (~${osrmResult.travelTimeMinutes ?? "—"} mins). Follows verified road-network geometry.`,
    };
  }
  return null;
}

