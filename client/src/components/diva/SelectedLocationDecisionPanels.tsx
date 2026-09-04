import type { IndiaLocationContext, IndiaLocation } from "@shared/india";
import { STATE_CONFIGURATIONS, stateConfigToLocation, buildIndiaLocationSearch } from "@shared/india";
import { SelectedLocationInfrastructure } from "./SelectedLocationInfrastructure";
import { PS191DecisionPanel } from "./PS191DecisionPanel";
import { AlertTriangle, CheckCircle2, CloudSun, Compass, Droplets, FileText, MapPin, Mountain, ShieldAlert, Users, Wind, Layers } from "lucide-react";
import React from "react";

const REAL_DISTRICT_MAP: Record<string, { id: string; name: string; stateCode: string }> = {
  "dibrugarh": { id: "DIST-AS-DIB", name: "Dibrugarh", stateCode: "AS" },
  "sivasagar": { id: "DIST-AS-SIV", name: "Sivasagar", stateCode: "AS" },
  "dhemaji": { id: "DIST-AS-DHE", name: "Dhemaji", stateCode: "AS" },
  "east godavari": { id: "DIST-AP-EGD", name: "East Godavari", stateCode: "AP" },
  "krishna": { id: "DIST-AP-KRI", name: "Krishna", stateCode: "AP" },
  "sangli": { id: "DIST-MH-SAN", name: "Sangli", stateCode: "MH" },
  "pune": { id: "DIST-MH-PUN", name: "Pune", stateCode: "MH" },
  "mumbai": { id: "DIST-MH-MUM", name: "Mumbai", stateCode: "MH" },
  "kodagu": { id: "DIST-KA-KOD", name: "Kodagu", stateCode: "KA" },
  "bengaluru": { id: "DIST-KA-BEN", name: "Bengaluru Urban", stateCode: "KA" },
  "bengaluru urban": { id: "DIST-KA-BEN", name: "Bengaluru Urban", stateCode: "KA" },
  "khagaria": { id: "DIST-BR-KHA", name: "Khagaria", stateCode: "BR" },
  "patna": { id: "DIST-BR-PAT", name: "Patna", stateCode: "BR" },
  "ranchi": { id: "DIST-JH-RAN", name: "Ranchi", stateCode: "JH" },
  "aizawl": { id: "DIST-MZ-AIZ", name: "Aizawl", stateCode: "MZ" },
  "puri": { id: "DIST-OD-PUR", name: "Puri", stateCode: "OD" },
  "kendrapara": { id: "DIST-OD-KEN", name: "Kendrapara", stateCode: "OD" },
  "raipur": { id: "DIST-CT-RAI", name: "Raipur", stateCode: "CT" },
  "gorakhpur": { id: "DIST-UP-GOR", name: "Gorakhpur", stateCode: "UP" },
  "ballia": { id: "DIST-UP-BAL", name: "Ballia", stateCode: "UP" },
  "jodhpur": { id: "DIST-RJ-JOD", name: "Jodhpur", stateCode: "RJ" },
  "nilgiris": { id: "DIST-TN-NIL", name: "Nilgiris", stateCode: "TN" },
  "the nilgiris": { id: "DIST-TN-NIL", name: "Nilgiris", stateCode: "TN" },
  "chennai": { id: "DIST-TN-CHE", name: "Chennai", stateCode: "TN" },
  "wayanad": { id: "DIST-KL-WAY", name: "Wayanad", stateCode: "KL" },
  "alappuzha": { id: "DIST-KL-ALP", name: "Alappuzha", stateCode: "KL" },
  "ernakulam": { id: "DIST-KL-ERN", name: "Ernakulam", stateCode: "KL" },
  "idukki": { id: "DIST-KL-IDK", name: "Idukki", stateCode: "KL" },
  "kannur": { id: "DIST-KL-KNR", name: "Kannur", stateCode: "KL" },
  "kasaragod": { id: "DIST-KL-KAS", name: "Kasaragod", stateCode: "KL" },
  "kollam": { id: "DIST-KL-KOL", name: "Kollam", stateCode: "KL" },
  "kottayam": { id: "DIST-KL-KTM", name: "Kottayam", stateCode: "KL" },
  "kozhikode": { id: "DIST-KL-KZD", name: "Kozhikode", stateCode: "KL" },
  "malappuram": { id: "DIST-KL-MA", name: "Malappuram", stateCode: "KL" },
  "palakkad": { id: "DIST-KL-PLK", name: "Palakkad", stateCode: "KL" },
  "pathanamthitta": { id: "DIST-KL-PTA", name: "Pathanamthitta", stateCode: "KL" },
  "thiruvananthapuram": { id: "DIST-KL-TVM", name: "Thiruvananthapuram", stateCode: "KL" },
  "thrissur": { id: "DIST-KL-TSR", name: "Thrissur", stateCode: "KL" },
};

export function lookupRealDistrict(name?: string | null, district?: string | null) {
  const normDist = (district || "").trim().toLowerCase();
  if (normDist && REAL_DISTRICT_MAP[normDist]) return REAL_DISTRICT_MAP[normDist];
  const normName = (name || "").trim().toLowerCase();
  if (normName && REAL_DISTRICT_MAP[normName]) return REAL_DISTRICT_MAP[normName];
  for (const [k, v] of Object.entries(REAL_DISTRICT_MAP)) {
    if (normDist.includes(k) || normName.includes(k)) return v;
  }
  return null;
}


function badgeClass(priority: IndiaLocationContext["screening"]["priority"]) {
  return priority === "Immediate" ? "bg-[#fee8e7] text-[#b23c35]" : priority === "High" ? "bg-[#fff0e5] text-[#b86728]" : priority === "Moderate" ? "bg-[#fff6dc] text-[#977219]" : priority === "Low" ? "bg-[#e6f5ec] text-[#267553]" : "bg-[#edf1f3] text-[#71828c]";
}

function riskTextClass(level: IndiaLocationContext["screening"]["riskLevel"]) {
  return level === "High" ? "text-[#b23c35]" : level === "Moderate" ? "text-[#977219]" : level === "Low" ? "text-[#267553]" : "text-[#71828c]";
}

function ContextStat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Users }) {
  return <div className="rounded-xl border border-[#dfeaec] bg-white p-3.5"><div className="flex items-center justify-between gap-2"><p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#819099]">{label}</p><Icon className="h-3.5 w-3.5 text-[#4991a0]" /></div><p className="mt-1.5 text-base font-bold text-[#274b60]">{value}</p><p className="mt-1 text-[10px] leading-relaxed text-[#718892]">{detail}</p></div>;
}

export function SelectedLocationPriorityQueue({ context }: { context: IndiaLocationContext }) {
  const { location, screening, environment } = context;
  const next = environment.forecast[0];
  return <section data-testid="selected-location-priority-queue" className="mt-4 overflow-hidden rounded-2xl border border-[#c7e0e5] bg-white shadow-[0_12px_30px_rgba(28,55,70,0.05)]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2edef] p-4"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Decision context details</p><h2 className="mt-1 text-sm font-bold text-[#284b60]">How {location.name} is being screened</h2><p className="mt-0.5 text-[10px] text-[#738891]">Values below refresh with the current India search selection.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClass(screening.priority)}`}>{screening.priority.toUpperCase()} PRIORITY</span></div><div className="grid gap-px bg-[#e7eff1] sm:grid-cols-4"><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#84949d]">Screening score</p><p className={`mt-1 text-lg font-bold ${riskTextClass(screening.riskLevel)}`}>{screening.riskScore === null ? "—" : `${screening.riskScore}/100`}</p><p className="text-[9px] text-[#718792]">Decision-support only</p></div><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#84949d]">Population</p><p className="mt-1 text-lg font-bold text-[#264c60]">{location.population?.toLocaleString("en-IN") ?? "Unavailable"}</p><p className="text-[9px] text-[#718792]">{location.populationSource}</p></div><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#84949d]">Current weather</p><p className="mt-1 text-lg font-bold text-[#264c60]">{environment.temperatureC === null ? "—" : `${environment.temperatureC}°C`}</p><p className="text-[9px] text-[#718792]">{environment.precipitationMm === null ? "Precipitation unavailable" : `${environment.precipitationMm} mm current precipitation`}</p></div><div className="bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#84949d]">Next forecast day</p><p className="mt-1 text-lg font-bold text-[#264c60]">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"}</p><p className="text-[9px] text-[#718792]">{next ? `${next.precipitationProbability ?? "—"}% precipitation · ${next.windSpeedMaxKph ?? "—"} km/h wind` : "Modelled forecast unavailable"}</p></div></div><div className="flex items-start gap-2 bg-[#f7fbfb] p-3 text-[10px] leading-relaxed text-[#627d88]"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1d768c]" />{screening.hazardContext}</div></section>;
}

export function SelectedLocationPriorityDecisionTable({ context }: { context: IndiaLocationContext }) {
  const { location, screening, environment } = context;
  const next = environment.forecast[0];
  return <section data-testid="selected-location-decision-table" className="mt-3 overflow-hidden rounded-2xl border border-[#c9e1e6] bg-white shadow-[0_10px_24px_rgba(28,55,70,0.04)]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3edef] p-3.5"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected-area comparison row</p><p className="mt-0.5 text-[10px] text-[#718792]">This row is recomputed from the active India selection, not a retained scenario record.</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${badgeClass(screening.priority)}`}>{screening.priority.toUpperCase()}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f6fafb]"><tr className="text-[9px] font-bold uppercase tracking-[.1em] text-[#82919b]"><th className="px-4 py-2.5">Selected area</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Population</th><th className="px-4 py-2.5">Screening score</th><th className="px-4 py-2.5">Next forecast</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody><tr data-testid="selected-location-decision-row" className="border-t border-[#edf1f2] text-xs"><td className="px-4 py-3"><p className="font-semibold text-[#2c6076]">{location.name}</p><p className="mt-0.5 text-[10px] text-[#7c8d96]">{location.category} · {location.address.state ?? "India"}</p></td><td className="px-4 py-3 font-semibold text-[#405d6d]">{screening.priority}</td><td className="px-4 py-3 font-semibold text-[#405d6d]">{location.population?.toLocaleString("en-IN") ?? "Unavailable"}</td><td className="px-4 py-3 text-[#667b86]">{screening.riskScore === null ? "Unavailable" : `${screening.riskScore}/100`}</td><td className="px-4 py-3 text-[#667b86]">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C · ${next.precipitationProbability ?? "—"}% rain` : "Forecast unavailable"}</td><td className="px-4 py-3 text-[10px] text-[#667b86]">{environment.status}<br />Updated {environment.observedAt ? new Date(environment.observedAt).toLocaleString("en-IN") : "unavailable"}</td></tr></tbody></table></div></section>;
}

export function SelectedLocationForecast({ context }: { context: IndiaLocationContext }) {
  const { location, environment } = context;
  return <section data-testid="selected-location-forecast" className="mt-4 rounded-2xl border border-[#cfe3e7] bg-[#f8fcfc] p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)]"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Details forecast</p><h2 className="mt-1 text-lg font-bold text-[#173d59]">Five-day forecast for {location.name}</h2><p className="mt-1 text-[10px] leading-relaxed text-[#718892]">Current and five-day values are Open-Meteo modelled context, not an official warning or local observation network.</p></div><div className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-[10px] font-semibold text-[#4e707e]"><Users className="h-3.5 w-3.5 text-[#1d7a8e]" />{location.population?.toLocaleString("en-IN") ?? "Population unavailable"}</div></div>{environment.forecast.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{environment.forecast.map(day => <div key={day.date} className="rounded-xl border border-[#dbe9eb] bg-white p-2.5"><p className="text-[10px] font-bold text-[#315b6c]">{new Date(`${day.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p><p className="mt-2 flex items-center gap-1 text-sm font-bold text-[#274c60]"><CloudSun className="h-3.5 w-3.5 text-[#d88934]" />{day.temperatureMinC ?? "—"}–{day.temperatureMaxC ?? "—"}°C</p><p className="mt-1 text-[9px] text-[#6f858f]">Rain {day.precipitationProbability ?? "—"}% · {day.precipitationSumMm ?? "—"} mm</p><p className="mt-1 flex items-center gap-1 text-[9px] text-[#6f858f]"><Wind className="h-3 w-3" />{day.windSpeedMaxKph ?? "—"} km/h · gust {day.windGustMaxKph ?? "—"}</p></div>)}</div> : <div className="mt-3 rounded-xl border border-dashed border-[#d1e1e4] bg-white p-4 text-center text-[11px] text-[#758a94]">Forecast values are temporarily unavailable for this location.</div>}<div className="mt-3 flex items-center gap-2 text-[9px] leading-relaxed text-[#718892]"><MapPin className="h-3.5 w-3.5 shrink-0 text-[#1d758b]" />Population source: {location.populationSource} · Forecast source: {environment.source} · Updated {environment.observedAt ? new Date(environment.observedAt).toLocaleString("en-IN") : "unavailable"}</div></section>;
}

export function SelectedLocationForecastSummary({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  return <section data-testid="selected-location-forecast-summary" className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast high / low</p><p className="mt-1 text-sm font-bold text-[#274b60]">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"}</p></div><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast rain & wind</p><p className="mt-1 text-sm font-bold text-[#274b60]">{next ? `${next.precipitationProbability ?? "—"}% · ${next.windSpeedMaxKph ?? "—"} km/h` : "Unavailable"}</p></div><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast refreshed</p><p className="mt-1 text-xs font-bold text-[#274b60]">{context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Unavailable"}</p></div></section>;
}

export function SelectedLocationForecastSidebar({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  return <aside data-testid="selected-location-forecast-sidebar" className="mt-3 rounded-2xl border border-[#bcdde3] bg-white p-3.5 shadow-[0_12px_30px_rgba(28,55,70,.08)]"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected India forecast sidebar</p><p className="mt-1 text-sm font-bold text-[#294d60]">{context.location.name}</p><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-[#f2f8fa] p-2"><p className="font-bold text-[#345c6c]">Next day</p><p className="mt-1">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"}</p></div><div className="rounded-lg bg-[#f2f8fa] p-2"><p className="font-bold text-[#345c6c]">Rain / wind</p><p className="mt-1">{next ? `${next.precipitationProbability ?? "—"}% · ${next.windSpeedMaxKph ?? "—"} km/h` : "Unavailable"}</p></div></div><p className="mt-2 text-[9px] leading-relaxed text-[#6f858f]">{context.environment.status} · Updated {context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN") : "unavailable"}</p></aside>;
}

export function IndiaContextSidebar({ context, onOpenKeralaAssessment }: { context: IndiaLocationContext; onOpenKeralaAssessment: () => void }) {
  const next = context.environment.forecast[0];
  const realDistrict = lookupRealDistrict(context.location.name, context.location.address.district);
  return (
    <aside data-testid="india-context-sidebar" className="z-10 rounded-2xl border border-[#bcdde3] bg-white shadow-[0_16px_38px_rgba(22,75,91,.12)] xl:col-start-2 xl:row-start-1">
      <div className="border-b border-[#e2edef] bg-[#f8fcfd] p-2.5">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Akashvani Multi-State Quick Switch (13 States)</p>
        <div className="flex flex-wrap gap-1">
          {Object.values(STATE_CONFIGURATIONS).map(cfg => {
            const isCurrent = context.location.name === cfg.name || context.location.address.state === cfg.name;
            return (
              <button
                key={cfg.code}
                type="button"
                onClick={() => {
                  const loc = stateConfigToLocation(cfg);
                  window.location.search = buildIndiaLocationSearch(loc);
                }}
                className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                  isCurrent
                    ? "bg-[#163d58] text-white"
                    : "bg-[#eaf3f5] text-[#2c5f72] hover:bg-[#d8ebee]"
                }`}
                title={`${cfg.name} (${cfg.code}) — ${cfg.terrainProfile}`}
              >
                {cfg.code}
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-b border-[#e2edef] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected India location</p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-[#193d53]">{context.location.name}</h2>
        <p className="mt-0.5 text-xs text-[#71828c]">{context.location.category} · {context.location.address.state ?? "India"}</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#e7edef]">
        <div className="bg-white px-3 py-3">
          <p className="text-[9px] font-bold uppercase text-[#819099]">Population</p>
          <p className="mt-1 text-sm font-bold text-[#274b60]">
            {context.location.population !== null && context.location.population !== undefined
              ? context.location.population.toLocaleString("en-IN")
              : <span className="text-xs font-semibold text-[#819099]">Unavailable</span>}
          </p>
        </div>
        <div className="bg-white px-3 py-3">
          <p className="text-[9px] font-bold uppercase text-[#819099]">Screening risk</p>
          <p className="mt-1 text-sm font-bold text-[#274b60]">
            {context.screening.riskScore === null ? "Unavailable" : `${context.screening.riskScore}/100`}
          </p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-xl border border-[#d9e8ea] bg-[#f4faf9] p-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#2b7585]">{context.environment.status}</p>
          <p className="mt-1 text-[11px] font-semibold text-[#385a67]">
            {context.environment.temperatureC ?? "—"}°C · {context.environment.precipitationMm ?? "—"} mm precipitation · US AQI {context.environment.usAqi ?? "—"}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#385a67]">
            Next day: {next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C · ${next.precipitationProbability ?? "—"}% rain · ${next.windSpeedMaxKph ?? "—"} km/h wind` : "Modelled forecast unavailable"}
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-[#758b94]">{context.environment.source} · Updated {context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN") : "unavailable"}</p>
        </div>

        {/* Terrain & Physiography Context */}
        <div className="rounded-xl border border-[#d9e8ea] bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#2b687a]">
              <Mountain className="h-3.5 w-3.5 text-[#1e788f]" /> Terrain & Physiography
            </p>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
              context.terrain?.status === "AVAILABLE" ? "bg-[#e6f5ec] text-[#267553]" : "bg-[#edf1f3] text-[#71828c]"
            }`}>
              {context.terrain?.status ?? "UNAVAILABLE"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-[#f7fbfb] p-2">
              <p className="text-[9px] font-bold uppercase text-[#819099]">Elevation</p>
              <p className="mt-0.5 font-bold text-[#274b60]">
                {context.terrain?.elevationMeters !== null && context.terrain?.elevationMeters !== undefined
                  ? `${context.terrain.elevationMeters} m`
                  : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
              </p>
            </div>
            <div className="rounded-lg bg-[#f7fbfb] p-2">
              <p className="text-[9px] font-bold uppercase text-[#819099]">Slope Relief</p>
              <p className="mt-0.5 font-bold text-[#274b60]">
                {context.terrain?.slopeDegrees !== null && context.terrain?.slopeDegrees !== undefined
                  ? `${context.terrain.slopeDegrees}°`
                  : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-[#556e79] leading-relaxed">
            {context.terrain?.terrainClass ?? "Regional physiographic baseline"}
          </p>
        </div>

        {/* Hydrology & River Basin Context */}
        <div className="rounded-xl border border-[#d9e8ea] bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#2b687a]">
              <Droplets className="h-3.5 w-3.5 text-[#1e788f]" /> Hydrology & Basin
            </p>
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
              context.hydrology?.status === "REGIONAL_MAPPING" || context.hydrology?.status === "AVAILABLE"
                ? "bg-[#eaf5f7] text-[#1c7084]"
                : "bg-[#edf1f3] text-[#71828c]"
            }`}>
              {context.hydrology?.status ?? "UNAVAILABLE"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-[#f7fbfb] p-2">
              <p className="text-[9px] font-bold uppercase text-[#819099]">River Basin</p>
              <p className="mt-0.5 truncate font-bold text-[#274b60]">
                {context.hydrology?.basin ?? <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
              </p>
            </div>
            <div className="rounded-lg bg-[#f7fbfb] p-2">
              <p className="text-[9px] font-bold uppercase text-[#819099]">Nearest River</p>
              <p className="mt-0.5 truncate font-bold text-[#274b60]">
                {context.hydrology?.nearestRiver
                  ? `${context.hydrology.nearestRiver}${context.hydrology.riverDistanceKm !== null && context.hydrology.riverDistanceKm !== undefined ? ` (${context.hydrology.riverDistanceKm}km)` : ""}`
                  : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
              </p>
            </div>
          </div>
          {context.hydrology?.floodplainIndicator !== null && context.hydrology?.floodplainIndicator !== undefined && (
            <p className="mt-1.5 text-[9px] font-semibold text-[#1c7084]">
              {context.hydrology.floodplainIndicator ? "⚠ Within active riverine floodplain zone" : "Outside immediate floodplain zone"}
            </p>
          )}
        </div>

        {/* Categorized Infrastructure Breakdown */}
        {context.categorizedInfrastructure && context.categorizedInfrastructure.totalCount > 0 && (
          <div className="rounded-xl border border-[#d9e8ea] bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#2b687a]">
              Categorized Facilities ({context.categorizedInfrastructure.totalCount})
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-[9px]">
              <div className="rounded bg-[#f4faf9] p-1.5">
                <span className="font-bold text-[#267553]">{context.categorizedInfrastructure.hospitals.length}</span>
                <span className="block text-[#6f858f]">Hospitals</span>
              </div>
              <div className="rounded bg-[#f4faf9] p-1.5">
                <span className="font-bold text-[#b86728]">{context.categorizedInfrastructure.emergencyFacilities.length}</span>
                <span className="block text-[#6f858f]">Emergency</span>
              </div>
              <div className="rounded bg-[#f4faf9] p-1.5">
                <span className="font-bold text-[#1d788d]">{context.categorizedInfrastructure.shelters.length}</span>
                <span className="block text-[#6f858f]">Shelters</span>
              </div>
            </div>
          </div>
        )}

        {/* Focus Districts (if state is selected) */}
        {context.stateConfig && context.stateConfig.focusDistricts.length > 0 && (
          <div className="rounded-xl border border-[#d9e8ea] bg-white p-3">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#2b687a]">
              {context.stateConfig.name} Focus Districts ({context.stateConfig.focusDistricts.length})
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {context.stateConfig.focusDistricts.map(d => (
                <span key={d} className="rounded bg-[#f0f6f8] px-1.5 py-0.5 text-[9px] font-medium text-[#2d5668]">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Hazard Red-Zone Intelligence Panel (PS 191 Core) */}
        {context.hazardProfile && (
          <div data-testid="hazard-redzone-panel" className="rounded-xl border border-[#d9e8ea] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-[#b91c1c]" />
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1c4d62]">
                  Hazard Red-Zone Engine
                </span>
              </div>
              <span className={`rounded-md border px-2 py-0.5 text-[9px] font-extrabold ${
                context.hazardProfile.redZone.status === "RED"
                  ? "bg-[#fee2e2] text-[#b91c1c] border-[#f87171]"
                  : context.hazardProfile.redZone.status === "ORANGE"
                    ? "bg-[#ffedd5] text-[#c2410c] border-[#fb923c]"
                    : context.hazardProfile.redZone.status === "YELLOW"
                      ? "bg-[#fef9c3] text-[#a16207] border-[#fde047]"
                      : "bg-[#dcfce7] text-[#15803d] border-[#86efac]"
              }`}>
                {context.hazardProfile.redZone.status} ZONE ({context.hazardProfile.redZone.score}/100)
              </span>
            </div>

            <p className="mt-2 text-[10px] leading-relaxed text-[#476371]">
              <strong className="text-[#1c3c4b]">Primary Driver:</strong> {context.hazardProfile.redZone.primaryHazard}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#5a7380]">
              {context.hazardProfile.redZone.explainability}
            </p>

            {/* Evidence Triggers */}
            {context.hazardProfile.redZone.triggers.length > 0 && (
              <div className="mt-2 space-y-1 rounded-lg bg-[#f8fafb] p-2">
                <p className="text-[8.5px] font-bold uppercase tracking-[.08em] text-[#627d8b]">
                  Verified Triggers ({context.hazardProfile.redZone.triggers.length})
                </p>
                {context.hazardProfile.redZone.triggers.slice(0, 3).map((trig, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[9px] leading-snug text-[#375463]">
                    <span className="mt-0.5 text-[#e53935]">•</span>
                    <span>{trig}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Authoritative Domain Summary */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[9px]">
              <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                <span className="font-bold text-[#1e788f]">Seismic Zone</span>
                <span className="block font-medium text-[#375463]">
                  {context.hazardProfile.seismic.zone} (Z={context.hazardProfile.seismic.zoneFactor})
                </span>
                <span className="text-[7.5px] text-[#78909c]">BIS IS 1893:2016</span>
              </div>
              <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                <span className="font-bold text-[#1e788f]">Landslide Rank</span>
                <span className="block font-medium text-[#375463]">
                  {context.hazardProfile.landslide.districtRank ? `#${context.hazardProfile.landslide.districtRank}/147 in India` : "Low/Moderate"}
                </span>
                <span className="text-[7.5px] text-[#78909c]">ISRO Atlas 2023</span>
              </div>
              <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                <span className="font-bold text-[#1e788f]">CWC River Gauge</span>
                <span className="block truncate font-medium text-[#375463]">
                  {context.hazardProfile.flood.nearestCwcGauge?.stationName ?? "None within 50km"}
                </span>
                <span className="text-[7.5px] text-[#78909c]">CWC Flood Network</span>
              </div>
              <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                <span className="font-bold text-[#1e788f]">Cyclone / Coast</span>
                <span className="block font-medium text-[#375463]">
                  {context.hazardProfile.cyclone.coastalVulnerabilityClass}
                </span>
                <span className="text-[7.5px] text-[#78909c]">IBTrACS / IMD</span>
              </div>
            </div>

            {/* Nearby Exposed Habitations (PS 191 Core) */}
            {context.hazardProfile.exposedHabitations.length > 0 && (
              <div className="mt-2.5 border-t border-[#edf3f5] pt-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[.08em] text-[#1c4d62]">
                    <Users className="h-3 w-3 text-[#fb8c00]" /> Exposed Habitations ({context.hazardProfile.exposedHabitations.length})
                  </span>
                  <span className="text-[8.5px] font-semibold text-[#78909c]">Census 2011</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {context.hazardProfile.exposedHabitations.slice(0, 3).map(hab => (
                    <div key={hab.habitationId} className="flex items-center justify-between rounded bg-[#f7fafb] px-2 py-1 text-[9px]">
                      <div>
                        <span className="font-bold text-[#2a4e60]">{hab.name}</span>
                        <span className="block text-[8px] text-[#718894]">{hab.hazardType} · {Math.round(hab.distanceToHazardKm)}km away</span>
                      </div>
                      <span className="font-semibold text-[#375463]">
                        {hab.population !== null ? `${hab.population.toLocaleString("en-IN")} pop` : <span className="text-[#889ca6]">Unavailable</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PS191 Decision Panel (Phase 3.3 Carrying Capacity + Relocation Intelligence) */}
        {realDistrict && (
          <div className="mt-2.5">
            <PS191DecisionPanel
              districtId={realDistrict.id}
              districtName={realDistrict.name}
              classification={
                context.hazardProfile?.redZone.status === "RED"
                  ? "RED"
                  : context.hazardProfile?.redZone.status === "ORANGE" || context.hazardProfile?.redZone.status === "YELLOW"
                  ? "ORANGE"
                  : context.hazardProfile?.redZone.status === "LOW"
                  ? "GREEN"
                  : "UNAVAILABLE"
              }
              stateCode={realDistrict.stateCode}
            />
          </div>
        )}

        {/* Data Provenance & Authoritative Dimensions */}
        <div className="rounded-xl bg-[#f7fbfb] p-3 text-[9px] leading-relaxed text-[#718892]">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="font-bold uppercase tracking-[.1em] text-[#2b687a]">Data Provenance</span>
            <span className="rounded bg-[#d7eef0] px-1.5 py-0.5 text-[8px] font-bold text-[#1b7184]">
              {context.provenance?.sourceType ?? "OFFICIAL"}
            </span>
          </div>
          <p className="text-[#516b77]">{context.provenance?.provenanceLabel ?? "Authoritative administrative context"}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">CEEW 2021 CVI</span>
            <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">DST Common Framework</span>
            <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">XDI 2050 Risk</span>
            <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">geoBoundaries ADM1</span>
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-[#f7fbfb] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#2b687a]">Hazard & analysis context</p>
          <p className="text-[11px] leading-relaxed text-[#5f7783]">{context.screening.hazardContext}</p>
          <p className="text-[10px] leading-relaxed text-[#718892]">{context.screening.populationContext}</p>
        </div>

        <button type="button" onClick={onOpenKeralaAssessment} disabled aria-disabled="true" className="h-8 w-full cursor-not-allowed rounded-lg border border-[#d9e4e6] bg-[#f4f7f8] text-[11px] font-semibold text-[#8a9aa1]">
          Retained Kerala assessment actions disabled for this location
        </button>
      </div>
    </aside>
  );
}

export function IndiaLocationSummaryStrip({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  const riskScore = context.screening.riskScore === null ? "Unavailable" : `${context.screening.riskScore}/100`;
  const locationPath = [context.location.address.locality, context.location.address.city, context.location.address.district, context.location.address.state].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ") || "India";
  const contextLive = context.environment.status === "LIVE MODELLED ENVIRONMENTAL CONTEXT";
  return (
    <section data-testid="india-location-summary-strip" aria-labelledby="location-decision-context-title" className="overflow-hidden rounded-2xl border border-[#b9d8df] bg-white shadow-[0_16px_36px_rgba(22,75,91,0.08)]">
      <div className="grid gap-4 bg-[#102b45] p-4 text-white sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9edbe5]">Location decision context</p>
            <span className="rounded-full border border-[#6aa3ae]/50 bg-[#1b4659] px-2 py-0.5 text-[9px] font-semibold text-[#d7eef0]">Selected search result</span>
            {context.redZone && (
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                context.redZone.status === "RED"
                  ? "bg-[#fee2e2] text-[#b91c1c]"
                  : context.redZone.status === "ORANGE"
                    ? "bg-[#ffedd5] text-[#c2410c]"
                    : context.redZone.status === "YELLOW"
                      ? "bg-[#fef9c3] text-[#a16207]"
                      : "bg-[#dcfce7] text-[#15803d]"
              }`}>
                {context.redZone.status} ZONE ({context.redZone.primaryHazard})
              </span>
            )}
          </div>
          <h2 id="location-decision-context-title" className="mt-1.5 text-xl font-bold tracking-tight">{context.location.name}</h2>
          <p className="mt-1 text-[11px] text-[#c3d7dc]">{context.location.category} · {locationPath}</p>
          <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-[#d2e1e4]">{context.screening.hazardContext}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#b9dce1]">Screening risk</p>
          <p className={`mt-1 text-2xl font-bold ${context.screening.riskLevel === "High" ? "text-[#ff8d88]" : context.screening.riskLevel === "Moderate" ? "text-[#ffd87a]" : context.screening.riskLevel === "Low" ? "text-[#7ce39a]" : "text-[#c5d5d9]"}`}>{riskScore}</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] ${badgeClass(context.screening.priority)}`}>{context.screening.priority} priority</span>
        </div>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <ContextStat label="Population" value={context.location.population !== null && context.location.population !== undefined ? context.location.population.toLocaleString("en-IN") : "Unavailable"} detail={context.location.populationSource} icon={Users} />
        <ContextStat label="Current weather" value={context.environment.temperatureC === null ? "Unavailable" : `${context.environment.temperatureC}°C`} detail={context.environment.precipitationMm === null ? "Precipitation unavailable" : `${context.environment.precipitationMm} mm precipitation`} icon={CloudSun} />
        <ContextStat label="Air quality" value={context.environment.usAqi === null ? "Unavailable" : `AQI ${context.environment.usAqi}`} detail={context.environment.pm25 === null ? "PM2.5 unavailable" : `PM2.5 ${context.environment.pm25}`} icon={Wind} />
        <ContextStat label="Next forecast" value={next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"} detail={next ? `${next.precipitationProbability ?? "—"}% rain · ${next.windSpeedMaxKph ?? "—"} km/h wind` : "Modelled forecast unavailable"} icon={CloudSun} />
        <ContextStat label="Terrain / Elevation" value={context.terrain?.elevationMeters !== null && context.terrain?.elevationMeters !== undefined ? `${context.terrain.elevationMeters} m` : "Unavailable"} detail={context.terrain?.terrainClass ?? "Physiographic classification"} icon={Mountain} />
        <ContextStat label="Hydrology / Basin" value={context.hydrology?.basin ?? "Unavailable"} detail={context.hydrology?.nearestRiver ? `${context.hydrology.nearestRiver}${context.hydrology.riverDistanceKm !== null ? ` (${context.hydrology.riverDistanceKm} km)` : ""}` : "River mapping unavailable"} icon={Droplets} />
      </div>
      <div className="grid gap-3 border-t border-[#e3edef] bg-[#f7fbfb] p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] sm:p-4">
        <div className="rounded-xl border border-[#dbe8ea] bg-white p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#cc8f22]" />
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#2b687a]">Decision readout</p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#536f7b]">{context.screening.populationContext}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-[#768a93]">The screening value is a transparent decision-support signal; it is not an official hazard warning.</p>
        </div>
        <div className="rounded-xl border border-[#dbe8ea] bg-white p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${contextLive ? "text-[#2e9a67]" : "text-[#a47a2d]"}`} />
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#2b687a]">Data status & Provenance</p>
          </div>
          <div className="mt-2 grid gap-1.5 text-[10px] text-[#607b86]">
            <span>Provenance: {context.provenance?.provenanceLabel ?? context.location.source}</span>
            <span>Terrain: {context.terrain?.status === "AVAILABLE" ? "Digital Elevation Model loaded" : "Regional physiographic mapping"}</span>
            <span>Hydrology: {context.hydrology?.status === "REGIONAL_MAPPING" ? `${context.hydrology.basin} indexed` : "Unavailable"}</span>
            <span>Facilities: {context.infrastructure.status === "LIVE OSM FACILITY SAMPLE" ? `${context.infrastructure.items.length} mapped nearby facilities` : "Unavailable"}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SelectedLocationReportAction({ context, isPending, onDownload }: { context: IndiaLocationContext; isPending?: boolean; onDownload: () => void }) {
  return <section data-testid="selected-location-report-action" className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#bfdce2] bg-[#eff8f8] p-3.5 shadow-[0_10px_24px_rgba(28,55,70,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#d7eef0] text-[#1b7184]"><FileText className="h-4 w-4" /></span><div><p className="text-xs font-bold text-[#244f63]">Complete selected-area analysis</p><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#66808a]">Download the {context.location.category.toLowerCase()} PDF with the grounded AI/ML narrative, selected metrics, forecast, mapped extent, colour legend, sources, and analyst-review notes.</p></div></div><button type="button" onClick={onDownload} disabled={isPending} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d59] px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(23,61,89,.16)] transition hover:bg-[#0d304a] disabled:cursor-wait disabled:opacity-70"><FileText className="h-4 w-4" />{isPending ? "Building selected-area PDF…" : "Download selected-area PDF"}</button></section>;
}

export function SelectedLocationForecastDetails({ context }: { context: IndiaLocationContext }) {
  return <div><SelectedLocationPriorityQueue context={context} /><SelectedLocationPriorityDecisionTable context={context} /><SelectedLocationForecastSidebar context={context} /><SelectedLocationInfrastructure context={context} /></div>;
}
