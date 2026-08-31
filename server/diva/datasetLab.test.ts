import { describe, expect, it } from "vitest";
import { detectMapping, recordsToFeatures } from "../../client/src/lib/datasetLab";

describe("Dataset Lab field mapping", () => {
  it("rebuilds WGS84 point geometry from analyst-selected tabular coordinate fields", () => {
    const records = [{ site_lat: "11.685", site_lng: "76.132", affected_population: 220 }];
    const mapping = { ...detectMapping(Object.keys(records[0])), latitude: "site_lat", longitude: "site_lng", population: "affected_population" };
    const data = recordsToFeatures(records, mapping);

    expect(data.features).toHaveLength(1);
    expect(data.features[0]?.geometry).toMatchObject({ type: "Point", coordinates: [76.132, 11.685] });
    expect(data.features[0]?.properties.population).toBe(220);
  });
});
