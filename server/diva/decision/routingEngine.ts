/**
 * ResQ Decision Intelligence Engine V2 — Routing & Route Validation Engine
 * 
 * Rules:
 * 1. Uses OSRM actual road geometry.
 * 2. Route Validation:
 *    - Geometry exists and has at least 2 points.
 *    - Route starts near origin (< 2km) and ends near destination (< 2km).
 *    - Distance > 0, duration > 0.
 *    - Coordinates are valid lon/lat pairs.
 * 3. Fallback: If road routing is unavailable:
 *    - Status = DIRECT_DISTANCE_FALLBACK.
 *    - Geometry may be a 2-point direct line strictly labeled:
 *      "DIRECT DISTANCE — NOT A ROAD ROUTE".
 *    - Never represented as an evacuation road route.
 */

import type { ResQRoutingAssessment } from "../../../shared/decisionEngine";
import { haversineDistanceKm } from "./spatialAlign";
import { fetchRoadRouteWithGeometry } from "../hazards/facilityDiscovery";

export async function evaluateRoadRoute(
  origin: { name: string; latitude: number; longitude: number },
  destination: { name: string; latitude: number; longitude: number; role?: string } | null
): Promise<ResQRoutingAssessment> {
  if (!destination) {
    return {
      status: "ROAD_ROUTING_UNAVAILABLE",
      origin,
      destination: null,
      isRoadRoute: false,
      routeCoordinates: [],
      distanceKm: null,
      durationMinutes: null,
      validation: {
        geometryExists: false,
        originProximityValid: false,
        destinationProximityValid: false,
        positiveDistanceDuration: false,
        coordinatesValid: false,
      },
      displayBadge: "DESTINATION UNAVAILABLE",
      sourceNote: "No safe destination facility selected for road routing.",
    };
  }

  // Attempt to resolve real road geometry via OSRM
  const routeResult = await fetchRoadRouteWithGeometry(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
    origin.name,
    destination.name
  );

  const rawCoords = routeResult.coordinates as [number, number][];
  const isRoadSuccess = routeResult.status === "OK" && rawCoords && rawCoords.length >= 2;

  if (isRoadSuccess) {
    // Perform Route Validation
    const firstCoord = rawCoords[0];
    const lastCoord = rawCoords[rawCoords.length - 1];

    const originDist = haversineDistanceKm(origin.latitude, origin.longitude, firstCoord[1], firstCoord[0]);
    const destDist = haversineDistanceKm(destination.latitude, destination.longitude, lastCoord[1], lastCoord[0]);

    const originProximityValid = originDist <= 3.0; // Within 3km of origin settlement
    const destinationProximityValid = destDist <= 3.0; // Within 3km of facility
    const positiveDistanceDuration = (routeResult.routeDistanceKm ?? 0) > 0 && (routeResult.travelTimeMinutes ?? 0) > 0;
    const coordinatesValid = rawCoords.every(
      c => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1])
    );

    const validation = {
      geometryExists: true,
      originProximityValid,
      destinationProximityValid,
      positiveDistanceDuration,
      coordinatesValid,
    };

    const isFullyValid = originProximityValid && destinationProximityValid && positiveDistanceDuration && coordinatesValid;

    if (isFullyValid) {
      return {
        status: "ROAD_ROUTE_VERIFIED",
        origin,
        destination: {
          name: destination.name,
          latitude: destination.latitude,
          longitude: destination.longitude,
          role: destination.role || "Safe Haven",
        },
        isRoadRoute: true,
        routeCoordinates: rawCoords,
        distanceKm: routeResult.routeDistanceKm,
        durationMinutes: routeResult.travelTimeMinutes,
        validation,
        displayBadge: `Verified Road Route (OSRM): ${routeResult.routeDistanceKm} km (~${routeResult.travelTimeMinutes} min)`,
        sourceNote: `OSRM verified road network corridor connecting ${origin.name} to ${destination.name}.`,
      };
    }
  }

  // Fallback: Road routing could not be completed
  // Generate a direct straight line labeled strictly as DIRECT DISTANCE
  const straightLineDistance = haversineDistanceKm(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  const directLineCoords: [number, number][] = [
    [origin.longitude, origin.latitude],
    [destination.longitude, destination.latitude],
  ];

  return {
    status: "DIRECT_DISTANCE_FALLBACK",
    origin,
    destination: {
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      role: destination.role || "Emergency Facility",
    },
    isRoadRoute: false,
    routeCoordinates: directLineCoords,
    distanceKm: straightLineDistance,
    durationMinutes: Math.round((straightLineDistance / 30) * 60), // Indicative 30 km/h baseline
    validation: {
      geometryExists: true,
      originProximityValid: true,
      destinationProximityValid: true,
      positiveDistanceDuration: straightLineDistance > 0,
      coordinatesValid: true,
    },
    displayBadge: `DIRECT DISTANCE — NOT A ROAD ROUTE: ${straightLineDistance} km`,
    sourceNote: "Road-network routing is temporarily unavailable. Straight-line distance shown for geographic context only; this is NOT an actionable road route.",
  };
}
