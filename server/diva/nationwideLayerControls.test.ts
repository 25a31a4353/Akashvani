/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IndiaOverviewProvenance } from "../../client/src/components/diva/IndiaOverviewProvenance";
import { IndiaOverviewLayerControls } from "../../client/src/components/diva/IndiaOverviewLayerControls";
import { nationwideLayerControls, nationwideMapLayerVisibility, resolveNationwideMapLayerVisibility } from "../../client/src/components/diva/nationwideLayerConfig";

describe("India overview layer controls", () => {
  it("maps every visible India overview control to the intended map layers", () => {
    expect(nationwideLayerControls.map(([id]) => id)).toEqual(["nationalStates", "population", "terrain", "liveWeather", "wind", "earthquakeSensitivity", "landslideSensitivity", "floodSensitivity"]);
    expect(nationwideMapLayerVisibility).toEqual({
      nationalStates: ["national-state-fill", "national-state-line", "national-state-label"],
      population: ["national-population"],
      terrain: ["national-terrain"],
      liveWeather: ["national-weather-fill", "national-weather-line"],
      wind: ["national-wind-symbol"],
      earthquakeSensitivity: ["national-sensitivity-earthquake-fill", "national-sensitivity-earthquake-line"],
      landslideSensitivity: ["national-sensitivity-landslide-fill", "national-sensitivity-landslide-line"],
      floodSensitivity: ["national-sensitivity-flood-fill", "national-sensitivity-flood-line"],
    });
  });

  it("resolves enabled and disabled nationwide controls to the visible map-layer state", () => {
    expect(resolveNationwideMapLayerVisibility({ nationalStates: true, population: false, terrain: true, liveWeather: false, wind: false, earthquakeSensitivity: true, landslideSensitivity: false, floodSensitivity: true })).toMatchObject({ "national-state-fill": true, "national-state-line": true, "national-state-label": true, "national-population": false, "national-terrain": true, "national-weather-fill": false, "national-weather-line": false, "national-wind-symbol": false, "national-sensitivity-earthquake-fill": true, "national-sensitivity-landslide-fill": false, "national-sensitivity-flood-fill": true });
  });

  it("renders the India overview provenance and unavailable-geology status for route-level UI evidence", () => {
    const markup = renderToStaticMarkup(createElement(IndiaOverviewProvenance, { initialOpen: true, sources: { sensitivity: "ISRO/NRSC Bhuvan disaster service context" }, statuses: { states: "NATIONWIDE REFERENCE BOUNDARIES", terrain: "NATIONWIDE TERRAIN REFERENCE", geology: "UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED", weather: "LIVE MODELLED WEATHER + WIND COVERAGE GRID", sensitivity: "BROAD ANALYTICAL SENSITIVITY EXTENTS" }, updatedAt: "2026-08-23T17:00:00.000Z" }));
    expect(markup).toContain("India layer provenance");
    expect(markup).toContain("WorldPop 1 km density raster");
    expect(markup).toContain("reference years 2000–2020");
    expect(markup).toContain("UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED");
    expect(markup).toContain("LIVE MODELLED WEATHER + WIND COVERAGE GRID");
    expect(markup).toContain("BROAD ANALYTICAL SENSITIVITY EXTENTS");
  });

  it("changes visible India overview layer-control state through real DOM interactions", async () => {
    function ControlHarness() {
      const [layers, setLayers] = useState<Record<string, boolean>>({ nationalStates: true, population: true, terrain: true, liveWeather: true, wind: true, earthquakeSensitivity: true, landslideSensitivity: true, floodSensitivity: true });
      return createElement("div", null, createElement(IndiaOverviewLayerControls, { layers, onChange: (id, enabled) => setLayers(current => ({ ...current, [id]: enabled })) }), createElement("output", { "data-testid": "national-layer-state" }, JSON.stringify(layers)));
    }
    const user = userEvent.setup();
    render(createElement(ControlHarness));
    await user.click(screen.getByRole("switch", { name: "Toggle Physical terrain" }));
    await user.click(screen.getByRole("switch", { name: "Toggle Live weather coverage" }));
    await user.click(screen.getByRole("switch", { name: "Toggle Earthquake sensitivity extent" }));
    await user.click(screen.getByRole("switch", { name: "Toggle 10 m wind speed & direction" }));
    expect(screen.getByTestId("national-layer-state").textContent).toContain('"terrain":false');
    expect(screen.getByTestId("national-layer-state").textContent).toContain('"liveWeather":false');
    expect(screen.getByTestId("national-layer-state").textContent).toContain('"earthquakeSensitivity":false');
    expect(screen.getByTestId("national-layer-state").textContent).toContain('"wind":false');
    expect(screen.queryByRole("switch", { name: "Toggle Geological reference" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Toggle Combined multi-hazard screening" })).toBeNull();
  });
});

