import { describe, expect, it } from "vitest";
import { getIndiaLocationContext } from "./india";

const BENCHMARK_LOCATIONS = [
  {
    name: "Dibrugarh, Assam",
    location: {
      id: "india-dibrugarh",
      name: "Dibrugarh",
      displayName: "Dibrugarh, Assam, India",
      category: "City" as const,
      latitude: 27.4728,
      longitude: 94.9120,
      population: 154000,
      populationSource: "Census / Geocoding",
      boundingBox: null,
      boundary: null,
      address: { state: "Assam", city: "Dibrugarh" },
      source: "OpenStreetMap"
    }
  },
  {
    name: "Wayanad, Kerala",
    location: {
      id: "india-wayanad",
      name: "Wayanad",
      displayName: "Wayanad, Kerala, India",
      category: "District" as const,
      latitude: 11.6854,
      longitude: 76.1320,
      population: 817420,
      populationSource: "Census / Geocoding",
      boundingBox: null,
      boundary: null,
      address: { state: "Kerala", city: "Kalpetta" },
      source: "OpenStreetMap"
    }
  },
  {
    name: "Puri, Odisha",
    location: {
      id: "india-puri",
      name: "Puri",
      displayName: "Puri, Odisha, India",
      category: "City" as const,
      latitude: 19.8135,
      longitude: 85.8312,
      population: 200564,
      populationSource: "Census / Geocoding",
      boundingBox: null,
      boundary: null,
      address: { state: "Odisha", city: "Puri" },
      source: "OpenStreetMap"
    }
  },
  {
    name: "Jodhpur, Rajasthan",
    location: {
      id: "india-jodhpur",
      name: "Jodhpur",
      displayName: "Jodhpur, Rajasthan, India",
      category: "City" as const,
      latitude: 26.2389,
      longitude: 73.0243,
      population: 1033918,
      populationSource: "Census / Geocoding",
      boundingBox: null,
      boundary: null,
      address: { state: "Rajasthan", city: "Jodhpur" },
      source: "OpenStreetMap"
    }
  },
  {
    name: "Chamoli, Uttarakhand",
    location: {
      id: "india-chamoli",
      name: "Chamoli",
      displayName: "Chamoli, Uttarakhand, India",
      category: "District" as const,
      latitude: 30.4230,
      longitude: 79.3297,
      population: 391605,
      populationSource: "Census / Geocoding",
      boundingBox: null,
      boundary: null,
      address: { state: "Uttarakhand", city: "Gopeshwar" },
      source: "OpenStreetMap"
    }
  }
];

describe("Carrying Capacity across all selected areas", () => {
  for (const { name, location } of BENCHMARK_LOCATIONS) {
    it(`evaluates carrying capacity and discovers facilities for: ${name}`, async () => {
      const context = await getIndiaLocationContext(location);

      expect(context).toBeDefined();
      expect(context.decision).toBeDefined();

      const decision = context.decision!;
      expect(decision.capacityAssessment).toBeDefined();

      const cap = decision.capacityAssessment;
      console.log(`\n=== Location: ${name} ===`);
      console.log(`Capacity Status: ${cap.capacityStatus}`);
      console.log(`Nearby Facilities: ${cap.totalNearbyFacilities}`);
      console.log(`Eligible Shelters: ${cap.eligibleRelocationShelters}`);
      console.log(`Hospitals Excluded: ${cap.hospitalsExcludedFromShelters}`);
      console.log(`Required Capacity: ${cap.requiredCapacity}`);
      console.log(`Available Capacity: ${cap.availableCapacity}`);
      console.log(`Deficit: ${cap.capacityDeficit}`);

      // Nearby facilities must be discovered
      expect(cap.totalNearbyFacilities).toBeGreaterThan(0);
      expect(cap.eligibleRelocationShelters).toBeGreaterThanOrEqual(0);

      // Relocation assessment
      expect(decision.relocationAssessment).toBeDefined();
      const reloc = decision.relocationAssessment;
      console.log(`Candidate Status: ${reloc.candidateStatus}`);
      console.log(`Nearest Facilities Count: ${reloc.nearestFacilities.length}`);
      if (reloc.bestCandidate) {
        console.log(`Best Candidate: ${reloc.bestCandidate.name} (${reloc.bestCandidate.facilityRole}), Dist: ${reloc.bestCandidate.routeDistanceKm ?? reloc.bestCandidate.straightLineDistanceKm} km, Suitability: ${reloc.bestCandidate.relocationSuitability}`);
      }

      expect(reloc.nearestFacilities.length).toBeGreaterThan(0);
    }, 35000);
  }
});
