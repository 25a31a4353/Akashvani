import { describe, expect, it } from "vitest";
import { isPrimaryWorkspace, locationDetailsToggleLabel, selectedLocationFallbackMessage, selectedLocationLoadingMessage, workspaceSectionLabel, workspaceTitle, type WorkspaceId } from "./homeUi";

describe("simplified workspace navigation", () => {
  it("keeps the four primary workflows immediately available", () => {
    expect(["dashboard", "map", "risk", "capacity"].every(id => isPrimaryWorkspace(id as WorkspaceId))).toBe(true);
    expect(isPrimaryWorkspace("reports")).toBe(false);
  });

  it("uses short, understandable workspace headings", () => {
    expect(workspaceSectionLabel("dashboard")).toBe("Overview");
    expect(workspaceSectionLabel("dataset")).toBe("History & data");
    expect(workspaceTitle("map")).toBe("Explore the map");
    expect(workspaceTitle("whatif")).toBe("What-if simulation");
  });

  it("uses explicit copy for selected-location loading and fallback states", () => {
    expect(selectedLocationLoadingMessage("Assam")).toBe("Loading details for Assam");
    expect(selectedLocationFallbackMessage("not-a-real-place")).toContain("could not be found");
    expect(selectedLocationFallbackMessage("not-a-real-place")).toContain("default India context");
  });

  it("makes the full-details disclosure state obvious", () => {
    expect(locationDetailsToggleLabel(false)).toBe("Show full location details");
    expect(locationDetailsToggleLabel(true)).toBe("Hide full location details");
  });
});
