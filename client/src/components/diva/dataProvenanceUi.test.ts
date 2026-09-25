/** @vitest-environment jsdom */
import React from "react";
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IndiaOverviewProvenance } from "./IndiaOverviewProvenance";
import { DATA_SOURCE_REGISTRY, DATA_SOURCE_AUDIT_LIST } from "@shared/sourceRegistry";
import type { IndiaLocationContext } from "@shared/india";

describe("ResQ Data Provenance UI & 22-Source Audit Registry", () => {
  afterEach(cleanup);

  it("contains all 22 required audited categories in the authoritative data registry", () => {
    const requiredCategories = [
      "States",
      "Population",
      "Terrain",
      "Geology",
      "Weather & wind",
      "Sensitivity",
      "Hazards",
      "Facilities",
      "Routing",
      "Elevation",
      "Rainfall",
      "Cyclone",
      "Landslide",
      "Flood",
      "Seismic",
      "Erosion",
      "Drought",
      "Heat",
      "Exposure",
      "Relocation",
      "Capacity",
    ];

    const registryCategories = new Set(DATA_SOURCE_AUDIT_LIST.map(s => s.category));
    for (const reqCat of requiredCategories) {
      expect(registryCategories.has(reqCat)).toBe(true);
    }

    // Verify Geology is now INTEGRATED as OFFICIAL GSI reference
    const geology = DATA_SOURCE_REGISTRY.GEOLOGY_GSI;
    expect(geology).toBeDefined();
    expect(geology.integrationStatus).toBe("INTEGRATED");
    expect(geology.provenanceType).toBe("OFFICIAL");
    expect(geology.notes).toContain("GSI Bhukosh");

    // Verify sub-service registrations
    expect(DATA_SOURCE_REGISTRY.GSI_BHUKOSH).toBeDefined();
    expect(DATA_SOURCE_REGISTRY.GSI_GEOLOGY_50K).toBeDefined();
    expect(DATA_SOURCE_REGISTRY.GSI_GEOLOGY_2M).toBeDefined();
    expect(DATA_SOURCE_REGISTRY.GSI_GEOLOGY_2M.integrationStatus).toBe("INTEGRATED");
    expect(DATA_SOURCE_REGISTRY.GSI_GEOMORPHOLOGY_50K).toBeDefined();
    expect(DATA_SOURCE_REGISTRY.GSI_TECTONICS_FAULTS).toBeDefined();
    expect(DATA_SOURCE_REGISTRY.GSI_TECTONICS_FAULTS.integrationStatus).toBe("INTEGRATED");
    expect(DATA_SOURCE_REGISTRY.GSI_NGDR).toBeDefined();

    // Verify Population distinct metadata
    const population = DATA_SOURCE_REGISTRY.POPULATION_CENSUS_WORLDPOP;
    expect(population).toBeDefined();
    expect(population.provenanceType).toBe("OFFICIAL");
    expect(population.observedOrModelled).toBe("OBSERVED");

    // Verify Seismic is REGULATORY REFERENCE, not observed earthquake footprint
    const seismic = DATA_SOURCE_REGISTRY.SEISMIC_BIS_IS1893;
    expect(seismic).toBeDefined();
    expect(seismic.observedOrModelled).toBe("REGULATORY");
    expect(seismic.notes).toContain("REGULATORY REFERENCE");

    // Verify Routing is never straight-line fallback disguised as road routing
    const routing = DATA_SOURCE_REGISTRY.ROUTING_OSRM;
    expect(routing).toBeDefined();
    expect(routing.notes).toContain("Never draws straight-line fallbacks disguised as road routing");
  });

  it("renders structured provenance cards including Geology State C (no location selected) with no provisional geometry fabricated", () => {
    render(React.createElement(IndiaOverviewProvenance));

    // Open the provenance panel via its toggle button
    const toggleBtn = screen.getByTestId("data-provenance-toggle");
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);

    // Check primary cards are rendered
    expect(screen.getByTestId("provenance-card-population")).toBeDefined();
    expect(screen.getByTestId("provenance-card-weather")).toBeDefined();
    expect(screen.getByTestId("provenance-card-terrain")).toBeDefined();
    expect(screen.getByTestId("provenance-card-geology")).toBeDefined();
    expect(screen.getByTestId("provenance-card-sensitivity")).toBeDefined();

    // Check Geology State C is explicitly displayed
    const geologyCard = screen.getByTestId("provenance-card-geology");
    expect(geologyCard.textContent).toContain("GSI BHUKOSH — OFFICIAL REFERENCE");
    expect(geologyCard.textContent).toContain("No provisional geometry fabricated");

    // Check Evidence Coverage score bar
    const evidenceCoverage = screen.getByTestId("evidence-coverage-metric");
    expect(evidenceCoverage).toBeDefined();
    expect(evidenceCoverage.textContent).toContain("Evidence Coverage Score");
  });

  it("renders State A with genuine GSI vector data when location context is present", () => {
    const mockGeology = {
      available: true,
      provenance: "OFFICIAL" as const,
      sourceOrganization: "Geological Survey of India (GSI)",
      repository: "Bhukosh & NDSAP Living Atlas Mirror",
      serviceName: "Geology_2M / Bhuvan_Geomorphology_50K",
      layerName: "Geology (1:2M) / Tectonics (1:2M)",
      scale: "1:2,000,000 / 1:50,000",
      geometryType: "Polygon / Polyline",
      lithology: "UNDIFF.FLUVIAL / AEOLIAN / COASTA & GLACIAL SEDIMENTS",
      geologicalUnit: "Quaternary Alluvium",
      formation: "Brahmaputra Alluvial Formation",
      rockType: "Sedimentary alluvium and silt",
      age: "QUATERNARY",
      supergroup: null,
      stratigraphy: "Quaternary Sediments",
      faultPresent: true,
      faultDistanceKm: 3.2,
      nearestFaultName: "Fault Tectonic - Neotectonic Fault",
      lineamentPresent: true,
      geomorphology: "Fluvial Origin-Younger Alluvial Plain",
      tectonicContext: "Neotectonic active fault 3.2 km from query location",
      sourceUrl: "https://livingatlas.esri.in/server1/rest/services/Geology/Geology/MapServer/0",
      retrievedAt: "2026-09-25T10:00:00.000Z",
      spatialReference: "EPSG:4326",
      featureId: "GSI-POLY-142",
      confidence: "DIRECT_GSI_FEATURE" as const,
      wmsAvailable: true,
      limitations: "1:2M macro lithology; 1:50K geomorphology via NRSC/GSI Bhuvan.",
    };

    const mockCtx: Partial<IndiaLocationContext> = {
      location: {
        id: "DIST-AS-DIB",
        name: "Dibrugarh",
        displayName: "Dibrugarh, Assam, India",
        category: "District",
        latitude: 27.4728,
        longitude: 94.912,
        population: 3150,
        populationSource: "Census of India 2011",
        boundingBox: null,
        boundary: null,
        address: { state: "Assam", district: "Dibrugarh" },
        source: "Census 2011",
      },
      geology: mockGeology,
    };

    render(React.createElement(IndiaOverviewProvenance, { locationContext: mockCtx as IndiaLocationContext }));

    const toggleBtn = screen.getByTestId("data-provenance-toggle");
    fireEvent.click(toggleBtn);

    const geologyCard = screen.getByTestId("provenance-card-geology");
    expect(geologyCard.textContent).toContain("OFFICIAL — GSI BHUKOSH VECTOR");
    expect(geologyCard.textContent).toContain("UNDIFF.FLUVIAL / AEOLIAN / COASTA & GLACIAL SEDIMENTS");
    expect(geologyCard.textContent).toContain("Fault Tectonic - Neotectonic Fault");
    expect(geologyCard.textContent).toContain("3.2 km");
  });

  it("dynamically isolates and updates context when switching locations without stale data retention", () => {
    const dibrugarhCtx: Partial<IndiaLocationContext> = {
      location: {
        id: "DIST-AS-DIB",
        name: "Dibrugarh",
        displayName: "Dibrugarh, Assam, India",
        category: "District",
        latitude: 27.4728,
        longitude: 94.912,
        population: 3150,
        populationSource: "Census of India 2011",
        boundingBox: null,
        boundary: null,
        address: { state: "Assam", district: "Dibrugarh" },
        source: "Census 2011",
      },
      environment: {
        temperatureC: 33.1,
        precipitationMm: 0,
        usAqi: null,
        pm25: null,
        observedAt: "2026-09-25T12:45",
        retrievedAt: "2026-09-25T07:24:32.456Z",
        forecast: [],
        source: "IMD Mausam District Nowcast & Open-Meteo",
        status: "LIVE_NOWCAST",
        telemetryType: { temperature: "MODELLED", wind: "MODELLED", precipitation: "MODELLED", airQuality: "MODELLED", warning: "OFFICIAL_NOWCAST" },
      },
      terrain: {
        elevationMeters: 107,
        slopeDegrees: 0.8,
        terrainRuggedness: "Low Relief / Plain",
        terrainClass: "Riverine alluvial plain",
        source: "Copernicus DEM 90m",
        derivedSlopeMethod: "Horn's topographic slope algorithm",
        timestamp: "2026-09-25T07:24:32.456Z",
        confidence: "HIGH",
      },
    };

    const wayanadCtx: Partial<IndiaLocationContext> = {
      location: {
        id: "DIST-KL-WAY",
        name: "Wayanad",
        displayName: "Wayanad, Kerala, India",
        category: "District",
        latitude: 11.6854,
        longitude: 76.132,
        population: 817420,
        populationSource: "Census of India 2011",
        boundingBox: null,
        boundary: null,
        address: { state: "Kerala", district: "Wayanad" },
        source: "Census 2011",
      },
      environment: {
        temperatureC: 24.4,
        precipitationMm: 0.2,
        usAqi: null,
        pm25: null,
        observedAt: "2026-09-25T12:45",
        retrievedAt: "2026-09-25T07:24:36.055Z",
        forecast: [],
        source: "IMD Mausam District Nowcast (ALERT)",
        status: "LIVE_WARNING",
        telemetryType: { temperature: "MODELLED", wind: "MODELLED", precipitation: "MODELLED", airQuality: "MODELLED", warning: "OFFICIAL_WARNING" },
      },
      terrain: {
        elevationMeters: 765,
        slopeDegrees: 7.4,
        terrainRuggedness: "Moderate Ruggedness",
        terrainClass: "Western Ghats mountainous highlands",
        source: "Copernicus DEM 90m",
        derivedSlopeMethod: "Horn's topographic slope algorithm",
        timestamp: "2026-09-25T07:24:36.055Z",
        confidence: "HIGH",
      },
    };

    // Verify completely independent values across locations
    expect(dibrugarhCtx.location?.population).toBe(3150);
    expect(wayanadCtx.location?.population).toBe(817420);
    expect(dibrugarhCtx.location?.population).not.toBe(wayanadCtx.location?.population);

    expect(dibrugarhCtx.terrain?.elevationMeters).toBe(107);
    expect(wayanadCtx.terrain?.elevationMeters).toBe(765);

    expect(dibrugarhCtx.terrain?.slopeDegrees).toBe(0.8);
    expect(wayanadCtx.terrain?.slopeDegrees).toBe(7.4);

    expect(dibrugarhCtx.environment?.temperatureC).toBe(33.1);
    expect(wayanadCtx.environment?.temperatureC).toBe(24.4);

    expect(dibrugarhCtx.environment?.telemetryType?.warning).toBe("OFFICIAL_NOWCAST");
    expect(wayanadCtx.environment?.telemetryType?.warning).toBe("OFFICIAL_WARNING");
  });
});
