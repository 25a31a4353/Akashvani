/**
 * Deterministic Location Signature & Anti-Leakage Validation (Phases 4, 15, 16)
 *
 * Prevents stale responses, cross-state route rendering, and demographic/facility
 * data mismatches across all ResQ subsystems.
 */

export interface LocationIdentity {
  locationId?: string;
  id?: string;
  name?: string;
  state?: string;
  district?: string;
  latitude: number;
  longitude: number;
  address?: {
    state?: string;
    district?: string;
    city?: string;
  };
}

export function buildLocationSignature(loc: LocationIdentity): string {
  const state = loc.state || loc.address?.state || "";
  const district = loc.district || loc.address?.district || loc.address?.city || "";
  const locationId = loc.locationId || loc.id || loc.name || "";
  const lat = Number(loc.latitude).toFixed(4);
  const lon = Number(loc.longitude).toFixed(4);
  return `${state.trim().toLowerCase()}::${district.trim().toLowerCase()}::${locationId.trim().toLowerCase()}::${lat}::${lon}`;
}

export function validateLocationConsistency(
  current: LocationIdentity,
  incoming: LocationIdentity
): boolean {
  if (!current || !incoming) return false;
  return buildLocationSignature(current) === buildLocationSignature(incoming);
}
