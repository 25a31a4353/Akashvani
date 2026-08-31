export type WorkspaceId = "dashboard" | "map" | "risk" | "capacity" | "relocation" | "reports" | "dataset" | "replay" | "whatif" | "cases";

const primaryIds: WorkspaceId[] = ["dashboard", "map", "risk", "capacity"];
const historyIds: WorkspaceId[] = ["dataset", "replay", "whatif", "cases"];

export function isPrimaryWorkspace(id: WorkspaceId) {
  return primaryIds.includes(id);
}

export function workspaceSectionLabel(id: WorkspaceId) {
  if (id === "dashboard") return "Overview";
  if (id === "map") return "Map";
  if (historyIds.includes(id)) return "History & data";
  return "Assessment";
}

export function selectedLocationLoadingMessage(displayName: string) {
  return `Loading details for ${displayName}`;
}

export function selectedLocationFallbackMessage(requested: string) {
  return `Location "${requested}" could not be found. Showing the default India context instead.`;
}

export function locationDetailsToggleLabel(isOpen: boolean) {
  return isOpen ? "Hide full location details" : "Show full location details";
}

export function workspaceTitle(id: WorkspaceId) {
  const titles: Record<WorkspaceId, string> = {
    dashboard: "Akashvani overview",
    map: "Explore the map",
    risk: "Risk assessment",
    capacity: "Site capacity",
    relocation: "Plan relocation",
    reports: "Reports",
    dataset: "Dataset Lab",
    replay: "Historical Replay",
    whatif: "What-if simulation",
    cases: "Case studies",
  };
  return titles[id];
}
