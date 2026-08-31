import { describe, expect, it } from "vitest";
import { MAP_MAX_ZOOM, clampMapZoom } from "./DivaMap";

describe("DivaMap zoom safety", () => {
  it("keeps map zoom within the supported raster tile range", () => {
    expect(MAP_MAX_ZOOM).toBe(18);
    expect(clampMapZoom(20)).toBe(18);
    expect(clampMapZoom(18)).toBe(18);
    expect(clampMapZoom(-1)).toBe(0);
  });
});
