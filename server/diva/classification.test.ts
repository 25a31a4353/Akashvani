import { describe, expect, it } from "vitest";
import {
  tierToPresentation,
  classifyDistrict,
  getClassificationLayer,
  findRealDistrict,
  CLASSIFICATION_FILL_COLORS,
  CLASSIFICATION_LINE_COLORS,
  CLASSIFICATION_TIER_LABELS,
  type PresentationClass,
} from "./hazards/classification";
import { ALL_REAL_DISTRICTS } from "./hazards/data/realDistricts";
import type { RedZoneTier } from "../../shared/hazards";

describe("Phase 3.2C Correction — Real Geographic District Classification Layer Test Suite", () => {
  describe("1. Tier to Presentation Class Mapping & Invariants", () => {
    it("maps RED tier to RED presentation class", () => {
      expect(tierToPresentation("RED")).toBe("RED");
    });

    it("maps ORANGE tier to ORANGE presentation class", () => {
      expect(tierToPresentation("ORANGE")).toBe("ORANGE");
    });

    it("maps YELLOW tier to ORANGE presentation class (caution principle)", () => {
      expect(tierToPresentation("YELLOW")).toBe("ORANGE");
    });

    it("maps LOW tier to GREEN presentation class", () => {
      expect(tierToPresentation("LOW")).toBe("GREEN");
    });

    it("strictly never maps missing or unknown tier to GREEN", () => {
      expect(tierToPresentation("UNKNOWN" as RedZoneTier)).toBe("UNAVAILABLE");
      expect(tierToPresentation(undefined)).toBe("UNAVAILABLE");
      expect(tierToPresentation(null)).toBe("UNAVAILABLE");
      expect(tierToPresentation("")).toBe("UNAVAILABLE");
    });

    it("provides valid styling constants for each presentation class", () => {
      const classes: PresentationClass[] = ["RED", "ORANGE", "GREEN", "UNAVAILABLE"];
      for (const cls of classes) {
        expect(CLASSIFICATION_FILL_COLORS[cls]).toBeDefined();
        expect(CLASSIFICATION_LINE_COLORS[cls]).toBeDefined();
        expect(CLASSIFICATION_TIER_LABELS[cls]).toBeDefined();
      }
      expect(CLASSIFICATION_FILL_COLORS.RED).toBe("#c62828");
      expect(CLASSIFICATION_FILL_COLORS.ORANGE).toBe("#e65100");
      expect(CLASSIFICATION_FILL_COLORS.GREEN).toBe("#2e7d32");
      expect(CLASSIFICATION_FILL_COLORS.UNAVAILABLE).toContain("rgba");
    });
  });

  describe("2. Real Boundary Source Verification (No Artificial Buffers)", () => {
    it("sources district polygons from geoBoundaries India ADM2 and Kerala ADM2", () => {
      expect(ALL_REAL_DISTRICTS.length).toBeGreaterThanOrEqual(36);
      for (const d of ALL_REAL_DISTRICTS) {
        expect(["Polygon", "MultiPolygon"]).toContain(d.geometry.type);
        expect(d.geometry.coordinates).toBeDefined();
        expect(d.source).toMatch(/geoBoundaries/i);
        expect(d.district).toBeTruthy();
        expect(d.state).toBeTruthy();
        expect(d.stateCode).toBeTruthy();
      }
    });

    it("ensures real district boundary geometry is NOT a synthetic circle", () => {
      const dibrugarh = findRealDistrict("Dibrugarh", "AS");
      expect(dibrugarh).toBeDefined();
      if (!dibrugarh) return;

      const ring = (dibrugarh.geometry.coordinates as number[][][])[0];
      // Real administrative boundary has complex irregular coordinates, not a 16-point regular circle
      expect(ring.length).toBeGreaterThan(30);
      expect(dibrugarh.geometry.type).toBe("Polygon");
    });
  });

  describe("3. Real District Classification & Multi-Hazard Integration", () => {
    it("classifies Dibrugarh district (Assam) as RED on its real administrative boundary", () => {
      const dibrugarh = findRealDistrict("Dibrugarh", "AS");
      expect(dibrugarh).toBeDefined();
      if (!dibrugarh) return;

      const feat = classifyDistrict(dibrugarh);
      expect(feat).not.toBeNull();
      expect(feat!.type).toBe("Feature");
      expect(feat!.properties.classification).toBe("RED");
      expect(feat!.properties.redZoneTier).toBe("RED");
      expect(feat!.properties.areaType).toBe("DISTRICT");
      expect(feat!.properties.spatialResolution).toBe("DISTRICT");
      expect(feat!.properties.score).toBe(100);
      expect(feat!.properties.deterministicTriggers.length).toBeGreaterThan(0);
      expect(feat!.properties.provenance).toContain("geoBoundaries");
      // Geometry must be the actual district polygon
      expect(feat!.geometry).toEqual(dibrugarh.geometry);
    });

    it("classifies Wayanad district (Kerala) as ORANGE with ISRO Landslide Rank #13 on its real boundary", () => {
      const wayanad = findRealDistrict("Wayanad", "KL");
      expect(wayanad).toBeDefined();
      if (!wayanad) return;

      const feat = classifyDistrict(wayanad);
      expect(feat).not.toBeNull();
      expect(feat!.properties.classification).toBe("ORANGE");
      expect(feat!.properties.redZoneTier).toBe("ORANGE");
      expect(feat!.properties.areaType).toBe("DISTRICT");
      expect(feat!.properties.spatialResolution).toBe("DISTRICT");
      expect(feat!.properties.dominantHazards).toContain("LANDSLIDE");
      expect(feat!.geometry).toEqual(wayanad.geometry);
    });

    it("classifies Sivasagar district (Assam) as RED / ORANGE on its real boundary", () => {
      const sivasagar = findRealDistrict("Sivasagar", "AS");
      expect(sivasagar).toBeDefined();
      if (!sivasagar) return;

      const feat = classifyDistrict(sivasagar);
      expect(feat).not.toBeNull();
      expect(["RED", "ORANGE"]).toContain(feat!.properties.classification);
      expect(feat!.properties.spatialResolution).toBe("DISTRICT");
      expect(feat!.geometry).toEqual(sivasagar.geometry);
    });

    it("classifies Kannur district (Kerala) as ORANGE on its real boundary", () => {
      const kannur = findRealDistrict("Kannur", "KL");
      expect(kannur).toBeDefined();
      if (!kannur) return;

      const feat = classifyDistrict(kannur);
      expect(feat).not.toBeNull();
      expect(feat!.properties.classification).toBe("ORANGE");
      expect(feat!.properties.redZoneTier).toBe("ORANGE");
      expect(feat!.properties.spatialResolution).toBe("DISTRICT");
      expect(feat!.geometry).toEqual(kannur.geometry);
    });

    it("classifies Raipur district (Chhattisgarh) as GREEN (lower assessed concern) based on verified low baseline exposure", () => {
      const raipur = findRealDistrict("Raipur", "CT");
      expect(raipur).toBeDefined();
      if (!raipur) return;

      const feat = classifyDistrict(raipur);
      expect(feat).not.toBeNull();
      expect(feat!.properties.classification).toBe("GREEN");
      expect(feat!.properties.redZoneTier).toBe("LOW");
      expect(feat!.properties.score).toBeLessThan(50);
      expect(feat!.properties.spatialResolution).toBe("DISTRICT");
      expect(feat!.properties.explanation).toContain("baseline conditions");
      expect(feat!.geometry).toEqual(raipur.geometry);
    });

    it("classifies Ranchi district (Jharkhand) as GREEN on its real boundary", () => {
      const ranchi = findRealDistrict("Ranchi", "JH");
      expect(ranchi).toBeDefined();
      if (!ranchi) return;

      const feat = classifyDistrict(ranchi);
      expect(feat).not.toBeNull();
      expect(feat!.properties.classification).toBe("GREEN");
      expect(feat!.properties.redZoneTier).toBe("LOW");
      expect(feat!.geometry).toEqual(ranchi.geometry);
    });
  });

  describe("4. Full Classification FeatureCollection Layer", () => {
    it("returns real administrative district polygon features across target states", () => {
      const layer = getClassificationLayer();
      expect(layer.type).toBe("FeatureCollection");
      expect(layer.features.length).toBeGreaterThanOrEqual(36);

      const classifications = layer.features.map((f) => f.properties.classification);
      expect(classifications).toContain("RED");
      expect(classifications).toContain("ORANGE");
      expect(classifications).toContain("GREEN");

      for (const feat of layer.features) {
        expect(feat.type).toBe("Feature");
        expect(["Polygon", "MultiPolygon"]).toContain(feat.geometry.type);
        expect(feat.properties.areaType).toBe("DISTRICT");
        expect(feat.properties.spatialResolution).toBe("DISTRICT");
        expect(feat.properties.provenance).toContain("geoBoundaries");
        expect(feat.properties.limitations).toContain("Official district administrative boundary");
      }
    });

    it("guarantees no GREEN feature has missing or unverified evidence", () => {
      const layer = getClassificationLayer();
      const greenFeatures = layer.features.filter(
        (f) => f.properties.classification === "GREEN"
      );
      expect(greenFeatures.length).toBeGreaterThan(0);
      for (const f of greenFeatures) {
        expect(f.properties.redZoneTier).toBe("LOW");
        expect(f.properties.evidenceStatus).not.toBe("UNAVAILABLE");
      }
    });

    it("guarantees RED features reflect severe triggers or composite score >= 70", () => {
      const layer = getClassificationLayer();
      const redFeatures = layer.features.filter(
        (f) => f.properties.classification === "RED"
      );
      expect(redFeatures.length).toBeGreaterThan(0);
      for (const f of redFeatures) {
        expect(f.properties.redZoneTier).toBe("RED");
        const hasTrigger = f.properties.deterministicTriggers.length > 0;
        const hasHighScore = f.properties.score >= 70;
        expect(hasTrigger || hasHighScore).toBe(true);
      }
    });
  });
});
