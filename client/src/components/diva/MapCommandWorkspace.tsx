import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AssessmentAnalysis, AssessmentArea } from "@shared/diva";
import type { IndiaLocation, IndiaLocationContext } from "@shared/india";
import { AlertTriangle, ArrowRight, Bot, Building2, Check, ChevronDown, CircleAlert, CloudSun, Crosshair, Download, Expand, Layers3, MapPin, Menu, Minus, MoreHorizontal, PanelRightOpen, Plus, RotateCcw, ShieldAlert, Sparkles, Users, Wind, X } from "lucide-react";
import { useState } from "react";
import { DivaMap, type MapData } from "./DivaMap";
import { IndiaLocationSearch } from "./IndiaLocationSearch";
import { buildLocationPlanningCorridor, buildRelocationRoute, buildSelectedLocationSummary, formatMapMetric, getRecommendedSite, mapRiskColor } from "./mapCommandUi";
import { PS191DecisionPanel } from "./PS191DecisionPanel";
import { lookupRealDistrict } from "./SelectedLocationDecisionPanels";

const hazardControls = [
  { id: "flood", label: "Flood" },
  { id: "rainfall", label: "Coastal erosion" },
  { id: "landslide", label: "Landslide" },
  { id: "temperature", label: "Cloudburst" },
] as const;

const layerControls = [
  { id: "population", label: "Population density" },
  { id: "vulnerable", label: "Vulnerable habitations" },
  { id: "infrastructure", label: "Emergency facilities" },
  { id: "boundaries", label: "Administrative boundaries" },
  { id: "rainfall", label: "Rainfall context" },
  { id: "routes", label: "Planning corridor" },
] as const;

function PanelHeading({ icon: Icon, children }: { icon: typeof MapPin; children: string }) {
  return <div className="flex items-center gap-2 text-[12px] font-semibold text-[#f0f6f3]"><Icon className="h-4 w-4 text-[#d9e7ec]" />{children}</div>;
}

function MetricRow({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof Users; label: string; value: string; tone?: "neutral" | "red" | "orange" | "green" }) {
  const colors = { neutral: "text-[#e9f2f2]", red: "text-[#ff5b63]", orange: "text-[#ff9b2f]", green: "text-[#65d378]" };
  return <div className="flex items-center justify-between gap-3 border-b border-[#1f3741] py-3 last:border-b-0"><span className="flex items-center gap-2 text-[12px] text-[#b6c8cd]"><Icon className={cn("h-4 w-4", tone === "red" ? "text-[#f2434e]" : tone === "orange" ? "text-[#e98b24]" : tone === "green" ? "text-[#5ccc70]" : "text-[#b6c8cd]")} />{label}</span><strong className={cn("text-[13px] font-semibold", colors[tone])}>{value}</strong></div>;
}

export function MapCommandWorkspace({ data, selectedId, area, analysis, indiaLocation, indiaContext, locationNotice, layers, opacity, baseStyle, isReportPending, onSelectArea, onSelectLocation, onLayerChange, onOpacityChange, onBaseStyleChange, onOpenDashboard, onOpenRelocation, onGenerateReport }: { data: MapData; selectedId: string; area: AssessmentArea; analysis: AssessmentAnalysis; indiaLocation: IndiaLocation; indiaContext?: IndiaLocationContext; locationNotice?: string | null; layers: Record<string, boolean>; opacity: number; baseStyle: "muted" | "terrain"; isReportPending?: boolean; onSelectArea: (id: string) => void; onSelectLocation: (location: IndiaLocation) => void; onLayerChange: (id: string, enabled: boolean) => void; onOpacityChange: (value: number) => void; onBaseStyleChange: (value: "muted" | "terrain") => void; onOpenDashboard: () => void; onOpenRelocation: () => void; onGenerateReport: () => void }) {
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHazardsOpen, setIsHazardsOpen] = useState(false);
  const selectedContext = indiaContext;
  const selectedLocation = selectedContext?.location ?? indiaLocation;
  const selectedSummary = selectedContext ? buildSelectedLocationSummary(selectedContext) : null;
  const isSearchContext = Boolean(selectedContext);
  const recommendedSite = getRecommendedSite(analysis);
  const risk = selectedContext?.screening.riskScore ?? analysis.overallRisk;
  const riskLabel = selectedContext?.screening.riskLevel ?? analysis.riskLevel;
  const stateLabel = selectedLocation?.address.state ?? area.state.split(",")[0];
  const districtLabel = selectedContext && (selectedLocation.category === "State" || selectedLocation.category === "Place") ? `${selectedLocation.category} extent` : selectedLocation.address.district ?? selectedLocation.address.city ?? selectedLocation.address.locality ?? area.district;
  const panelLocationName = selectedContext ? selectedLocation.name : area.name;
  const panelDistrict = selectedContext ? districtLabel : area.district;
  const panelState = selectedContext ? stateLabel : area.state;
  const panelLocationKind = selectedContext ? selectedLocation.category : "Assessment area";
  const priorityLabel = selectedContext?.screening.priority ?? analysis.relocationPriority;
  const actionLabel = selectedContext?.screening.hazardContext ?? analysis.recommendedAction;
  const commandLayers: Record<string, boolean> = { ...layers, routes: true };
  const commandData: MapData = selectedContext
    ? { ...data, center: [selectedLocation.longitude, selectedLocation.latitude], activeLocation: selectedContext, nationwide: undefined, relocationRoute: buildLocationPlanningCorridor(selectedLocation, { infrastructure: [], nearbyInfrastructure: selectedContext.infrastructure.items }, undefined) }
    : { ...data, center: [area.longitude, area.latitude], activeLocation: undefined, nationwide: undefined, relocationRoute: buildRelocationRoute(area, data, recommendedSite?.name) };

  const realDistrict = lookupRealDistrict(selectedLocation.name, selectedLocation.address?.district ?? selectedLocation.address?.city ?? area.district);

  return <div data-testid="map-command-workspace" className="map-command-workspace min-h-screen overflow-hidden bg-[#06121a] text-[#edf7f3]">{locationNotice && <div role="status" className="absolute left-4 right-4 top-4 z-50 rounded-xl border border-[#8c6b26] bg-[#3a2c0d]/95 px-3 py-2 text-[11px] font-medium text-[#f6dfa1] shadow-2xl backdrop-blur-md lg:left-[206px] lg:right-[302px]"><span className="font-bold">Location fallback:</span> {locationNotice}</div>}
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_286px]">
      <aside className="relative z-30 hidden border-r border-[#203742] bg-[#071722] lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5 border-b border-[#203742] px-4 py-3.5"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#183747] text-[#bce9de]"><ShieldAlert className="h-4 w-4" /></div><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#a8c5cc]">PS 191 · SIH</p><p className="text-[13px] font-semibold text-white">Akashvani</p></div></div>
        <div className="space-y-5 overflow-y-auto p-3.5">
          <section><PanelHeading icon={MapPin}>Selected location</PanelHeading><div className="mt-3 rounded-lg border border-[#2c4855] bg-[#0d202a] px-3 py-2.5"><p className="text-[13px] font-semibold text-white">{panelLocationName}</p><p className="mt-1 text-[10px] text-[#9bb1b6]">{panelLocationKind} · {panelDistrict} · {panelState}</p><p className="mt-2 text-[9px] leading-relaxed text-[#78939b]">Use the search box above to change the location.</p></div></section>
          <div className="h-px bg-[#203742]" />
          <section><button type="button" onClick={() => setIsHazardsOpen(current => !current)} aria-expanded={isHazardsOpen} className="flex w-full items-center justify-between text-left"><PanelHeading icon={AlertTriangle}>Hazards</PanelHeading><ChevronDown className={cn("h-4 w-4 text-[#8ea7ae] transition-transform", isHazardsOpen && "rotate-180")} /></button>{isHazardsOpen && <div className="mt-2.5 space-y-2.5">{hazardControls.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-2 text-[12px] text-[#c8d7db]"><input type="checkbox" checked={Boolean(layers[item.id])} onChange={event => onLayerChange(item.id, event.target.checked)} className="h-4 w-4 rounded border-[#54727e] bg-[#081821] accent-[#3188ff]" />{item.label}</label>)}<p data-testid="active-hazard-filter-summary" className="border-t border-[#25404a] pt-2 text-[10px] leading-relaxed text-[#8ea8af]">Active hazard filters: {hazardControls.filter(item => Boolean(layers[item.id])).map(item => item.label).join(", ") || "None"}</p></div>}</section>
          <div className="h-px bg-[#203742]" />
          <section><PanelHeading icon={ShieldAlert}>Risk level</PanelHeading><div className="mt-3 space-y-2.5">{["High", "Medium", "Low"].map((label, index) => <div key={label} className="flex items-center gap-2 text-[12px] text-[#c8d7db]"><span className="h-3.5 w-3.5 rounded-full" style={{ background: index === 0 ? "#ff3339" : index === 1 ? "#ff8b17" : "#36c64c" }} />{label}</div>)}</div></section>
          <div className="h-px bg-[#203742]" />
          <section><div className="space-y-3 text-[10px] text-[#aac0c5]"><div className="flex items-center gap-2"><span className="text-[#f6f8f2]">⌂</span> Vulnerable habitations</div><div className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5 text-[#e7f4ed]" /> Planning corridors</div><div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#65d378]" /> Safe relocation zones</div><div className="flex items-center gap-2"><CircleAlert className="h-3.5 w-3.5 text-[#ff4b54]" /> Emergency facilities</div></div></section>
        </div>
        <div className="mt-auto border-t border-[#203742] px-3.5 py-3 text-[9px] leading-relaxed text-[#718a92]">DIVA decision-support demonstration. Not an authoritative warning system.</div>
      </aside>

      <main className="relative min-h-[720px] min-w-0 bg-[#0a1a20]">
        <div className="absolute inset-0"><DivaMap data={commandData} selectedId={selectedId} onSelect={onSelectArea} layers={commandLayers} opacity={opacity} baseStyle={baseStyle} className="h-full w-full" showContextPanel={false} zoomOverride={isSearchContext ? undefined : 10.2} /></div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4 sm:p-5"><div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-2"><div className="w-full max-w-[295px]"><IndiaLocationSearch tone="dark" onSelect={onSelectLocation} /></div><div className="hidden items-center gap-1.5 rounded-lg border border-[#49646c] bg-[#0b1e27]/85 px-2.5 py-2 text-[10px] font-semibold text-[#c4d8dc] shadow-xl backdrop-blur-md sm:flex"><Crosshair className="h-3.5 w-3.5 text-[#75c987]" />{indiaLocation.name}</div></div><div className="pointer-events-auto flex items-center gap-1.5"><Button variant="ghost" size="icon" onClick={onOpenDashboard} className="h-9 w-9 rounded-lg border border-[#405a63] bg-[#0b1e27]/90 text-[#d7e5e8] shadow-xl backdrop-blur-md hover:bg-[#173541]" aria-label="Open dashboard"><MoreHorizontal className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="h-9 w-9 rounded-lg border border-[#405a63] bg-[#0b1e27]/90 text-[#d7e5e8] shadow-xl backdrop-blur-md hover:bg-[#173541] lg:hidden" aria-label="Open map menu"><Menu className="h-4 w-4" /></Button></div></div>
        <div className="absolute left-1/2 top-[76px] z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-[#405a63] bg-[#0b1e27]/90 p-1 shadow-2xl backdrop-blur-md"><Button variant="ghost" size="sm" onClick={() => setIsLayersOpen(value => !value)} className={cn("h-8 rounded-md px-2.5 text-[11px] font-semibold text-[#e1ecee] hover:bg-[#1b3c46]", isLayersOpen && "bg-[#193d45] text-[#8be090]")}><Layers3 className="mr-1.5 h-3.5 w-3.5" />Layers</Button><Button variant="ghost" size="sm" onClick={() => setIsLegendOpen(value => !value)} className={cn("h-8 rounded-md px-2.5 text-[11px] font-semibold text-[#e1ecee] hover:bg-[#1b3c46]", isLegendOpen && "bg-[#193d45] text-[#8be090]")}><span className="mr-1.5 grid grid-cols-2 gap-0.5"><span className="h-1.5 w-1.5 bg-[#7fc58e]" /><span className="h-1.5 w-1.5 bg-[#f2be55]" /></span>Legend</Button><Button variant="ghost" size="icon" onClick={() => document.querySelector<HTMLElement>('[data-testid="india-gis-map"]')?.requestFullscreen()} className="h-8 w-8 rounded-md text-[#e1ecee] hover:bg-[#1b3c46]" aria-label="Toggle fullscreen map"><Expand className="h-3.5 w-3.5" /></Button></div>
        {isLayersOpen && <div className="absolute left-1/2 top-[124px] z-30 w-[228px] -translate-x-1/2 rounded-xl border border-[#3e5c65] bg-[#0b1d26]/96 p-3 shadow-2xl backdrop-blur-md"><div className="flex items-center justify-between"><p className="text-[11px] font-bold text-[#e6f3ef]">Map layers</p><span className="rounded bg-[#173d3d] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#84d58d]">Live view</span></div><div className="mt-2 divide-y divide-[#25404a]">{layerControls.map(item => <label key={item.id} className="flex items-center justify-between gap-3 py-2 text-[10px] text-[#bdd0d4]"><span>{item.label}</span><Switch checked={Boolean(commandLayers[item.id])} onCheckedChange={value => onLayerChange(item.id, value)} aria-label={`Toggle ${item.label}`} /></label>)}</div><div className="mt-2 border-t border-[#25404a] pt-2"><div className="grid grid-cols-2 gap-1 rounded-md bg-[#102832] p-1"><button onClick={() => onBaseStyleChange("muted")} className={cn("rounded px-2 py-1 text-[9px] font-semibold", baseStyle === "muted" ? "bg-[#315159] text-white" : "text-[#8fa9af]")}>Muted</button><button onClick={() => onBaseStyleChange("terrain")} className={cn("rounded px-2 py-1 text-[9px] font-semibold", baseStyle === "terrain" ? "bg-[#315159] text-white" : "text-[#8fa9af]")}>Terrain</button></div><div className="mt-2 flex items-center justify-between text-[9px] text-[#8fa9af]"><span>Overlay opacity</span><span>{Math.round(opacity * 100)}%</span></div><Slider value={[opacity * 100]} min={25} max={100} step={5} onValueChange={values => onOpacityChange((values[0] ?? 90) / 100)} className="mt-2" aria-label="Map overlay opacity" /></div></div>}
        {isLegendOpen && <div className="absolute left-1/2 top-[124px] z-30 w-[228px] -translate-x-1/2 rounded-xl border border-[#3e5c65] bg-[#0b1d26]/96 p-3 shadow-2xl backdrop-blur-md"><p className="text-[11px] font-bold text-[#e6f3ef]">Active legend</p><div className="mt-2 space-y-2 text-[10px] text-[#bdd0d4]"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff3d43]" />High hazard exposure</div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#ff941e]" />Medium hazard exposure</div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#50cf64]" />Low hazard / safe zone</div><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full border border-white bg-transparent" />Selected assessment area</div></div></div>}
        <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden rounded-lg border border-[#405a63] bg-[#0b1e27]/88 px-2.5 py-2 text-[10px] text-[#c9d9dc] shadow-xl backdrop-blur-md sm:block"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#ff3d43]" />{isSearchContext ? "Screening risk" : `${riskLabel} analytical risk`} <strong className="text-white">{selectedSummary?.risk ?? `${risk}/100`}</strong></div><div className="mt-1 text-[9px] text-[#8da6ad]">{isSearchContext ? `${selectedLocation.category} · ${selectedLocation.population == null ? "Population unavailable" : `${formatMapMetric(selectedLocation.population)} population reported`}` : `${area.primaryHazard} · ${formatMapMetric(area.population)} people in assessment extent`}</div></div>
      </main>

      <aside className="relative z-30 border-l border-[#203742] bg-[#071722] lg:min-h-screen overflow-y-auto">
        <div className="flex h-full flex-col"><div className="border-b border-[#203742] p-4 sm:p-5"><div className="flex items-start gap-2.5"><div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#352873] text-[#c6b9ff]"><Bot className="h-4 w-4" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b8a8ff]">{isSearchContext ? "Location summary" : "Relocation plan"}</p></div></div><h1 className="mt-6 text-[21px] font-semibold tracking-tight text-white">{selectedSummary?.title ?? `Village: ${area.name}`}</h1><p className="mt-1 text-[11px] text-[#8ea8af]">{selectedSummary?.subtitle ?? `${panelDistrict} · ${panelState} · DIVA-${selectedId}`}</p></div>
          <div className="p-4 sm:p-5"><div className="rounded-lg border border-[#1f3741] bg-[#091b25] px-3"><MetricRow icon={ShieldAlert} label={isSearchContext ? "Screening risk" : "Risk"} value={selectedSummary?.risk ?? `${risk}/100`} tone={risk >= 70 ? "red" : risk >= 50 ? "orange" : "green"} />{isSearchContext ? <><MetricRow icon={Users} label="Population" value={selectedSummary?.population ?? formatMapMetric(area.population)} /><MetricRow icon={CloudSun} label="Current weather" value={selectedSummary?.temperature ?? "Unavailable"} /><MetricRow icon={Sparkles} label="Air quality" value={selectedSummary?.airQuality ?? "Unavailable"} /></> : <><MetricRow icon={Users} label="Population" value={formatMapMetric(area.population)} /><MetricRow icon={Users} label="Vulnerable" value={formatMapMetric(area.vulnerablePopulation)} tone="orange" /></>}</div>
            {isSearchContext ? <div className="mt-4 rounded-lg border border-[#1f3741] bg-[#091b25] px-3"><MetricRow icon={MapPin} label="Selected place" value={selectedLocation.category} /><MetricRow icon={CloudSun} label="Current precipitation" value={selectedSummary?.precipitation ?? "Unavailable"} /><MetricRow icon={Wind} label="Next-day forecast" value={selectedSummary?.nextForecast ?? "Unavailable"} /><MetricRow icon={Building2} label="Mapped facilities" value={selectedSummary?.facilityCount ?? "Unavailable"} /></div> : <div className="mt-4 rounded-lg border border-[#1f3741] bg-[#091b25] px-3"><MetricRow icon={MapPin} label="Recommended site" value={recommendedSite?.name ?? "Pending"} tone="green" /><MetricRow icon={Building2} label="Available capacity" value={recommendedSite ? formatMapMetric(recommendedSite.availableCapacity) : "—"} /><MetricRow icon={ArrowRight} label="Service access" value={recommendedSite ? `${recommendedSite.serviceAccess}/100` : "—"} /><MetricRow icon={Check} label="Suitability" value={recommendedSite ? `${recommendedSite.suitability}%` : "—"} tone="green" /></div>}
            <div className="mt-4 rounded-lg border border-[#1f3741] bg-[#091b25] px-3 py-3"><div className="flex items-center justify-between"><span className="text-[11px] text-[#b6c8cd]">Relocation priority</span><span className={cn("rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]", priorityLabel === "Immediate" || priorityLabel === "High" ? "bg-[#54242a] text-[#ff7b7d]" : priorityLabel === "Moderate" ? "bg-[#514321] text-[#ffd36a]" : "bg-[#183d2e] text-[#65d378]")}>{selectedSummary?.priority ?? priorityLabel}</span></div><div className="mt-3 flex items-center gap-2 text-[10px] text-[#8ea8af]"><span className="h-2 w-2 rounded-full" style={{ background: mapRiskColor(riskLabel) }} />{selectedSummary?.action ?? actionLabel}</div><p className="mt-3 border-t border-[#1f3741] pt-3 text-[9px] leading-relaxed text-[#78939b]">{commandData.relocationRoute?.sourceNote}</p></div>
            {realDistrict && (
              <div className="mt-4">
                <PS191DecisionPanel
                  districtId={realDistrict.id}
                  districtName={realDistrict.name}
                  classification={risk >= 70 ? "RED" : risk >= 40 ? "ORANGE" : "GREEN"}
                  stateCode={realDistrict.stateCode}
                />
              </div>
            )}
          </div><div className="mt-auto border-t border-[#203742] p-4 sm:p-5">{isSearchContext ? <div className="rounded-lg border border-[#304a55] bg-[#0b1e27] p-3 text-[10px] leading-relaxed text-[#8ea8af]">Search context is location-specific. Detailed relocation scoring and downloadable assessment reports are available only for retained DIVA assessment areas.</div> : <><Button onClick={onOpenRelocation} className="h-10 w-full rounded-md bg-[#5424d6] text-[12px] font-semibold text-white shadow-[0_8px_20px_rgba(84,36,214,0.22)] hover:bg-[#6939e3]"><ArrowRight className="mr-2 h-4 w-4" />View detailed route</Button><Button onClick={onGenerateReport} disabled={isReportPending} variant="outline" className="mt-3 h-10 w-full rounded-md border-[#304a55] bg-transparent text-[12px] font-semibold text-[#c6d7da] hover:bg-[#102a34] hover:text-white"><Download className="mr-2 h-4 w-4" />{isReportPending ? "Generating report…" : "Download report"}</Button></>}<button onClick={() => setIsMobileMenuOpen(false)} className="mt-3 hidden w-full text-center text-[10px] text-[#8099a1] lg:block">Map command view · analyst review required</button></div></div>
      </aside>
    </div>
    {isMobileMenuOpen && <div className="fixed inset-0 z-50 bg-[#02090d]/80 lg:hidden"><aside className="h-full w-[286px] border-r border-[#294450] bg-[#071722] p-4 shadow-2xl"><div className="flex items-center justify-between border-b border-[#203742] pb-3"><div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-[#9ddbb0]" /><span className="text-sm font-semibold text-white">Map controls</span></div><Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="h-8 w-8 text-[#c8d7db]" aria-label="Close map controls"><X className="h-4 w-4" /></Button></div><div className="mt-4 space-y-4"><p className="text-[10px] leading-relaxed text-[#8ea8af]">Use the desktop layout for the full region, hazard, and relocation legend. The selected location remains centered on the map.</p><Button onClick={onOpenDashboard} variant="outline" className="w-full border-[#35515b] text-[#d7e5e8]">Open dashboard</Button></div></aside></div>}
  </div>;
}
