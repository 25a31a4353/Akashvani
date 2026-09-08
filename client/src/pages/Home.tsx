import { RiskBadge } from "@/components/diva/RiskBadge";
import { DivaMap } from "@/components/diva/DivaMap";
import { locationDetailsToggleLabel, selectedLocationFallbackMessage, selectedLocationLoadingMessage, workspaceSectionLabel, workspaceTitle, type WorkspaceId } from "./homeUi";
import { MapCommandWorkspace } from "@/components/diva/MapCommandWorkspace";
import { IndiaOverviewLayerControls } from "@/components/diva/IndiaOverviewLayerControls";
import { nationwideLayerControls } from "@/components/diva/nationwideLayerConfig";
import { IndiaLocationSearch } from "@/components/diva/IndiaLocationSearch";
import { HistoricalLab } from "@/components/diva/HistoricalLab";
import { ReportArchiveList } from "@/components/diva/ReportArchiveList";
import { IndiaContextSidebar, IndiaLocationSummaryStrip, SelectedLocationForecast, SelectedLocationForecastDetails, SelectedLocationPriorityDecisionTable, SelectedLocationPriorityQueue, SelectedLocationReportAction, lookupRealDistrict } from "@/components/diva/SelectedLocationDecisionPanels";
import { AssamDisasterHistory } from "@/components/diva/AssamDisasterHistory";
import { AssamStateProfile } from "@/components/diva/AssamStateProfile";
import { MetricCard } from "@/components/diva/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { DecisionNarrative, RiskLevel } from "@shared/diva";
import { buildIndiaLocationSearch, resolveIndiaLocationFromSearch, resolveIndiaLocationSelection, type IndiaLocation } from "@shared/india";
import { BarChart3, Bot, Building2, ChevronDown, CircleAlert, CloudRain, Database, Download, FileText, Filter, FlaskConical, History, Layers3, Loader2, MapPin, Menu, MoreHorizontal, PanelRightOpen, Search, ShieldAlert, SlidersHorizontal, Sparkles, Upload, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Workspace = WorkspaceId;

const navigation: Array<{ id: Workspace; label: string; icon: typeof BarChart3 }> = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "map", label: "Map", icon: MapPin },
  { id: "risk", label: "Risk assessment", icon: ShieldAlert },
  { id: "capacity", label: "Site capacity", icon: Building2 },
  { id: "relocation", label: "Relocation", icon: Users },
  { id: "dataset", label: "Dataset Lab", icon: Database },
  { id: "replay", label: "Historical Replay", icon: History },
  { id: "whatif", label: "What-if simulation", icon: FlaskConical },
  { id: "cases", label: "Case studies", icon: Layers3 },
  { id: "reports", label: "Reports", icon: FileText },
];

const primaryNavigation = navigation.slice(0, 4);
const secondaryNavigation = navigation.slice(4);

const initialLayers: Record<string, boolean> = {
  nationalStates: true,
  boundaries: true,
  population: false,
  terrain: true,
  redZones: true,
  routes: true,
  exposedHabitations: true,
  facilities: true,
  hospitals: false,
  seismicOfficial: false,
  cwcGauges: false,
  floodPlains: true,
  erosionCorridors: true,
  landslideEvents: true,
  cycloneTracks: false,
  liveWeather: false,
  wind: false,
  earthquakeSensitivity: false,
  landslideSensitivity: false,
  floodSensitivity: false,
  infrastructure: false,
};


function percentage(value: number) { return `${Math.max(0, Math.min(100, value))}%`; }

function FactorBar({ label, score, description }: { label: string; score: number; description: string }) {
  return <div className="py-2.5"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[#314b5c]">{label}</p><p className="mt-0.5 text-[10px] text-[#778894]">{description}</p></div><span className="text-xs font-bold text-[#1b435b]">{score}<span className="font-medium text-[#83929b]">/100</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8eef1]"><div className="h-full rounded-full bg-[#1f788d] transition-all duration-500" style={{ width: percentage(score) }} /></div></div>;
}

export default function Home() {
  const initialIndiaLocation = resolveIndiaLocationSelection(window.location.search);
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedWorkspace = params.get("workspace");
    return navigation.some(item => item.id === requestedWorkspace) ? requestedWorkspace as Workspace : "dashboard";
  });
  const [selectedId, setSelectedId] = useState("KER-WAY");
  const [layers, setLayers] = useState(initialLayers);
  const [opacity, setOpacity] = useState(0.92);
  const [isLayerOpen, setIsLayerOpen] = useState(false);
  const [baseStyle, setBaseStyle] = useState<"muted" | "terrain">("muted");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(() => secondaryNavigation.some(item => item.id === new URLSearchParams(window.location.search).get("workspace")));
  const [isLocationDetailsOpen, setIsLocationDetailsOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [showScenarioPanel, setShowScenarioPanel] = useState(true);
  const [search, setSearch] = useState("");
  const [indiaLocation, setIndiaLocation] = useState<IndiaLocation>(() => initialIndiaLocation.location);
  const [locationNotice, setLocationNotice] = useState<string | null>(() => initialIndiaLocation.isFallback && initialIndiaLocation.requested ? selectedLocationFallbackMessage(initialIndiaLocation.requested) : null);
  const [filters, setFilters] = useState({ hazards: [] as string[], riskLevels: [] as RiskLevel[], priority: [] as Array<"Immediate" | "High" | "Moderate" | "Low">, minimumPopulation: 0, capacity: [] as Array<"Adequate" | "Constrained" | "Insufficient"> });
  const [narrative, setNarrative] = useState<DecisionNarrative | null>(null);
  const artifactInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const dashboardQuery = trpc.diva.dashboard.useQuery();
  const mapQuery = trpc.diva.mapData.useQuery();
  const assessmentQuery = trpc.diva.assessment.useQuery({ id: selectedId });
  const filteredQuery = trpc.diva.areas.useQuery(filters);
  const reportsQuery = trpc.diva.reports.useQuery();
  const generateNarrative = trpc.diva.generateNarrative.useMutation({ onSuccess: result => setNarrative(result.narrative) });
  const rerunAnalysis = trpc.diva.riskAnalyze.useMutation({ onSuccess: () => assessmentQuery.refetch() });
  const generateReport = trpc.diva.generateReport.useMutation({ onSuccess: result => { utils.diva.reports.invalidate(); window.open(result.url, "_blank", "noopener,noreferrer"); } });
  const generateSelectedLocationReport = trpc.diva.generateSelectedLocationReport.useMutation({ onSuccess: result => { utils.diva.reports.invalidate(); window.open(result.url, "_blank", "noopener,noreferrer"); } });
  const uploadArtifact = trpc.diva.uploadArtifact.useMutation({ onSuccess: result => window.alert(`Stored source artifact ${result.id}.`), onError: () => window.alert("Source artifact upload could not be completed. Please try again.") });
  const selected = assessmentQuery.data;
  const allAreas = mapQuery.data?.areas ?? [];
  const selectedCoordinates = useMemo(() => {
    const current = allAreas.find(area => area.id === selectedId);
    return { latitude: current?.latitude ?? 11.7138, longitude: current?.longitude ?? 76.1021 };
  }, [allAreas, selectedId]);
  const environmentQuery = trpc.diva.environment.useQuery(selectedCoordinates, { staleTime: 10 * 60 * 1000 });
  const indiaContextRequest = trpc.diva.india.context.useQuery(indiaLocation, { staleTime: 10 * 60 * 1000, retry: 1, retryDelay: 500 });
  const nationwideMapQuery = trpc.diva.india.nationwideMap.useQuery(undefined, { staleTime: 5 * 60 * 1000, refetchInterval: 5 * 60 * 1000, retry: 1 });
  const realDistrict = lookupRealDistrict(indiaLocation.name, indiaLocation.address?.district ?? indiaLocation.address?.city);

  const habitationsQuery = trpc.diva.hazards.habitations.useQuery(
    {
      latitude: indiaLocation.latitude,
      longitude: indiaLocation.longitude,
      district: realDistrict?.name,
      stateCode: realDistrict?.stateCode,
      radiusKm: 35,
    },
    { enabled: Boolean(indiaLocation), staleTime: 10 * 60 * 1000 }
  );
  const habitationsList = habitationsQuery.data ?? [];
  const districtHabitations = realDistrict
    ? habitationsList.filter((h: any) =>
        h.district?.toLowerCase() === realDistrict.name?.toLowerCase() &&
        h.latitude != null && h.longitude != null
      )
    : [];
  const districtExposed = districtHabitations.filter((h: any) => h.insideHazardZone);
  const exposedHabitations = habitationsList.filter((h: any) => h.insideHazardZone && h.latitude != null && h.longitude != null);

  const relocationQuery = trpc.diva.hazards.relocation.useQuery(
    {
      districtId: realDistrict?.id || "",
      stateCode: realDistrict?.stateCode,
      radiusKm: 35,
      originLat: (districtExposed[0] ?? districtHabitations[0])?.latitude,
      originLon: (districtExposed[0] ?? districtHabitations[0])?.longitude,
    },
    { enabled: Boolean(realDistrict?.id), staleTime: 10 * 60 * 1000 }
  );

  const relRec = relocationQuery.data;
  const isRelRecFresh = Boolean(relRec && realDistrict && relRec.sourceAreaId === realDistrict.id);
  const isRelocationRequired = Boolean(
    realDistrict &&
    relRec &&
    isRelRecFresh &&
    relRec.sourceHazardLevel !== "GREEN" &&
    (districtExposed.length > 0 || (districtHabitations.length > 0 && (relRec.sourceHazardLevel === "RED" || relRec.sourceHazardLevel === "ORANGE")))
  );

  const selectedVulnerableHabitation = isRelocationRequired
    ? (districtExposed[0] ?? districtHabitations[0] ?? null)
    : null;

  const destinationCandidate = (isRelocationRequired && relRec)
    ? (relRec.bestCandidate ?? (relRec.conditionalAlternatives ?? []).find((f: any) => f.latitude != null && f.longitude != null) ?? null)
    : null;

  const routeQuery = trpc.diva.hazards.evacuationRoute.useQuery(
    {
      originLat: selectedVulnerableHabitation?.latitude ?? 0,
      originLon: selectedVulnerableHabitation?.longitude ?? 0,
      destinationLat: destinationCandidate?.latitude ?? 0,
      destinationLon: destinationCandidate?.longitude ?? 0,
      originName: selectedVulnerableHabitation?.name,
      destinationName: destinationCandidate?.name,
    },
    {
      enabled: Boolean(
        isRelocationRequired &&
        selectedVulnerableHabitation &&
        destinationCandidate &&
        selectedVulnerableHabitation.latitude != null &&
        selectedVulnerableHabitation.longitude != null &&
        destinationCandidate.latitude != null &&
        destinationCandidate.longitude != null
      ),
      staleTime: 15 * 60 * 1000,
    }
  );

  const isRouteMatchingCurrentLocations = Boolean(
    isRelocationRequired &&
    routeQuery.data &&
    routeQuery.data.status === "OK" &&
    routeQuery.data.coordinates.length > 0 &&
    selectedVulnerableHabitation &&
    destinationCandidate &&
    Math.abs(routeQuery.data.coordinates[0][1] - selectedVulnerableHabitation.latitude) < 0.15 &&
    Math.abs(routeQuery.data.coordinates[0][0] - selectedVulnerableHabitation.longitude) < 0.15
  );

  const verifiedRoadRoute = isRouteMatchingCurrentLocations && routeQuery.data ? {
    coordinates: routeQuery.data.coordinates,
    destinationLabel: destinationCandidate?.name ?? "Relocation Destination",
    originLabel: selectedVulnerableHabitation?.name ?? "Vulnerable Habitation",
    distanceKm: routeQuery.data.routeDistanceKm,
    travelTimeMinutes: routeQuery.data.travelTimeMinutes,
    isRoadRoute: true,
    sourceNote: routeQuery.data.note,
  } : undefined;

  const relocationOrigin = (isRelocationRequired && selectedVulnerableHabitation) ? {
    latitude: selectedVulnerableHabitation.latitude,
    longitude: selectedVulnerableHabitation.longitude,
    name: selectedVulnerableHabitation.name,
    exposureLevel: selectedVulnerableHabitation.exposureLevel,
    population: selectedVulnerableHabitation.population,
    hazardType: selectedVulnerableHabitation.hazardType,
  } : undefined;

  const relocationDestination = (isRelocationRequired && destinationCandidate) ? {
    latitude: destinationCandidate.latitude,
    longitude: destinationCandidate.longitude,
    name: destinationCandidate.name,
    role: destinationCandidate.facilityRole,
    suitability: destinationCandidate.relocationSuitability,
    capacityNote: destinationCandidate.capacity ? `${destinationCandidate.capacity} capacity` : "UNAVAILABLE from OSM",
  } : undefined;

  const mapLocationContext = useMemo(() => {
    if (indiaContextRequest.data && (indiaContextRequest.data.location.id === indiaLocation.id || indiaContextRequest.data.location.name.toLowerCase() === indiaLocation.name.toLowerCase())) {
      return indiaContextRequest.data;
    }
    if (indiaContextRequest.isError || (!indiaContextRequest.data && indiaLocation.id === "india-assam")) {
      return {
        location: indiaLocation,
        environment: { temperatureC: null, precipitationMm: null, usAqi: null, pm25: null, observedAt: null, forecast: [], source: indiaContextRequest.isError ? "Selected-location context could not be refreshed. Existing Assam map location remains available." : "Live Assam weather context is still being retrieved; no current value is substituted.", status: indiaContextRequest.isError ? "LOCATION CONTEXT UNAVAILABLE" : "ASSAM LIVE CONTEXT LOADING" },
        infrastructure: { items: [], source: indiaContextRequest.isError ? "Nearby facility context is unavailable while the selected-location request is retried." : "Nearby Assam facilities are being retrieved from the live source.", status: "UNAVAILABLE" as const, observedAt: null },
        screening: { riskScore: null, riskLevel: "Unavailable" as const, priority: "Unavailable" as const, hazardContext: "Selected-location context is not yet available. No official warning is implied.", populationContext: "Population context is not yet available from the selected-location provider.", status: indiaContextRequest.isError ? "LOCATION CONTEXT UNAVAILABLE" : "ASSAM LIVE CONTEXT LOADING" },
      };
    }
    return undefined;
  }, [indiaContextRequest.data, indiaContextRequest.isError, indiaLocation]);
  const indiaContextQuery = { ...indiaContextRequest, data: mapLocationContext };
  const selectedContextLoading = Boolean(initialIndiaLocation.requested) && (indiaContextRequest.isLoading || (indiaContextRequest.isFetching && indiaContextRequest.data?.location.id !== indiaLocation.id));
  const mappedAreas = useMemo(() => filteredQuery.data ? filteredQuery.data.map(item => item.area) : allAreas, [allAreas, filteredQuery.data]);
  const searchResults = useMemo(() => search.trim().length > 1 ? allAreas.filter(area => `${area.name} ${area.district} ${area.id}`.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [], [allAreas, search]);
  const headerSearchRef = useRef<HTMLDivElement>(null);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [headerSearchActiveIndex, setHeaderSearchActiveIndex] = useState(-1);
  const indiaHeaderSearch = trpc.diva.india.search.useQuery({ query: search }, { enabled: search.trim().length >= 2, staleTime: 15 * 60 * 1000 });
  const mapData = useMemo(() => mapQuery.data ? { ...mapQuery.data, center: [indiaLocation.longitude, indiaLocation.latitude] as [number, number], areas: mappedAreas, nationwide: nationwideMapQuery.data } : undefined, [indiaLocation.latitude, indiaLocation.longitude, mapQuery.data, mappedAreas, nationwideMapQuery.data]);
  const divaMapData = useMemo(() => mapData ? {
    ...mapData,
    activeLocation: mapLocationContext,
    nearbyInfrastructure: mapLocationContext?.infrastructure.items,
    relocationOrigin,
    relocationDestination,
    relocationRoute: verifiedRoadRoute,
    environment: mapLocationContext ? { latitude: mapLocationContext.location.latitude, longitude: mapLocationContext.location.longitude, temperatureC: mapLocationContext.environment.temperatureC, precipitationMm: mapLocationContext.environment.precipitationMm, usAqi: mapLocationContext.environment.usAqi, status: mapLocationContext.environment.status } : environmentQuery.data ? { latitude: selectedCoordinates.latitude, longitude: selectedCoordinates.longitude, temperatureC: environmentQuery.data.temperatureC, precipitationMm: environmentQuery.data.precipitationMm, usAqi: environmentQuery.data.usAqi, status: environmentQuery.data.status } : undefined
  } : undefined, [destinationCandidate, environmentQuery.data, mapData, mapLocationContext, relocationDestination, relocationOrigin, selectedCoordinates.latitude, selectedCoordinates.longitude, verifiedRoadRoute]);

  useEffect(() => { setNarrative(null); }, [selectedId]);
  useEffect(() => {
    const closeButton = document.querySelector<HTMLButtonElement>("[aria-label='Close assessment panel']");
    const scenarioPanel = closeButton?.closest("aside");
    const close = () => setShowScenarioPanel(false);
    const selectedIndiaWorkspace = Boolean(mapLocationContext) && !["risk", "capacity", "relocation", "reports"].includes(workspace);
    if (scenarioPanel) scenarioPanel.hidden = !showScenarioPanel || selectedIndiaWorkspace;
    closeButton?.addEventListener("click", close);
    return () => { closeButton?.removeEventListener("click", close); if (scenarioPanel) scenarioPanel.hidden = false; };
  }, [mapLocationContext, showScenarioPanel, workspace]);
  useEffect(() => {
    const status = Array.from(document.querySelectorAll("p")).find(item => item.textContent?.startsWith("Data status: DEMO DATA · Source: DIVA scenario dataset"));
    const retainedQueue = status?.closest("section");
    if (!retainedQueue) return;
    retainedQueue.hidden = Boolean(mapLocationContext && workspace !== "capacity" && workspace !== "relocation" && workspace !== "reports");
    return () => { retainedQueue.hidden = false; };
  }, [dashboardQuery.data, mapLocationContext, workspace]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerSearchRef.current && !headerSearchRef.current.contains(event.target as Node)) {
        setIsHeaderSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectArea = useCallback((id: string) => { setSelectedId(id); setSearch(""); setShowScenarioPanel(true); setWorkspace("map"); }, []);
  const toggleArray = <T extends string,>(value: T, current: T[], set: (values: T[]) => void) => set(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const handleArtifact = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const encoded = String(reader.result).split(",")[1];
      if (encoded) uploadArtifact.mutate({ fileName: file.name, mimeType: file.type || "application/octet-stream", base64: encoded });
    };
    reader.readAsDataURL(file);
  };

  if (dashboardQuery.isLoading || mapQuery.isLoading || assessmentQuery.isLoading || selectedContextLoading) return <div role="status" aria-live="polite" className="grid min-h-screen place-items-center bg-[#f4f7f8] p-6"><div className="max-w-sm rounded-2xl border border-[#dbe7e9] bg-white p-5 text-center shadow-[0_12px_28px_rgba(28,55,70,0.06)]"><Loader2 className="mx-auto h-6 w-6 animate-spin text-[#1f788d]" /><p className="mt-3 text-sm font-semibold text-[#264a60]">{selectedContextLoading ? selectedLocationLoadingMessage(indiaLocation.displayName) : "Loading your Akashvani workspace"}</p><p className="mt-1 text-xs leading-relaxed text-[#71858f]">{selectedContextLoading ? "The map and details will update together when this location is ready." : "Preparing the map and assessment summary."}</p></div></div>;
  if (!selected || !mapData || !dashboardQuery.data) return <div className="grid min-h-screen place-items-center bg-[#f4f7f8] p-6 text-center"><div><CircleAlert className="mx-auto h-8 w-8 text-[#bb443f]" /><h1 className="mt-3 text-lg font-bold">Workspace data is unavailable</h1><p className="mt-2 text-sm text-muted-foreground">Please refresh the page. No live data is represented in this demonstration workspace.</p></div></div>;

  const { area, analysis } = selected;
  if (workspace === "map" && divaMapData) return <MapCommandWorkspace data={divaMapData} selectedId={selectedId} area={area} analysis={analysis} indiaLocation={indiaLocation} indiaContext={mapLocationContext} locationNotice={locationNotice} layers={layers} opacity={opacity} baseStyle={baseStyle} isReportPending={generateReport.isPending} onSelectArea={selectArea} onSelectLocation={location => { setIndiaLocation(location); setLocationNotice(null); window.history.replaceState(null, "", buildIndiaLocationSearch(location, "map")); setWorkspace("map"); }} onLayerChange={(id, enabled) => setLayers(current => ({ ...current, [id]: enabled }))} onOpacityChange={setOpacity} onBaseStyleChange={setBaseStyle} onOpenDashboard={() => setWorkspace("dashboard")} onOpenRelocation={() => setWorkspace("relocation")} onGenerateReport={() => generateReport.mutate({ id: area.id, narrative })} />;
  const riskDistribution = (["Critical", "High", "Moderate", "Low"] as RiskLevel[]).map(name => ({ name, value: dashboardQuery.data.totals[name], color: name === "Critical" ? "#bd3034" : name === "High" ? "#e66e2d" : name === "Moderate" ? "#d3a52d" : "#31825d" }));
  const trendData = dashboardQuery.data.ranked.slice(0, 7).reverse().map((item, index) => ({ name: `A${index + 1}`, risk: item.analysis.overallRisk, population: item.area.population / 100 }));

  return <div className="min-h-screen bg-[#f4f7f8] text-[#173347]">
    <header className="sticky top-0 z-40 border-b border-[#e0e8eb] bg-[#fbfcfc]/95 backdrop-blur">
      <div className="flex h-[68px] items-center gap-4 px-4 lg:px-6">
        <div className="flex shrink-0 items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#163c58] text-white shadow-[0_8px_18px_rgba(22,60,88,0.24)]"><div className="relative h-4 w-4"><span className="absolute inset-x-0 bottom-0 h-1.5 rounded-sm bg-[#80cbd6]" /><span className="absolute bottom-0 left-1.5 h-3 w-1.5 rounded-t-sm bg-white" /><span className="absolute bottom-0 right-1 h-2.5 w-1.5 rounded-t-sm bg-[#c0e5ea]" /></div></div><div className="hidden sm:block"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1f788d]">PS 191 · SIH</p><p className="text-sm font-bold tracking-tight text-[#15384f]">Akashvani</p></div></div>
        <div ref={headerSearchRef} className="relative mx-auto w-full max-w-[510px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#84949d]" />
          <Input
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setIsHeaderSearchOpen(true);
              setHeaderSearchActiveIndex(-1);
            }}
            onFocus={() => {
              if (search.trim().length > 0) setIsHeaderSearchOpen(true);
            }}
            onKeyDown={event => {
              const indianItems = indiaHeaderSearch.data ?? [];
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsHeaderSearchOpen(true);
                if (indianItems.length > 0) {
                  setHeaderSearchActiveIndex(prev => (prev < indianItems.length - 1 ? prev + 1 : 0));
                }
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                if (indianItems.length > 0) {
                  setHeaderSearchActiveIndex(prev => (prev > 0 ? prev - 1 : indianItems.length - 1));
                }
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (indianItems.length > 0) {
                  const loc = headerSearchActiveIndex >= 0 && headerSearchActiveIndex < indianItems.length
                    ? indianItems[headerSearchActiveIndex]
                    : indianItems[0];
                  setIndiaLocation(loc);
                  setLocationNotice(null);
                  window.history.replaceState(null, "", buildIndiaLocationSearch(loc));
                  setSearch("");
                  setIsHeaderSearchOpen(false);
                  setHeaderSearchActiveIndex(-1);
                } else if (searchResults.length > 0) {
                  selectArea(searchResults[0].id);
                  setSearch("");
                  setIsHeaderSearchOpen(false);
                  setHeaderSearchActiveIndex(-1);
                }
              } else if (event.key === "Escape") {
                setIsHeaderSearchOpen(false);
                setHeaderSearchActiveIndex(-1);
              }
            }}
            placeholder="Search India: state, district, city, or area"
            className="h-10 rounded-xl border-[#dce6e9] bg-[#f6f9fa] pl-9 pr-8 text-sm shadow-none focus-visible:ring-[#4894a5]"
            aria-label="Search assessment areas"
          />
          {search.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setIsHeaderSearchOpen(false);
                setHeaderSearchActiveIndex(-1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84949d] hover:text-black"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isHeaderSearchOpen && (searchResults.length > 0 || (indiaHeaderSearch.data && indiaHeaderSearch.data.length > 0) || (search.trim().length >= 2 && indiaHeaderSearch.isLoading)) && (
            <div className="absolute top-11 z-50 max-h-[420px] w-full overflow-y-auto rounded-xl border border-[#dce6e9] bg-white p-1.5 shadow-2xl">
              {indiaHeaderSearch.isLoading && <p className="px-3 py-2 text-xs text-[#7a8994]">Searching Indian locations…</p>}
              {indiaHeaderSearch.data && indiaHeaderSearch.data.length > 0 && (
                <div className="mb-1">
                  <p className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#1f788d]">Indian Locations & Districts</p>
                  {indiaHeaderSearch.data.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setIndiaLocation(item);
                        setLocationNotice(null);
                        window.history.replaceState(null, "", buildIndiaLocationSearch(item));
                        setSearch("");
                        setIsHeaderSearchOpen(false);
                        setHeaderSearchActiveIndex(-1);
                      }}
                      onMouseEnter={() => setHeaderSearchActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors",
                        idx === headerSearchActiveIndex ? "bg-[#e2f1f4] text-[#134958]" : "hover:bg-[#eff7f8]"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[#274a60]">{item.name}</span>
                        <span className="block truncate text-[10px] text-[#7a8994]">{item.category} · {item.displayName}</span>
                      </span>
                      <MapPin className="ml-2 h-3.5 w-3.5 shrink-0 text-[#1f788d]" />
                    </button>
                  ))}
                </div>
              )}
              {searchResults.length > 0 && (
                <div>
                  <p className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#1f788d]">Assessment Areas</p>
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => {
                        selectArea(result.id);
                        setIsHeaderSearchOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left hover:bg-[#eff7f8]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-[#274a60]">{result.name}</span>
                        <span className="block truncate text-[10px] text-[#7a8994]">{result.district} · {result.population.toLocaleString()} people</span>
                      </span>
                      <MapPin className="ml-2 h-3.5 w-3.5 shrink-0 text-[#1f788d]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2"><div className="hidden items-center gap-1.5 rounded-full bg-[#e6f5ed] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#267653] md:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#2e9a67]" /> Demo mode</div><Button variant="outline" size="icon" onClick={() => setIsMobileNavOpen(true)} className="h-9 w-9 rounded-xl border-[#dbe5e8] bg-white text-[#476574] lg:hidden" aria-label="Open navigation"><Menu className="h-4 w-4" /></Button><Button variant="outline" size="icon" onClick={() => setIsMoreOpen(current => !current)} className="hidden h-9 w-9 rounded-xl border-[#dbe5e8] bg-white text-[#476574] sm:inline-flex" aria-label="More options"><MoreHorizontal className="h-4 w-4" /></Button></div>
      </div>
    </header>
    {isMobileNavOpen && <div className="fixed inset-0 z-50 bg-[#15384f]/35 lg:hidden" role="dialog" aria-label="Navigation menu"><aside className="h-full w-[286px] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between border-b border-[#e5edef] pb-3"><p className="text-sm font-bold text-[#274a60]">Decision support</p><Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(false)} aria-label="Close navigation"><X className="h-4 w-4" /></Button></div><nav className="mt-4 space-y-1"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a99a2]">Start here</p>{primaryNavigation.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setWorkspace(item.id); setIsMobileNavOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium", workspace === item.id ? "bg-[#eaf5f7] text-[#17627d]" : "text-[#526b79] hover:bg-[#f0f5f6]")}><Icon className="h-[17px] w-[17px]" />{item.label}</button>; })}<div className="mt-4 border-t border-[#e5edef] pt-3"><button type="button" onClick={() => setIsWorkspaceMenuOpen(current => !current)} aria-expanded={isWorkspaceMenuOpen} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#526b79] hover:bg-[#f0f5f6]"><span>More workspaces</span><ChevronDown className={cn("h-4 w-4 transition-transform", isWorkspaceMenuOpen && "rotate-180")} /></button>{isWorkspaceMenuOpen && <div className="mt-1 space-y-1">{secondaryNavigation.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => { setWorkspace(item.id); setIsMobileNavOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium", workspace === item.id ? "bg-[#eaf5f7] text-[#17627d]" : "text-[#526b79] hover:bg-[#f0f5f6]")}><Icon className="h-[17px] w-[17px]" />{item.label}</button>; })}</div>}</div></nav></aside></div>}
    {isMoreOpen && <div className="fixed right-4 top-[62px] z-50 w-56 rounded-xl border border-[#dce7ea] bg-white p-2 shadow-xl"><button onClick={() => { setWorkspace("reports"); setIsMoreOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#315a6c] hover:bg-[#f2f8f9]">Open persistent reports</button><button onClick={() => { setIndiaLocation(resolveIndiaLocationFromSearch("")); window.history.replaceState(null, "", window.location.pathname); setLocationNotice(null); setWorkspace("map"); setIsMoreOpen(false); }} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#315a6c] hover:bg-[#f2f8f9]">Reset India location</button></div>}
    <div className="flex min-h-[calc(100vh-68px)]">
      <aside className="hidden w-[232px] shrink-0 border-r border-[#e0e8eb] bg-[#fbfcfc] p-3 lg:block"><div className="px-3 pb-3 pt-2"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8a99a2]">Decision support</p></div><nav className="space-y-1"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8a99a2]">Start here</p>{primaryNavigation.map(item => { const Icon = item.icon; const active = workspace === item.id; return <button key={item.id} onClick={() => setWorkspace(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors", active ? "bg-[#eaf5f7] text-[#17627d]" : "text-[#526b79] hover:bg-[#f0f5f6]")}><Icon className={cn("h-[17px] w-[17px]", active && "text-[#1d7891]")} />{item.label}</button>; })}<div className="mt-4 border-t border-[#e5edef] pt-3"><button type="button" onClick={() => setIsWorkspaceMenuOpen(current => !current)} aria-expanded={isWorkspaceMenuOpen} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[#526b79] hover:bg-[#f0f5f6]"><span>More workspaces</span><ChevronDown className={cn("h-4 w-4 transition-transform", isWorkspaceMenuOpen && "rotate-180")} /></button>{isWorkspaceMenuOpen && <div className="mt-1 space-y-1">{secondaryNavigation.map(item => { const Icon = item.icon; const active = workspace === item.id; return <button key={item.id} onClick={() => setWorkspace(item.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors", active ? "bg-[#eaf5f7] text-[#17627d]" : "text-[#526b79] hover:bg-[#f0f5f6]")}><Icon className={cn("h-[17px] w-[17px]", active && "text-[#1d7891]")} />{item.label}</button>; })}</div>}</div></nav><div className="mt-7 rounded-xl border border-[#e1ebed] bg-[#f3f8f8] p-3"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#dceff0] text-[#1c7381]"><Sparkles className="h-3.5 w-3.5" /></span><div><p className="text-xs font-bold text-[#315263]">Analyst review</p><p className="text-[10px] text-[#718995]">AI narratives remain reviewable</p></div></div></div><div className="mt-auto px-3 pt-8 text-[10px] leading-relaxed text-[#84949d]">DIVA is a decision-support demonstration. It does not represent authoritative hazard information.</div></aside>
      <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-5">
        <div className="mx-auto max-w-[1660px]">{locationNotice && <div role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-[#ead6a3] bg-[#fff8e7] px-3 py-2 text-[11px] font-medium text-[#795c16]"><CircleAlert className="h-4 w-4 shrink-0" />{locationNotice}</div>}
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1f788d]">{workspaceSectionLabel(workspace)}</p><h1 className="mt-1 text-xl font-bold tracking-tight text-[#15384f] sm:text-2xl">{workspaceTitle(workspace)}</h1></div><div className="flex items-center gap-2"><span className="hidden rounded-lg border border-[#dce8eb] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#748792] sm:inline-flex">Updated {mapData.updatedAt}</span>{workspace === "dashboard" && <Button variant="outline" onClick={() => setIsInsightsOpen(current => !current)} className={cn("h-9 rounded-xl border-[#d5e2e5] bg-white text-xs font-semibold text-[#36566a]", isInsightsOpen && "bg-[#e9f5f6] text-[#146079]")}><SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" /> {isInsightsOpen ? "Hide insights" : "Show insights"}</Button>}<Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)} className={cn("h-9 rounded-xl border-[#d5e2e5] bg-white text-xs font-semibold text-[#36566a]", isFilterOpen && "bg-[#e9f5f6] text-[#146079]")}><Filter className="mr-1.5 h-3.5 w-3.5" /> Filter areas</Button></div></div>
          {isFilterOpen && <section className="mb-4 grid gap-3 rounded-2xl border border-[#d7e4e7] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.05)] md:grid-cols-[1.35fr_1fr_1fr_auto]"><div><p className="text-xs font-bold text-[#274d62]">Hazard type</p><div className="mt-2 flex flex-wrap gap-1.5">{["Flood", "River Erosion", "Extreme Rainfall", "Landslide"].map(hazard => <button key={hazard} onClick={() => toggleArray(hazard, filters.hazards, hazards => setFilters(current => ({ ...current, hazards })))} className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium", filters.hazards.includes(hazard) ? "border-[#4a96a6] bg-[#e9f6f7] text-[#17647a]" : "border-[#e0e8eb] text-[#72838d]")}>{hazard}</button>)}</div></div><div><p className="text-xs font-bold text-[#274d62]">Risk level</p><div className="mt-2 flex flex-wrap gap-1.5">{(["Critical", "High", "Moderate"] as RiskLevel[]).map(level => <button key={level} onClick={() => toggleArray(level, filters.riskLevels, riskLevels => setFilters(current => ({ ...current, riskLevels })))} className={cn("rounded-lg border px-2 py-1 text-[11px] font-medium", filters.riskLevels.includes(level) ? "border-[#e3ac9d] bg-[#fff2ed] text-[#a74322]" : "border-[#e0e8eb] text-[#72838d]")}>{level}</button>)}</div></div><div><p className="text-xs font-bold text-[#274d62]">Minimum population</p><Input type="number" min={0} value={filters.minimumPopulation || ""} onChange={event => setFilters(current => ({ ...current, minimumPopulation: Number(event.target.value) || 0 }))} placeholder="e.g. 5000" className="mt-2 h-8 rounded-lg text-xs" /></div><div className="flex items-end"><Button onClick={() => setFilters({ hazards: [], riskLevels: [], priority: [], minimumPopulation: 0, capacity: [] })} variant="outline" className="h-8 rounded-lg text-xs">Reset</Button></div><p className="md:col-span-4 text-[10px] text-[#768790]">{mappedAreas.length} assessment areas match the selected filters. These results are calculated through the typed demonstration API.</p></section>}
          {(["dataset", "replay", "whatif", "cases"] as Workspace[]).includes(workspace) ? <HistoricalLab initialView={workspace === "dataset" ? "dataset" : workspace === "replay" ? "replay" : workspace === "whatif" ? "whatif" : "cases"} /> : <><section data-diva-workspace={workspace} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_338px]">
            <div className="relative min-w-0 overflow-hidden rounded-2xl border border-[#dbe6e9] bg-white shadow-[0_18px_40px_rgba(22,55,70,0.09)]">
              <div className="absolute left-3 right-3 top-3 z-30 max-w-[420px]"><IndiaLocationSearch onSelect={location => { setIndiaLocation(location); setLocationNotice(null); window.history.replaceState(null, "", buildIndiaLocationSearch(location)); }} /></div>
              <DivaMap data={divaMapData} selectedId={selectedId} onSelect={selectArea} layers={layers} opacity={opacity} baseStyle={baseStyle} className="h-[500px] sm:h-[590px]" />
              <div className="absolute left-3 top-16 z-20 flex flex-col gap-2"><Button variant="outline" size="sm" onClick={() => setIsLayerOpen(!isLayerOpen)} className="h-9 rounded-xl border-white/90 bg-white/95 px-3 text-xs font-semibold text-[#2e5367] shadow-md backdrop-blur"><Layers3 className="mr-1.5 h-3.5 w-3.5 text-[#1e7890]" /> Layers <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", isLayerOpen && "rotate-180")} /></Button>{isLayerOpen && <div className="max-h-[440px] w-[268px] overflow-y-auto rounded-xl border border-white/90 bg-white/95 p-3 shadow-xl backdrop-blur"><div className="flex items-center justify-between pb-2 border-b border-[#e7edef]"><p className="text-xs font-bold text-[#284b60]">Map layers</p><span className="rounded bg-[#e9f5f7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#1d7084]">{indiaLocation.id === "india-overview" ? "India overview" : "India context"}</span></div><IndiaOverviewLayerControls layers={layers} onChange={(id, checked) => setLayers(current => ({ ...current, [id]: checked }))} /><div className="mt-3 border-t border-[#e7edef] pt-3"><p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#87959d]">Base style</p><div className="grid grid-cols-2 gap-1 rounded-lg bg-[#edf4f5] p-1"><button onClick={() => setBaseStyle("muted")} className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", baseStyle === "muted" ? "bg-white text-[#1c6f85] shadow-sm" : "text-[#72848f]")}>Muted</button><button onClick={() => setBaseStyle("terrain")} className={cn("rounded-md px-2 py-1 text-[10px] font-semibold", baseStyle === "terrain" ? "bg-white text-[#1c6f85] shadow-sm" : "text-[#72848f]")}>Terrain</button></div><div className="mb-2 mt-3 flex items-center justify-between text-[10px] font-medium text-[#657883]"><span>Overlay opacity</span><span>{Math.round(opacity * 100)}%</span></div><Slider value={[opacity * 100]} min={25} max={100} step={5} onValueChange={values => setOpacity((values[0] ?? 90) / 100)} aria-label="Map overlay opacity" /></div></div>}</div>
              <div className="absolute bottom-3 left-3 z-10 hidden rounded-xl border border-white/90 bg-white/95 p-2.5 shadow-lg backdrop-blur sm:block"><p className="text-[9px] font-bold tracking-[0.1em] text-[#5f737e]">{layers.redZones ? "PS191 AREA CLASSIFICATION" : "ACTIVE LEGEND"}</p>{layers.redZones ? <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[10px] font-medium text-[#5c6e78]"><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#c62828]" /> RED (Critical)</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#e65100]" /> ORANGE (Attention required)</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#2e7d32]" /> GREEN (Lower assessed concern)</span><span className="inline-flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full border border-[#8da2ac] bg-transparent" /> UNAVAILABLE</span>{layers.facilities && <span className="inline-flex items-center gap-1 border-l border-[#d0dbe0] pl-2"><i className="h-2.5 w-2.5 rounded-full bg-[#15803d]" /> Facilities (OSM)</span>}</div> : <div className="mt-1.5 flex items-center gap-2.5 text-[10px] font-medium text-[#5c6e78]"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#31825d]" /> Low</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#d3a52d]" /> Moderate</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#e66e2d]" /> High</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#bd3034]" /> Critical</span></div>}</div>
            </div>
              {indiaLocation.id !== "india-assam" && <aside className="rounded-2xl border border-[#dbe6e9] bg-white shadow-[0_12px_30px_rgba(28,55,70,0.05)]"><div className="flex items-start justify-between border-b border-[#e7edef] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#1e7890]">Selected assessment area</p><h2 className="mt-1 text-lg font-bold tracking-tight text-[#193d53]">{area.name}</h2><p className="mt-0.5 text-xs text-[#71828c]">{area.district} · {area.state}</p></div><Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-[#71828c]" aria-label="Close assessment panel"><X className="h-4 w-4" /></Button></div><div className="grid grid-cols-3 gap-px border-b border-[#e7edef] bg-[#e7edef]"><div className="bg-white px-3 py-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Population</p><p className="mt-1 text-sm font-bold text-[#274b60]">{area.population.toLocaleString()}</p></div><div className="bg-white px-3 py-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Risk</p><div className="mt-1"><RiskBadge level={analysis.riskLevel} className="px-1.5 py-0.5 text-[8px]" /></div></div><div className="bg-white px-3 py-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Priority</p><div className="mt-1"><RiskBadge level={analysis.relocationPriority} className="px-1.5 py-0.5 text-[8px]" /></div></div></div><div className="p-4"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold text-[#2a4c61]">Assessment snapshot</p><span className="rounded-md bg-[#eaf5f7] px-1.5 py-0.5 text-[9px] font-bold text-[#1c7084]">KERALA CONTEXT</span></div>{environmentQuery.data && <div className="mb-3 rounded-xl border border-[#d9e8ea] bg-[#f4faf9] p-2.5"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#2b7585]">{environmentQuery.data.status}</p><p className="mt-1 text-[11px] font-semibold text-[#385a67]">{environmentQuery.data.temperatureC ?? "—"}°C · {environmentQuery.data.precipitationMm ?? "—"} mm current precipitation · US AQI {environmentQuery.data.usAqi ?? "—"}</p><p className="mt-1 text-[9px] leading-relaxed text-[#758b94]">{environmentQuery.data.source}</p></div>}<div className="space-y-1"><FactorBar label="Overall risk" score={analysis.overallRisk} description={`${area.primaryHazard} · analytical model`} /><FactorBar label="Hazard exposure" score={analysis.hazardExposure} description={environmentQuery.data?.status === "LIVE MODELLED ENVIRONMENTAL CONTEXT" ? `Live environmental context available · not a hazard forecast` : `Environmental context unavailable; analytical hazard review only`} /><FactorBar label="Carrying capacity" score={analysis.carryingCapacityScore} description={`${analysis.capacityStatus} service readiness`} /></div><Button disabled={rerunAnalysis.isPending} onClick={() => rerunAnalysis.mutate({ id: area.id })} variant="outline" className="mt-3 h-8 w-full rounded-lg border-[#d5e6e8] bg-[#f9fcfc] text-[11px] font-semibold text-[#416979]">{rerunAnalysis.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />} Re-run deterministic analysis</Button><div className="mt-3 rounded-xl border border-[#dce8eb] bg-[#f4f9fa] p-3"><div className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1d7a8e]" /><div><p className="text-[11px] font-bold text-[#2b5062]">AI/ML decision-support narrative</p><p className="mt-1 text-[10px] leading-relaxed text-[#71848e]">Grounded only in the supplied analysis results. Every output remains pending analyst review.</p></div></div>{narrative && <div className="mt-2.5 border-t border-[#d9e7e9] pt-2.5"><p className="text-[11px] font-bold text-[#315263]">{narrative.headline}</p><p className="mt-1 text-[10px] leading-relaxed text-[#667b86]">{narrative.summary}</p><p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#17718a]">Pending analyst review</p></div>}<Button disabled={generateNarrative.isPending} onClick={() => generateNarrative.mutate({ id: area.id })} variant="outline" className="mt-3 h-8 w-full rounded-lg border-[#bcd8dc] bg-white text-[11px] font-semibold text-[#1d7187]">{generateNarrative.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-1.5 h-3.5 w-3.5" />}{narrative ? "Refresh narrative" : "Generate reviewed narrative"}</Button>{generateNarrative.error && <p className="mt-2 text-[10px] text-[#b03538]">Narrative generation is temporarily unavailable. The deterministic assessment remains available.</p>}</div><div className="mt-3 flex gap-2"><Button onClick={() => generateReport.mutate({ id: area.id, narrative })} disabled={generateReport.isPending} className="h-9 flex-1 rounded-xl bg-[#173d59] text-xs font-semibold text-white hover:bg-[#0d304a]">{generateReport.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />} Generate report</Button><Button onClick={() => setWorkspace("risk")} variant="outline" size="icon" className="h-9 w-9 rounded-xl border-[#d6e3e6]" aria-label="Open full assessment"><PanelRightOpen className="h-4 w-4" /></Button></div></div></aside>}
		          {indiaContextQuery.data && <IndiaContextSidebar context={indiaContextQuery.data} onOpenKeralaAssessment={() => setWorkspace("risk")} />}
	          </section>          {indiaContextQuery.data && <IndiaLocationSummaryStrip context={indiaContextQuery.data} />}
          {indiaLocation.id === "india-assam" && <><AssamStateProfile /><AssamDisasterHistory />{indiaContextQuery.data && <SelectedLocationForecastDetails context={indiaContextQuery.data} />}</>}
          <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><MetricCard label="Assessment areas" value={dashboardQuery.data.totals.habitations.toLocaleString()} detail="Within current demonstration extent" icon={MapPin} /><MetricCard label="Critical areas" value={dashboardQuery.data.totals.Critical.toLocaleString()} detail="Highest analytical risk class" icon={ShieldAlert} accent="red" /><MetricCard label="High-priority actions" value={dashboardQuery.data.totals.immediate.toLocaleString()} detail="Immediate relocation assessment" icon={CircleAlert} accent="orange" /><MetricCard label="Population exposed" value={`${Math.round(dashboardQuery.data.totals.population / 1000)}k`} detail="Scenario population across areas" icon={Users} accent="teal" /></section>
          {workspace === "dashboard" && isInsightsOpen && <section className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]"><div className="rounded-2xl border border-[#dbe6e9] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-[#284b60]">Risk distribution</p><p className="mt-1 text-[10px] text-[#7c8b93]">Scenario classification across assessment areas</p></div><SlidersHorizontal className="h-4 w-4 text-[#7c909a]" /></div><div className="mt-3 h-[174px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={riskDistribution} dataKey="value" nameKey="name" innerRadius={43} outerRadius={66} paddingAngle={3}>{riskDistribution.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip formatter={(value: number) => [`${value} areas`, "Count"]} contentStyle={{ borderRadius: 10, border: "1px solid #e0e8eb", fontSize: 11 }} /></PieChart></ResponsiveContainer></div><div className="grid grid-cols-4 gap-1 text-center">{riskDistribution.map(item => <div key={item.name}><span className="mx-auto block h-1.5 w-1.5 rounded-full" style={{ background: item.color }} /><p className="mt-1 text-[10px] font-semibold text-[#536a77]">{item.value}</p><p className="text-[9px] text-[#89969d]">{item.name}</p></div>)}</div></div><div className="rounded-2xl border border-[#dbe6e9] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div><p className="text-xs font-bold text-[#284b60]">Priority comparison</p><p className="mt-1 text-[10px] text-[#7c8b93]">Highest-ranked areas by relocation score</p></div><div className="mt-4 h-[205px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardQuery.data.ranked.slice(0, 5).map(item => ({ name: item.area.name.split(" ")[0], score: item.analysis.relocationScore }))} layout="vertical" margin={{ left: 0, right: 8 }}><XAxis type="number" hide domain={[0, 100]} /><YAxis type="category" dataKey="name" width={78} tick={{ fontSize: 10, fill: "#6f818b" }} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: "#f2f7f8" }} contentStyle={{ borderRadius: 10, border: "1px solid #e0e8eb", fontSize: 11 }} /><Bar dataKey="score" radius={[0, 5, 5, 0]} fill="#1d788d" barSize={13} /></BarChart></ResponsiveContainer></div></div><div className="rounded-2xl border border-[#dbe6e9] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-[#284b60]">Environmental context</p><p className="mt-1 text-[10px] text-[#7c8b93]">Risk trend across selected priority subset</p></div><CloudRain className="h-4 w-4 text-[#438ea0]" /></div><div className="mt-4 h-[181px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData}><defs><linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6cb6c4" stopOpacity={0.44} /><stop offset="100%" stopColor="#6cb6c4" stopOpacity={0.03} /></linearGradient></defs><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#748791" }} /><YAxis hide domain={[0, 100]} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e0e8eb", fontSize: 11 }} /><Area type="monotone" dataKey="risk" stroke="#267e93" strokeWidth={2} fill="url(#riskFill)" /></AreaChart></ResponsiveContainer></div></div></section>}
          <section className="mt-4 rounded-2xl border border-[#dbe6e9] bg-white shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7edef] p-4"><div><p className="text-sm font-bold text-[#284b60]">{workspace === "capacity" ? "Candidate site capacity" : workspace === "relocation" ? "Relocation recommendation queue" : workspace === "reports" ? "Permanent PDF report archive" : "Priority assessment queue"}</p><p className="mt-0.5 text-[10px] text-[#7c8b93]">Data status: DEMO DATA · Source: DIVA scenario dataset · Updated: {dashboardQuery.data.updatedAt}</p></div>{workspace === "reports" && <><input ref={artifactInputRef} className="hidden" type="file" accept=".geojson,.json,.csv,.zip,.pdf" onChange={event => handleArtifact(event.target.files?.[0])} /><Button onClick={() => artifactInputRef.current?.click()} disabled={uploadArtifact.isPending} variant="outline" className="h-8 rounded-lg border-[#d5e3e6] text-xs text-[#2c5d73]">{uploadArtifact.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />} Add source artifact</Button></>}</div>{workspace === "capacity" ? <div className="divide-y divide-[#edf1f2]">{analysis.candidateSites.map((site, index) => <div key={site.id} className="grid gap-3 px-4 py-3.5 md:grid-cols-[1.3fr_.8fr_.8fr_.8fr_1.3fr]"><div><p className="text-sm font-semibold text-[#294c60]">{site.name}</p><p className="mt-0.5 text-[10px] text-[#7c8d96]">{site.constraints.join(" · ")}</p></div><div><p className="text-[9px] font-bold uppercase text-[#89979e]">Available capacity</p><p className="mt-0.5 text-xs font-bold text-[#365569]">{site.availableCapacity.toLocaleString()} / {site.capacity.toLocaleString()}</p></div><div><p className="text-[9px] font-bold uppercase text-[#89979e]">Service access</p><p className="mt-0.5 text-xs font-bold text-[#365569]">{site.serviceAccess}/100</p></div><div><p className="text-[9px] font-bold uppercase text-[#89979e]">Suitability</p><p className="mt-0.5 text-xs font-bold text-[#365569]">{site.suitability}/100</p></div><div className="flex items-center justify-between gap-3"><p className="text-xs text-[#657a85]">{site.recommendation}</p><span className="rounded-full bg-[#e7f3f2] px-2 py-1 text-xs font-bold text-[#207468]">{site.score}</span></div></div>)}</div> : workspace === "reports" ? <div>{reportsQuery.data?.length ? reportsQuery.data.map(report => <div key={report.id} className="flex items-center justify-between gap-3 border-b border-[#edf1f2] px-4 py-3.5"><div><p className="text-sm font-semibold text-[#294c60]">{report.title}</p><p className="mt-0.5 text-[10px] text-[#7c8d96]">{report.id} · {report.kind === "HISTORICAL" ? "Historical validation PDF" : "Assessment PDF"} · {new Date(report.createdAt).toLocaleString()}</p></div><div className="flex items-center gap-3">{report.kind === "ASSESSMENT" && report.riskLevel ? <RiskBadge level={report.riskLevel as RiskLevel} /> : <span className="rounded-full bg-[#e9f5f7] px-2 py-1 text-[9px] font-bold text-[#1c7084]">HISTORICAL</span>}<a href={report.storageUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg border border-[#d9e4e7] px-2.5 text-xs font-semibold text-[#2b647b]"><Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF</a></div></div>) : <div className="px-4 py-10 text-center"><FileText className="mx-auto h-6 w-6 text-[#8ba2ad]" /><p className="mt-2 text-sm font-semibold text-[#4f6c7c]">No stored reports yet</p><p className="mt-1 text-xs text-[#82919a]">Assessment and historical PDFs remain available here after they are written to object storage and recorded in the archive.</p></div>}</div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#f7fafb]"><tr className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#82919b]"><th className="px-4 py-3">Assessment area</th><th className="px-4 py-3">Risk</th><th className="px-4 py-3">Population</th><th className="px-4 py-3">Primary driver</th><th className="px-4 py-3">Capacity</th><th className="px-4 py-3">Relocation</th><th className="px-4 py-3" /></tr></thead><tbody>{dashboardQuery.data.ranked.slice(0, 6).map(item => <tr key={item.area.id} className="border-t border-[#edf1f2] text-xs transition-colors hover:bg-[#f7fbfb]"><td className="px-4 py-3"><button onClick={() => selectArea(item.area.id)} className="font-semibold text-[#2c6076] hover:underline">{item.area.name}</button><p className="mt-0.5 text-[10px] text-[#7c8d96]">{item.area.district}</p></td><td className="px-4 py-3"><RiskBadge level={item.analysis.riskLevel} /></td><td className="px-4 py-3 font-semibold text-[#405d6d]">{item.area.population.toLocaleString()}</td><td className="px-4 py-3 text-[#667b86]">{item.analysis.riskFactors[0]?.label}</td><td className="px-4 py-3"><span className="font-semibold text-[#405d6d]">{item.analysis.carryingCapacityScore}</span><span className="text-[#87979e]"> / 100</span></td><td className="px-4 py-3"><RiskBadge level={item.analysis.relocationPriority} /></td><td className="px-4 py-3"><Button onClick={() => selectArea(item.area.id)} variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><ChevronDown className="h-3.5 w-3.5 -rotate-90" /></Button></td></tr>)}</tbody></table></div>}</section></>}
        </div>
        {workspace === "reports" && <section className="mt-4 rounded-2xl border border-[#dbe6e9] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div className="mb-3"><p className="text-sm font-bold text-[#284b60]">Persistent PDF archive</p><p className="mt-0.5 text-[10px] text-[#7c8b93]">Assessment and historical PDFs remain downloadable from their object-storage records.</p></div><ReportArchiveList reports={(reportsQuery.data ?? []).map(report => ({ ...report, createdAt: report.createdAt, kind: report.kind, storageUrl: report.storageUrl, riskLevel: report.riskLevel }))} /></section>}
        {indiaContextQuery.data && workspace !== "reports" && <div className="mx-auto mt-4 max-w-[1660px]"><SelectedLocationForecast context={indiaContextQuery.data!} /><SelectedLocationReportAction context={indiaContextQuery.data!} isPending={generateSelectedLocationReport.isPending} onDownload={() => generateSelectedLocationReport.mutate(indiaContextQuery.data!)} />{generateSelectedLocationReport.error && <p role="status" className="mt-2 text-[10px] font-medium text-[#b03538]">The selected-area PDF could not be created. The on-screen location context remains available.</p>}<button type="button" onClick={() => setIsLocationDetailsOpen(current => !current)} aria-expanded={isLocationDetailsOpen} className="mt-3 flex w-full items-center justify-between rounded-xl border border-[#d8e7e9] bg-white px-4 py-3 text-left text-xs font-semibold text-[#31596c] shadow-sm hover:bg-[#f7fbfb]"><span>{locationDetailsToggleLabel(isLocationDetailsOpen)}<span className="ml-2 font-normal text-[#83939b]">Location decision context, metrics, infrastructure, and comparison row</span></span><ChevronDown className={cn("h-4 w-4 transition-transform", isLocationDetailsOpen && "rotate-180")} /></button>{isLocationDetailsOpen && <SelectedLocationForecastDetails context={indiaContextQuery.data!} />}</div>}
      </main>
    </div>
  </div>;
}
