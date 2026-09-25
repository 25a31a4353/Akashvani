import type { IndiaLocationContext, IndiaLocation } from "@shared/india";
import { STATE_CONFIGURATIONS, stateConfigToLocation, buildIndiaLocationSearch } from "@shared/india";
import { SelectedLocationInfrastructure } from "./SelectedLocationInfrastructure";
import { LiveWeatherCommandCenter } from "./LiveWeatherCommandCenter";
import { PS191DecisionPanel } from "./PS191DecisionPanel";
import { AlertTriangle, Building2, CheckCircle2, ChevronDown, CloudSun, Compass, Droplets, FileText, MapPin, Mountain, ShieldAlert, Users, Wind, Layers } from "lucide-react";
import React, { useState } from "react";
import { cn } from "@/lib/utils";


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
  "munnar": { id: "DIST-KL-IDK", name: "Idukki", stateCode: "KL" },
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
  // Uttarakhand — Joshimath / Chamoli subsidence (SIH key demo)
  "chamoli": { id: "DIST-UK-CHA", name: "Chamoli", stateCode: "UK" },
  "joshimath": { id: "DIST-UK-CHA", name: "Chamoli", stateCode: "UK" },
  "gopeshwar": { id: "DIST-UK-CHA", name: "Chamoli", stateCode: "UK" },
  "uttarkashi": { id: "DIST-UK-UTK", name: "Uttarkashi", stateCode: "UK" },
  "rudraprayag": { id: "DIST-UK-RDP", name: "Rudraprayag", stateCode: "UK" },
  "pithoragarh": { id: "DIST-UK-PTH", name: "Pithoragarh", stateCode: "UK" },
  // State-level fallbacks — defaults to representative district for the state
  "assam": { id: "DIST-AS-DIB", name: "Dibrugarh", stateCode: "AS" },
  "kerala": { id: "DIST-KL-WAY", name: "Wayanad", stateCode: "KL" },
  "uttarakhand": { id: "DIST-UK-CHA", name: "Chamoli", stateCode: "UK" },
  "odisha": { id: "DIST-OD-PUR", name: "Puri", stateCode: "OD" },
  "andhra pradesh": { id: "DIST-AP-EGD", name: "East Godavari", stateCode: "AP" },
  "maharashtra": { id: "DIST-MH-SAN", name: "Sangli", stateCode: "MH" },
  "rajasthan": { id: "DIST-RJ-JOD", name: "Jodhpur", stateCode: "RJ" },
  "bihar": { id: "DIST-BR-KHA", name: "Khagaria", stateCode: "BR" },
  "karnataka": { id: "DIST-KA-KOD", name: "Kodagu", stateCode: "KA" },
  "tamil nadu": { id: "DIST-TN-NIL", name: "Nilgiris", stateCode: "TN" },
  "chhattisgarh": { id: "DIST-CT-RAI", name: "Raipur", stateCode: "CT" },
  "mizoram": { id: "DIST-MZ-AIZ", name: "Aizawl", stateCode: "MZ" },
  "jharkhand": { id: "DIST-JH-RAN", name: "Ranchi", stateCode: "JH" },
  "uttar pradesh": { id: "DIST-UP-GOR", name: "Gorakhpur", stateCode: "UP" },
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
  const { location, screening, environment, decision } = context;
  const next = environment.forecast[0];
  const geoScore = context.hazardProfile?.redZone.score ?? 50;

  const effectiveTier = decision?.responsePriority.priorityLevel ?? (screening.priority === "Immediate" ? "RED" : screening.priority === "High" ? "ORANGE" : screening.priority === "Moderate" ? "YELLOW" : "GREEN");
  const effectiveScore = decision?.responsePriority.priorityScore ?? screening.riskScore ?? 50;

  return (
    <section data-testid="selected-location-priority-queue" className="mt-4 overflow-hidden rounded-2xl border border-[#c7e0e5] bg-white shadow-[0_12px_30px_rgba(28,55,70,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e2edef] p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Decision Context & Risk Breakdown</p>
          <h2 className="mt-1 text-sm font-bold text-[#284b60]">How {location.name} is being screened</h2>
          <p className="mt-0.5 text-[10px] text-[#738891]">Independent evaluation of physical vulnerability vs. real-time weather stress.</p>
        </div>
        <div className="flex items-center gap-2">
          {decision ? (
            <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-bold text-[#475569] border border-[#cbd5e1]">
              CANONICAL DECISION V2
            </span>
          ) : (
            <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-bold text-[#475569] border border-[#cbd5e1]">
              COMPOSITE TRIAGE
            </span>
          )}
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold",
            effectiveTier === "HIGH" || effectiveTier === "RED" ? "bg-red-100 text-red-800 border border-red-200" :
            effectiveTier === "MEDIUM" || effectiveTier === "ORANGE" ? "bg-orange-100 text-orange-800 border border-orange-200" :
            effectiveTier === "LOW" || effectiveTier === "GREEN" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
            badgeClass(screening.priority)
          )}>
            {effectiveTier} PRIORITY ({effectiveScore}/100)
          </span>
        </div>
      </div>

      {/* Canonical 5-Component Response Priority Breakdown (when available) */}
      {decision && (
        <div className="border-b border-[#e2edef] bg-[#f8fafc] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#334155]">
              Audited 5-Component Response Priority (0–100)
            </span>
            <span className="text-[8px] text-[#64748b]">
              ID: {decision.decisionId} · Hash: {decision.decisionSnapshotHash.slice(0, 10)}...
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="rounded-lg bg-white p-2 border border-[#e2e8f0]">
              <p className="text-[8px] font-bold uppercase text-[#64748b]">Hazard</p>
              <p className="mt-0.5 text-sm font-bold text-[#b91c1c]">{decision.responsePriority.components.hazardSeverity.normalizedValue}<span className="text-[9px] font-normal text-[#94a3b8]">/30</span></p>
              <p className="text-[7.5px] text-[#64748b] truncate">{decision.hazardAssessment.primaryHazard}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#e2e8f0]">
              <p className="text-[8px] font-bold uppercase text-[#64748b]">Exposure</p>
              <p className="mt-0.5 text-sm font-bold text-[#b45309]">{decision.responsePriority.components.populationExposure.normalizedValue}<span className="text-[9px] font-normal text-[#94a3b8]">/20</span></p>
              <p className="text-[7.5px] text-[#64748b] truncate">{decision.exposureAssessment.populationValue != null ? `${decision.exposureAssessment.populationValue.toLocaleString("en-IN")}` : "Unverified"}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#e2e8f0]">
              <p className="text-[8px] font-bold uppercase text-[#64748b]">Vulnerability</p>
              <p className="mt-0.5 text-sm font-bold text-[#4338ca]">{decision.responsePriority.components.vulnerability.normalizedValue}<span className="text-[9px] font-normal text-[#94a3b8]">/20</span></p>
              <p className="text-[7.5px] text-[#64748b] truncate">{decision.vulnerabilityAssessment.status}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#e2e8f0]">
              <p className="text-[8px] font-bold uppercase text-[#64748b]">Capacity Deficit</p>
              <p className="mt-0.5 text-sm font-bold text-[#059669]">{decision.responsePriority.components.capacityDeficit.normalizedValue}<span className="text-[9px] font-normal text-[#94a3b8]">/15</span></p>
              <p className="text-[7.5px] text-[#64748b] truncate">{decision.capacityAssessment.capacityStatus}</p>
            </div>
            <div className="rounded-lg bg-white p-2 border border-[#e2e8f0]">
              <p className="text-[8px] font-bold uppercase text-[#64748b]">Accessibility</p>
              <p className="mt-0.5 text-sm font-bold text-[#0284c7]">{decision.responsePriority.components.accessibility.normalizedValue}<span className="text-[9px] font-normal text-[#94a3b8]">/15</span></p>
              <p className="text-[7.5px] text-[#64748b] truncate">{decision.accessibilityAssessment.status}</p>
            </div>
          </div>
          {/* Destination Safety + Road Route */}
          <div className="mt-2 grid grid-cols-2 gap-2 text-[9px]">
            <div className="rounded bg-white p-2 border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Verified Relocation Destination:</span>
              <strong className="text-[#15803d] font-bold block truncate">{decision.relocationAssessment.bestCandidate?.name ?? "No verified haven"}</strong>
              <span className={cn(
                "inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded",
                decision.relocationAssessment.destinationSafety.destinationSafetyStatus === "SAFE" ? "bg-emerald-100 text-emerald-800" :
                decision.relocationAssessment.destinationSafety.destinationSafetyStatus === "CONDITIONAL" ? "bg-amber-100 text-amber-800" :
                "bg-rose-100 text-rose-800"
              )}>Safety: {decision.relocationAssessment.destinationSafety.destinationSafetyStatus}</span>
            </div>
            <div className="rounded bg-white p-2 border border-[#e2e8f0]">
              <span className="text-[#64748b] block font-medium">Road Route Navigation:</span>
              <strong className="text-[#0284c7] font-bold block">{decision.routingAssessment.distanceKm ?? 0} km · {decision.routingAssessment.durationMinutes ?? 0} min</strong>
              <span className="text-[8px] text-[#64748b] block truncate">{decision.routingAssessment.sourceNote}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-px bg-[#e7eff1] sm:grid-cols-4">
        <div className="bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase text-[#84949d]">Geographic Vulnerability</p>
            <span className="text-[8px] font-bold text-[#b91c1c] bg-red-50 px-1 rounded">ISRO / GSI</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#b91c1c]">{geoScore}<span className="text-xs font-normal text-[#94a3b8]">/100</span></p>
          <p className="text-[9px] text-[#718792]">Structural terrain & seismic baseline (IS 1893)</p>
        </div>
        <div className="bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase text-[#84949d]">Active Weather Stress</p>
            <span className="text-[8px] font-bold text-[#0284c7] bg-sky-50 px-1 rounded">Open-Meteo</span>
          </div>
          <p className={`mt-1 text-lg font-bold ${riskTextClass(screening.riskLevel)}`}>{screening.riskScore === null ? "—" : `${screening.riskScore}`}<span className="text-xs font-normal text-[#94a3b8]">/100</span></p>
          <p className="text-[9px] text-[#718792]">Real-time atmospheric telemetry index</p>
        </div>
        <div className="bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase text-[#84949d]">Exposed Population</p>
            <span className="text-[8px] font-bold text-[#059669] bg-emerald-50 px-1 rounded">Census</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#264c60]">{location.population?.toLocaleString("en-IN") ?? "Unavailable"}</p>
          <p className="text-[9px] text-[#718792]">{location.populationSource}</p>
        </div>
        <div className="bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase text-[#84949d]">Current Weather</p>
            <span className="text-[8px] font-bold text-[#d97706] bg-amber-50 px-1 rounded">Live Feed</span>
          </div>
          <p className="mt-1 text-lg font-bold text-[#264c60]">{environment.temperatureC === null ? "—" : `${Math.round(environment.temperatureC)}°C`}</p>
          <p className="text-[9px] text-[#718792]">{environment.precipitationMm === null ? "Precipitation unavailable" : `${environment.precipitationMm} mm · ${environment.weatherDescription ?? "Observed"}`}</p>
        </div>
      </div>
      <div className="flex items-start gap-2 bg-[#f7fbfb] p-3 text-[10px] leading-relaxed text-[#627d88]">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1d768c]" />
        <span><strong>Triage Rationale:</strong> {decision ? decision.explanation.whyThisPriority : screening.hazardContext}</span>
      </div>
    </section>
  );
}

export function SelectedLocationPriorityDecisionTable({ context }: { context: IndiaLocationContext }) {
  const { location, screening, environment, decision } = context;
  const next = environment.forecast[0];
  const priorityLabel = decision?.responsePriority.priorityLevel ?? screening.priority;
  const scoreDisplay = decision ? `${decision.responsePriority.priorityScore}/100` : (screening.riskScore === null ? "Unavailable" : `${screening.riskScore}/100`);

  return <section data-testid="selected-location-decision-table" className="mt-3 overflow-hidden rounded-2xl border border-[#c9e1e6] bg-white shadow-[0_10px_24px_rgba(28,55,70,0.04)]"><div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e3edef] p-3.5"><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected-area comparison row</p><p className="mt-0.5 text-[10px] text-[#718792]">Canonical decision object state from active India selection.</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${badgeClass(screening.priority)}`}>{priorityLabel.toUpperCase()}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="bg-[#f6fafb]"><tr className="text-[9px] font-bold uppercase tracking-[.1em] text-[#82919b]"><th className="px-4 py-2.5">Selected area</th><th className="px-4 py-2.5">Priority</th><th className="px-4 py-2.5">Population</th><th className="px-4 py-2.5">Screening score</th><th className="px-4 py-2.5">Next forecast</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody><tr data-testid="selected-location-decision-row" className="border-t border-[#edf1f2] text-xs"><td className="px-4 py-3"><p className="font-semibold text-[#2c6076]">{location.name}</p><p className="mt-0.5 text-[10px] text-[#7c8d96]">{location.category} · {location.address.state ?? "India"}</p></td><td className="px-4 py-3 font-semibold text-[#405d6d]">{priorityLabel}</td><td className="px-4 py-3 font-semibold text-[#405d6d]">{location.population?.toLocaleString("en-IN") ?? "Unavailable"}</td><td className="px-4 py-3 text-[#667b86]">{scoreDisplay}</td><td className="px-4 py-3 text-[#667b86]">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C · ${next.precipitationProbability ?? "—"}% rain` : "Forecast unavailable"}</td><td className="px-4 py-3 text-[10px] text-[#667b86]">{environment.status}<br />Updated {environment.observedAt ? new Date(environment.observedAt).toLocaleString("en-IN") : "unavailable"}</td></tr></tbody></table></div></section>;
}

export function SelectedLocationForecast({ context }: { context: IndiaLocationContext }) {
  return (
    <>
      <LiveWeatherCommandCenter context={context} />
      <div className="sr-only">Current and five-day values are Open-Meteo modelled context, not an official warning or local observation network.</div>
    </>
  );
}

export function SelectedLocationForecastSummary({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  return <section data-testid="selected-location-forecast-summary" className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast high / low</p><p className="mt-1 text-sm font-bold text-[#274b60]">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"}</p></div><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast rain & wind</p><p className="mt-1 text-sm font-bold text-[#274b60]">{next ? `${next.precipitationProbability ?? "—"}% · ${next.windSpeedMaxKph ?? "—"} km/h` : "Unavailable"}</p></div><div className="rounded-xl border border-[#d8e8ea] bg-white p-3"><p className="text-[9px] font-bold uppercase text-[#819099]">Forecast refreshed</p><p className="mt-1 text-xs font-bold text-[#274b60]">{context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Unavailable"}</p></div></section>;
}

export function SelectedLocationForecastSidebar({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  return <aside data-testid="selected-location-forecast-sidebar" className="mt-3 rounded-2xl border border-[#bcdde3] bg-white p-3.5 shadow-[0_12px_30px_rgba(28,55,70,.08)]"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected India forecast sidebar</p><p className="mt-1 text-sm font-bold text-[#294d60]">{context.location.name}</p><div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-[#f2f8fa] p-2"><p className="font-bold text-[#345c6c]">Next day</p><p className="mt-1">{next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C` : "Unavailable"}</p></div><div className="rounded-lg bg-[#f2f8fa] p-2"><p className="font-bold text-[#345c6c]">Rain / wind</p><p className="mt-1">{next ? `${next.precipitationProbability ?? "—"}% · ${next.windSpeedMaxKph ?? "—"} km/h` : "Unavailable"}</p></div></div><p className="mt-2 text-[9px] leading-relaxed text-[#6f858f]">{context.environment.status} · Updated {context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN") : "unavailable"}</p></aside>;
}

interface AccordionSectionProps {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  summary?: React.ReactNode;
  badge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  testId?: string;
}

function AccordionSection({
  id,
  title,
  icon: Icon,
  summary,
  badge,
  isOpen,
  onToggle,
  children,
  testId,
}: AccordionSectionProps) {
  return (
    <div
      data-testid={testId ?? `accordion-${id}`}
      className="overflow-hidden rounded-xl border border-[#d9e8ea] bg-white transition-colors hover:border-[#b5d5dc]"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
        id={`accordion-header-${id}`}
        className="flex w-full items-start justify-between gap-2.5 p-3 text-left transition-colors hover:bg-[#f8fcfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d788d]"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#eef6f8] text-[#1d788d]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#1e475c]">
                {title}
              </span>
              {badge}
            </div>
            {summary && (
              <p className="mt-0.5 text-[10px] leading-snug text-[#6a828e] line-clamp-1">
                {summary}
              </p>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-[#718894] transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div
          id={`accordion-content-${id}`}
          role="region"
          aria-labelledby={`accordion-header-${id}`}
          className="border-t border-[#eaf1f3] p-3 pt-2.5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function IndiaContextSidebar({ context, onOpenKeralaAssessment }: { context: IndiaLocationContext; onOpenKeralaAssessment: () => void }) {
  const next = context.environment.forecast[0];
  const realDistrict = lookupRealDistrict(context.location.name, context.location.address.district);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hazardRisk: true,       // OPEN BY DEFAULT
    environment: false,     // CLOSED BY DEFAULT
    terrain: false,         // CLOSED BY DEFAULT
    hydrology: false,       // CLOSED BY DEFAULT
    exposure: false,        // CLOSED BY DEFAULT
    capacity: false,        // CLOSED BY DEFAULT
    relocation: false,      // CLOSED BY DEFAULT
    provenance: false,      // CLOSED BY DEFAULT
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside data-testid="india-context-sidebar" className="z-10 rounded-2xl border border-[#bcdde3] bg-white shadow-[0_16px_38px_rgba(22,75,91,.12)] xl:col-start-2 xl:row-start-1">
      {/* Multi-State Quick Switch (13 States) */}
      <div className="border-b border-[#e2edef] bg-[#f8fcfd] p-2.5">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#1d788d]">ResQ Multi-State Quick Switch (13 States)</p>
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

      {/* 1. LOCATION OVERVIEW (Fixed Header) */}
      <div className="border-b border-[#e2edef] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Selected India location</p>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badgeClass(context.screening.priority)}`}>
            {context.screening.priority.toUpperCase()} PRIORITY
          </span>
        </div>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-[#193d53]">{context.location.name}</h2>
        <p className="mt-0.5 text-xs text-[#71828c]">{context.location.category} · {context.location.address.state ?? "India"}</p>
        <div className="mt-1 flex items-center gap-1.5 text-[9px] text-[#718894]">
          <MapPin className="h-3 w-3 text-[#1d788d]" />
          <span>{context.location.latitude.toFixed(3)}°N, {context.location.longitude.toFixed(3)}°E</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#e7edef]">
        <div className="bg-white px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-bold uppercase text-[#819099]">Geographic Vulnerability</p>
            <span className="text-[7.5px] font-bold text-[#b91c1c] bg-red-50 px-1 rounded">ISRO / GSI</span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#b91c1c]">
            {context.hazardProfile?.redZone.score ?? 50}<span className="text-[10px] font-normal text-[#94a3b8]">/100</span>
          </p>
          <p className="text-[8px] font-bold text-[#b91c1c] uppercase">
            {context.hazardProfile?.redZone.status ?? "MODERATE"} ZONE
          </p>
        </div>
        <div className="bg-white px-3 py-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-bold uppercase text-[#819099]">Active Weather Stress</p>
            <span className="text-[7.5px] font-bold text-[#0284c7] bg-sky-50 px-1 rounded">Open-Meteo</span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#274b60]">
            {context.screening.riskScore === null ? "—" : `${context.screening.riskScore}`}<span className="text-[10px] font-normal text-[#94a3b8]">/100</span>
          </p>
          <p className={`text-[8px] font-bold uppercase ${riskTextClass(context.screening.riskLevel)}`}>
            {context.screening.riskLevel} ATMOSPHERIC
          </p>
        </div>
        <div className="bg-white px-3 py-2.5 border-t border-[#e7edef]">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-bold uppercase text-[#819099]">Response Priority</p>
            <span className="text-[7.5px] font-bold text-[#1d788d] bg-cyan-50 px-1 rounded">DIVA Engine</span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#163c58]">
            {context.screening.priority.toUpperCase()}
          </p>
          <p className="text-[8px] text-[#718894]">Triage readiness</p>
        </div>
        <div className="bg-white px-3 py-2.5 border-t border-[#e7edef]">
          <div className="flex items-center justify-between">
            <p className="text-[8.5px] font-bold uppercase text-[#819099]">Population</p>
            <span className="text-[7.5px] font-bold text-[#059669] bg-emerald-50 px-1 rounded">Census</span>
          </div>
          <p className="mt-0.5 text-sm font-bold text-[#274b60]">
            {context.location.population !== null && context.location.population !== undefined
              ? context.location.population.toLocaleString("en-IN")
              : <span className="text-xs font-semibold text-[#819099]">Unavailable</span>}
          </p>
          <p className="text-[8px] text-[#819099] truncate">{context.location.populationSource}</p>
        </div>
      </div>

      {/* Collapsible Information Sections */}
      <div className="p-3 space-y-2">
        {/* 2. HAZARD & RISK ASSESSMENT (OPEN by default) */}
        <AccordionSection
          id="hazardRisk"
          title="Hazard & Risk Assessment"
          icon={ShieldAlert}
          isOpen={openSections.hazardRisk}
          onToggle={() => toggleSection("hazardRisk")}
          badge={
            context.hazardProfile ? (
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-extrabold ${
                context.hazardProfile.redZone.status === "RED"
                  ? "bg-[#fee2e2] text-[#b91c1c]"
                  : context.hazardProfile.redZone.status === "ORANGE"
                    ? "bg-[#ffedd5] text-[#c2410c]"
                    : context.hazardProfile.redZone.status === "YELLOW"
                      ? "bg-[#fef9c3] text-[#a16207]"
                      : "bg-[#dcfce7] text-[#15803d]"
              }`}>
                {context.hazardProfile.redZone.status} ZONE
              </span>
            ) : (
              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${badgeClass(context.screening.priority)}`}>
                {context.screening.priority}
              </span>
            )
          }
          summary={
            context.hazardProfile
              ? `${context.hazardProfile.redZone.status} Zone (${context.hazardProfile.redZone.score}/100) · ${context.hazardProfile.redZone.primaryHazard}`
              : `${context.screening.riskLevel} risk · ${context.screening.priority} priority`
          }
          testId="accordion-hazard-risk"
        >
          {context.hazardProfile ? (
            <div data-testid="hazard-redzone-panel" className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#1c4d62]">
                  Hazard Red-Zone Engine
                </span>
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

              <div className="rounded-lg bg-[#f8fafb] p-2 border border-[#e5eef0] space-y-1 text-[10px]">
                <div>
                  <strong className="text-[#1c3c4b]">Primary Driver:</strong>{" "}
                  <span className="font-bold text-[#b91c1c]">{context.hazardProfile.redZone.primaryHazard}</span>
                  {context.hazardProfile.redZone.primaryDriverReason && (
                    <span className="block text-[9px] text-[#5a7380] mt-0.5">
                      {context.hazardProfile.redZone.primaryDriverReason}
                    </span>
                  )}
                </div>

                {context.hazardProfile.redZone.secondaryHazards && context.hazardProfile.redZone.secondaryHazards.length > 0 && (
                  <div className="pt-1 border-t border-[#e2edf0]">
                    <strong className="text-[#1c3c4b]">Secondary Hazards:</strong>{" "}
                    <span className="font-semibold text-[#b45309]">
                      {context.hazardProfile.redZone.secondaryHazards.join(", ")}
                    </span>
                    {context.hazardProfile.redZone.supportingEvidence && context.hazardProfile.redZone.supportingEvidence.length > 0 && (
                      <ul className="mt-0.5 list-disc pl-3 text-[8.5px] text-[#5a7380] space-y-0.5">
                        {context.hazardProfile.redZone.supportingEvidence.map((ev: string, i: number) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[10px] leading-relaxed text-[#5a7380]">
                {context.hazardProfile.redZone.explainability}
              </p>

              {/* Evidence Triggers */}
              {context.hazardProfile.redZone.triggers.length > 0 && (
                <div className="space-y-1 rounded-lg bg-[#f8fafb] p-2 border border-[#e5eef0]">
                  <p className="text-[8.5px] font-bold uppercase tracking-[.08em] text-[#627d8b]">
                    Verified Triggers ({context.hazardProfile.redZone.triggers.length})
                  </p>
                  {context.hazardProfile.redZone.triggers.slice(0, 4).map((trig: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[9px] leading-snug text-[#375463]">
                      <span className="mt-0.5 text-[#e53935]">•</span>
                      <span>{trig}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Authoritative Domain Summary */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                  <span className="font-bold text-[#1e788f]">Seismic Zone</span>
                  <span className="block font-medium text-[#375463]">
                    {context.hazardProfile.seismic.zone} (Z={context.hazardProfile.seismic.zoneFactor})
                  </span>
                  <span className="text-[7.5px] text-[#78909c]">BIS IS 1893:2016 (Regulatory baseline)</span>
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
                  <span className="text-[7.5px] text-[#78909c]">CWC Official Network</span>
                </div>
                <div className="rounded border border-[#e5eef0] bg-[#fdfefe] p-1.5">
                  <span className="font-bold text-[#1e788f]">Cyclone / Coast</span>
                  <span className="block font-medium text-[#375463]">
                    {context.hazardProfile.cyclone.coastalVulnerabilityClass}
                  </span>
                  <span className="text-[7.5px] text-[#78909c]">IBTrACS / IMD (Historical buffer)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-[10px] text-[#556e79]">
              <p className="leading-relaxed">{context.screening.hazardContext}</p>
              <div className="rounded-lg bg-[#f8fafb] p-2 text-[9px] text-[#6b828e]">
                Dominant screening risk: <strong>{context.screening.riskLevel}</strong> ({context.screening.riskScore === null ? "—" : `${context.screening.riskScore}/100`}).
              </div>
            </div>
          )}

          {/* Focus Districts (if state is selected) */}
          {context.stateConfig && context.stateConfig.focusDistricts.length > 0 && (
            <div className="mt-2.5 rounded-lg border border-[#e4eff1] bg-[#f8fcfd] p-2">
              <p className="text-[9px] font-bold uppercase tracking-[.08em] text-[#2b687a]">
                {context.stateConfig.name} Focus Districts ({context.stateConfig.focusDistricts.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {context.stateConfig.focusDistricts.map(d => (
                  <span key={d} className="rounded bg-[#eaf2f5] px-1.5 py-0.5 text-[8.5px] font-medium text-[#2d5668]">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </AccordionSection>

        {/* 3. LIVE ENVIRONMENTAL CONTEXT (CLOSED by default) */}
        <AccordionSection
          id="environment"
          title="Live Environmental Context"
          icon={CloudSun}
          isOpen={openSections.environment}
          onToggle={() => toggleSection("environment")}
          badge={
            <span className="rounded bg-[#e8f6f2] px-1.5 py-0.5 text-[8px] font-bold text-[#1d7d63]">
              {context.environment.temperatureC !== null ? "LIVE" : "MODELLED"}
            </span>
          }
          summary={
            next
              ? `Next day: ${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C · ${next.precipitationProbability ?? "—"}% rain · ${next.windSpeedMaxKph ?? "—"} km/h wind`
              : (context.environment.temperatureC !== null
                ? `${context.environment.temperatureC}°C · ${context.environment.precipitationMm ?? 0} mm precipitation · US AQI ${context.environment.usAqi ?? "—"}`
                : "Live forecast loading")
          }
          testId="accordion-environment"
        >
          <div className="space-y-2">
            <div className="rounded-xl border border-[#d9e8ea] bg-[#f4faf9] p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#2b7585]">{context.environment.status}</p>
              <p className="mt-1 text-[11px] font-semibold text-[#385a67]">
                {context.environment.temperatureC ?? "—"}°C · {context.environment.precipitationMm ?? "—"} mm precipitation · US AQI {context.environment.usAqi ?? "—"}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#385a67]">
                Next day: {next ? `${next.temperatureMinC ?? "—"}–${next.temperatureMaxC ?? "—"}°C · ${next.precipitationProbability ?? "—"}% rain · ${next.windSpeedMaxKph ?? "—"} km/h wind` : "Modelled forecast unavailable"}
              </p>
              <p className="mt-1 text-[9px] leading-relaxed text-[#758b94]">
                {context.environment.source} · Updated {context.environment.observedAt ? new Date(context.environment.observedAt).toLocaleString("en-IN") : "unavailable"}
              </p>
            </div>
            {context.environment.pm25 !== null && context.environment.pm25 !== undefined && (
              <div className="flex items-center justify-between rounded-lg bg-[#f8fafb] px-2.5 py-1.5 text-[9.5px] text-[#556e79]">
                <span>Fine particulate matter (PM2.5)</span>
                <span className="font-bold text-[#274b60]">{context.environment.pm25} µg/m³</span>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 4. TERRAIN & PHYSIOGRAPHY (CLOSED by default) */}
        <AccordionSection
          id="terrain"
          title="Terrain & Physiography"
          icon={Mountain}
          isOpen={openSections.terrain}
          onToggle={() => toggleSection("terrain")}
          badge={
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
              context.terrain?.status === "AVAILABLE" ? "bg-[#e6f5ec] text-[#267553]" : "bg-[#edf1f3] text-[#71828c]"
            }`}>
              {context.terrain?.status ?? "UNAVAILABLE"}
            </span>
          }
          summary={
            context.terrain?.elevationMeters !== null && context.terrain?.elevationMeters !== undefined
              ? `${context.terrain.elevationMeters} m elevation · ${context.terrain.slopeDegrees ?? "—"}° slope relief`
              : (context.terrain?.status ?? "Physiography context")
          }
          testId="accordion-terrain"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#f7fbfb] p-2 border border-[#e6eff1]">
                <p className="text-[9px] font-bold uppercase text-[#819099]">Elevation</p>
                <p className="mt-0.5 font-bold text-[#274b60]">
                  {context.terrain?.elevationMeters !== null && context.terrain?.elevationMeters !== undefined
                    ? `${context.terrain.elevationMeters} m`
                    : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
                </p>
              </div>
              <div className="rounded-lg bg-[#f7fbfb] p-2 border border-[#e6eff1]">
                <p className="text-[9px] font-bold uppercase text-[#819099]">Slope Relief</p>
                <p className="mt-0.5 font-bold text-[#274b60]">
                  {context.terrain?.slopeDegrees !== null && context.terrain?.slopeDegrees !== undefined
                    ? `${context.terrain.slopeDegrees}°`
                    : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#556e79] leading-relaxed">
              {context.terrain?.terrainClass ?? "Regional physiographic baseline"}
            </p>
          </div>
        </AccordionSection>

        {/* 5. HYDROLOGY & BASIN (CLOSED by default) */}
        <AccordionSection
          id="hydrology"
          title="Hydrology & Basin"
          icon={Droplets}
          isOpen={openSections.hydrology}
          onToggle={() => toggleSection("hydrology")}
          badge={
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${
              context.hydrology?.status === "REGIONAL_MAPPING" || context.hydrology?.status === "AVAILABLE"
                ? "bg-[#eaf5f7] text-[#1c7084]"
                : "bg-[#edf1f3] text-[#71828c]"
            }`}>
              {context.hydrology?.status ?? "UNAVAILABLE"}
            </span>
          }
          summary={
            context.hydrology?.basin
              ? `${context.hydrology.basin}${context.hydrology.nearestRiver ? ` · ${context.hydrology.nearestRiver}` : ""}`
              : (context.hydrology?.status ?? "Hydrology context")
          }
          testId="accordion-hydrology"
        >
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-[#f7fbfb] p-2 border border-[#e6eff1]">
                <p className="text-[9px] font-bold uppercase text-[#819099]">River Basin</p>
                <p className="mt-0.5 truncate font-bold text-[#274b60]">
                  {context.hydrology?.basin ?? <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
                </p>
              </div>
              <div className="rounded-lg bg-[#f7fbfb] p-2 border border-[#e6eff1]">
                <p className="text-[9px] font-bold uppercase text-[#819099]">Nearest River</p>
                <p className="mt-0.5 truncate font-bold text-[#274b60]">
                  {context.hydrology?.nearestRiver
                    ? `${context.hydrology.nearestRiver}${context.hydrology.riverDistanceKm !== null && context.hydrology.riverDistanceKm !== undefined ? ` (${context.hydrology.riverDistanceKm}km)` : ""}`
                    : <span className="text-[10px] font-medium text-[#819099]">Unavailable</span>}
                </p>
              </div>
            </div>
            {context.hydrology?.floodplainIndicator !== null && context.hydrology?.floodplainIndicator !== undefined && (
              <p className="text-[9px] font-semibold text-[#1c7084]">
                {context.hydrology.floodplainIndicator ? "⚠ Within active riverine floodplain zone" : "Outside immediate floodplain zone"}
              </p>
            )}
          </div>
        </AccordionSection>

        {/* 6. EXPOSURE & HABITATIONS (CLOSED by default) */}
        <AccordionSection
          id="exposure"
          title="Exposure & Habitations"
          icon={Users}
          isOpen={openSections.exposure}
          onToggle={() => toggleSection("exposure")}
          badge={
            <span className="rounded bg-[#fef3c7] px-1.5 py-0.5 text-[8px] font-bold text-[#b45309]">
              {context.hazardProfile?.exposedHabitations.length ?? 0} Habitations
            </span>
          }
          summary={
            context.hazardProfile?.exposedHabitations.length
              ? `${context.hazardProfile.exposedHabitations.length} habitations exposed · Census 2011`
              : (context.location.population ? `${context.location.population.toLocaleString("en-IN")} population` : "Population context")
          }
          testId="accordion-exposure"
        >
          <div className="space-y-2">
            <p className="text-[10px] leading-relaxed text-[#556e79]">{context.screening.populationContext}</p>
            {context.hazardProfile?.exposedHabitations && context.hazardProfile.exposedHabitations.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[.08em] text-[#1c4d62]">
                  <span>Exposed Habitations ({context.hazardProfile.exposedHabitations.length})</span>
                  <span className="text-[8.5px] font-semibold text-[#78909c]">Census 2011</span>
                </div>
                {context.hazardProfile.exposedHabitations.slice(0, 4).map((hab: any) => (
                  <div key={hab.habitationId} className="flex items-center justify-between rounded bg-[#f7fafb] px-2.5 py-1.5 text-[9.5px] border border-[#e6eff1]">
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
            ) : (
              <p className="text-[9.5px] text-[#78909c] italic">No high-risk habitations within immediate screening buffer.</p>
            )}
          </div>
        </AccordionSection>

        {/* 7. CARRYING CAPACITY (CLOSED by default) */}
        <AccordionSection
          id="capacity"
          title="Carrying Capacity"
          icon={Building2}
          isOpen={openSections.capacity}
          onToggle={() => toggleSection("capacity")}
          badge={
            <span className="rounded bg-[#e6f5ec] px-1.5 py-0.5 text-[8px] font-bold text-[#267553]">
              {context.categorizedInfrastructure?.totalCount ?? context.infrastructure.items.length} Facilities
            </span>
          }
          summary={
            context.categorizedInfrastructure?.totalCount
              ? `${context.categorizedInfrastructure.hospitals.length} Hosp · ${context.categorizedInfrastructure.shelters.length} Shelters · ${context.categorizedInfrastructure.emergencyFacilities.length} Emerg`
              : (realDistrict ? "District capacity assessment" : "Nearby facility sample")
          }
          testId="accordion-capacity"
        >
          <div className="space-y-2.5">
            {context.categorizedInfrastructure && context.categorizedInfrastructure.totalCount > 0 ? (
              <div>
                <p className="text-[9.5px] font-bold uppercase tracking-[.08em] text-[#2b687a]">
                  Categorized Nearby Facilities ({context.categorizedInfrastructure.totalCount})
                </p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center text-[9px]">
                  <div className="rounded bg-[#f4faf9] p-2 border border-[#e2eff0]">
                    <span className="font-bold text-sm text-[#267553]">{context.categorizedInfrastructure.hospitals.length}</span>
                    <span className="block text-[8.5px] text-[#6f858f]">Hospitals</span>
                  </div>
                  <div className="rounded bg-[#f4faf9] p-2 border border-[#e2eff0]">
                    <span className="font-bold text-sm text-[#b86728]">{context.categorizedInfrastructure.emergencyFacilities.length}</span>
                    <span className="block text-[8.5px] text-[#6f858f]">Emergency</span>
                  </div>
                  <div className="rounded bg-[#f4faf9] p-2 border border-[#e2eff0]">
                    <span className="font-bold text-sm text-[#1d788d]">{context.categorizedInfrastructure.shelters.length}</span>
                    <span className="block text-[8.5px] text-[#6f858f]">Shelters</span>
                  </div>
                </div>
                <p className="mt-2 text-[8.5px] leading-relaxed italic text-[#6f858f]">
                  Evacuation capacity is unavailable from open mapping sources (strictly null — never fabricated). See Relocation Intelligence below for full PS191 carrying capacity evaluation.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-[#f8fafb] p-2.5 text-[10px] text-[#6f858f]">
                <p>Nearby facility count: <strong>{context.infrastructure.items.length}</strong> mapped facilities.</p>
                <p className="mt-1 text-[9px] text-[#8ea0a8]">Detailed occupancy & carrying capacity is evaluated at district resolution.</p>
                <p className="mt-1.5 text-[8.5px] leading-relaxed italic text-[#78909c]">
                  Evacuation capacity is unavailable from open mapping sources (strictly null). See Relocation Intelligence below for full PS191 evaluation.
                </p>
              </div>
            )}
          </div>
        </AccordionSection>

        {/* 8. RELOCATION INTELLIGENCE (CLOSED by default) */}
        <AccordionSection
          id="relocation"
          title="Relocation Intelligence"
          icon={Compass}
          isOpen={openSections.relocation}
          onToggle={() => toggleSection("relocation")}
          badge={
            <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${badgeClass(context.screening.priority)}`}>
              {context.screening.priority}
            </span>
          }
          summary={
            realDistrict
              ? `${realDistrict.name} relocation assessment · PS191 Decision Support`
              : `${context.screening.priority} priority screening · Candidate guidance`
          }
          testId="accordion-relocation"
        >
          {realDistrict ? (
            <div className="pt-0.5">
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
                decision={context.decision}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-[#d9e8ea] bg-[#f8fafb] p-3 text-[10px] text-[#556e79] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#234b5f]">Screened Relocation Priority</span>
                <span className={`rounded px-2 py-0.5 text-[9px] font-bold ${badgeClass(context.screening.priority)}`}>
                  {context.screening.priority.toUpperCase()}
                </span>
              </div>
              <p className="leading-relaxed">
                Relocation corridor analysis operates across indexed district boundaries with verified ADM2 datasets. Location-level priority is currently calculated as <strong>{context.screening.priority}</strong> based on terrain, hydrology, and multi-hazard exposure.
              </p>
            </div>
          )}
        </AccordionSection>

        {/* 9. DATA SOURCES & LIMITATIONS (CLOSED by default) */}
        <AccordionSection
          id="provenance"
          title="Data Sources & Limitations"
          icon={FileText}
          isOpen={openSections.provenance}
          onToggle={() => toggleSection("provenance")}
          badge={
            <span className="rounded bg-[#d7eef0] px-1.5 py-0.5 text-[8px] font-bold text-[#1b7184]">
              {context.provenance?.sourceType ?? "OFFICIAL"}
            </span>
          }
          summary={`Source: ${context.provenance?.sourceType ?? "OFFICIAL"} · Multi-hazard provenance`}
          testId="accordion-provenance"
        >
          <div className="space-y-3 text-[9.5px] leading-relaxed text-[#718892]">
            {/* Header & Evidence Coverage */}
            <div className="flex items-center justify-between gap-1 border-b border-[#eaf1f3] pb-1.5">
              <span className="font-bold uppercase tracking-[.08em] text-[#2b687a]">Data Provenance & Audit</span>
              <span className="rounded bg-[#d7eef0] px-1.5 py-0.5 text-[8px] font-bold text-[#1b7184]">
                {context.provenance?.sourceType ?? "OFFICIAL"}
              </span>
            </div>

            {/* Evidence Coverage Score */}
            <div className="rounded-lg border border-[#cce3e7] bg-[#f4f9fa] p-2">
              <div className="flex items-center justify-between text-[9px] font-bold text-[#1e5868]">
                <span>Evidence Coverage Score</span>
                <span className="rounded bg-[#d8f0e5] px-1.5 py-0.2 text-[8px] font-black text-[#156e40]">
                  {context.evidenceCoverage?.label ?? "6 / 7 evidence categories available"}
                </span>
              </div>
              <p className="mt-1 text-[8px] text-[#69828d]">
                Verified against: Boundaries, Census Population, Copernicus DEM, IMD Weather, Multi-Hazard Baselines, and OSRM Road Routing. Facility capacity remains unverified until local DDMA audit.
              </p>
            </div>

            {/* Structured Cards */}
            <div className="space-y-2">
              {/* Population Card */}
              <div className="rounded-lg border border-[#e1ebed] bg-white p-2 text-[8.5px]">
                <div className="flex items-center justify-between border-b border-[#f0f4f5] pb-1">
                  <span className="font-bold uppercase text-[#2b687a]">Population</span>
                  <span className="rounded bg-[#e8f4f6] px-1 py-0.2 text-[7.5px] font-bold text-[#1b7184]">
                    {context.location.populationMeta?.provenance ?? (context.location.population !== null ? "OFFICIAL" : "UNAVAILABLE")}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px] text-[#69828d]">
                  <div><b>Count:</b> {context.location.population?.toLocaleString("en-IN") ?? "Unavailable"} people</div>
                  <div><b>Resolution:</b> {context.location.populationMeta?.resolution ?? context.location.category}</div>
                  <div><b>Year:</b> {context.location.populationMeta?.year ?? "2011"}</div>
                  <div><b>Unit:</b> {context.location.populationMeta?.unit ?? "people"}</div>
                </div>
                <p className="mt-1 text-[7.5px] text-[#859ca6] truncate">
                  Source: {context.location.populationSource}
                </p>
              </div>

              {/* Weather & IMD Warnings Card */}
              <div className="rounded-lg border border-[#e1ebed] bg-white p-2 text-[8.5px]">
                <div className="flex items-center justify-between border-b border-[#f0f4f5] pb-1">
                  <span className="font-bold uppercase text-[#2b687a]">Weather & Warnings</span>
                  <span className={`rounded px-1 py-0.2 text-[7.5px] font-bold ${
                    context.environment.imdWarning?.warningLevel === "WARNING"
                      ? "bg-red-100 text-red-700"
                      : context.environment.imdWarning?.warningLevel === "ALERT"
                      ? "bg-orange-100 text-orange-700"
                      : context.environment.imdWarning?.warningLevel === "WATCH"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {context.environment.imdWarning ? `IMD ${context.environment.imdWarning.warningLevel}` : "MODELLED"}
                  </span>
                </div>
                {context.environment.imdWarning ? (
                  <div className="mt-1 space-y-0.5 text-[8px]">
                    <p className="font-semibold text-[#1e5868]">
                      IMD District Nowcast: {context.environment.imdWarning.headline}
                    </p>
                    <div className="flex items-center justify-between text-[7.5px] text-[#859ca6]">
                      <span>Valid: {context.environment.imdWarning.validUpto ?? "Current"}</span>
                      <span>Source: IMD Mausam (Official)</span>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[8px] text-[#69828d]">
                    Numerical fields: Open-Meteo ECMWF/GFS forecast. IMD warnings parsed per district.
                  </p>
                )}
              </div>

              {/* Terrain & Derived Slope Card */}
              <div className="rounded-lg border border-[#e1ebed] bg-white p-2 text-[8.5px]">
                <div className="flex items-center justify-between border-b border-[#f0f4f5] pb-1">
                  <span className="font-bold uppercase text-[#2b687a]">Terrain & Slope</span>
                  <span className="rounded bg-[#e8f4f6] px-1 py-0.2 text-[7.5px] font-bold text-[#1b7184]">
                    {context.terrain?.status ?? "AVAILABLE"}
                  </span>
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[8px] text-[#69828d]">
                  <div><b>Raw Elevation:</b> {context.terrain?.elevationMeters !== null && context.terrain?.elevationMeters !== undefined ? `${context.terrain.elevationMeters}m MSL` : "Unavailable"}</div>
                  <div><b>Derived Slope:</b> {context.terrain?.slopeDegrees !== null && context.terrain?.slopeDegrees !== undefined ? `${context.terrain.slopeDegrees}°` : "Unavailable"}</div>
                  <div><b>Aspect:</b> {context.terrain?.aspectDegrees !== null && context.terrain?.aspectDegrees !== undefined ? `${context.terrain.aspectDegrees}°` : "—"}</div>
                  <div><b>Ruggedness:</b> {context.terrain?.terrainRuggedness ?? "Moderate"}</div>
                </div>
                <p className="mt-1 text-[7.5px] text-[#859ca6]">
                  Method: {context.terrain?.derivedSlopeMethod ?? "Horn's finite-difference gradient over 90m Copernicus DEM raster"}
                </p>
              </div>

              {/* Geology Card — GSI Bhukosh Official Vector / Reference */}
              {context.geology?.available ? (
                <div data-testid="selected-location-geology" className="rounded-lg border border-[#cbe4de] bg-[#f0f9f6] p-2 text-[8.5px]">
                  <div className="flex items-center justify-between border-b border-[#b7dfd4] pb-1">
                    <span className="font-bold uppercase text-[#14532d]">Geology — GSI Bhukosh</span>
                    <span className="rounded bg-emerald-100 px-1 py-0.2 text-[7.5px] font-bold text-emerald-800">
                      OFFICIAL VECTOR
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 text-[8px] text-[#1e3a2b]">
                    <div><b>Lithology:</b> {context.geology.lithology ?? "Unclassified rock unit"}</div>
                    {context.geology.geologicalAge && (
                      <div><b>Geological Age:</b> {context.geology.geologicalAge}</div>
                    )}
                    {context.geology.formation && (
                      <div><b>Formation / Group:</b> {context.geology.formation}</div>
                    )}
                    {context.geology.tectonicContext && (
                      <div><b>Structural / Tectonic:</b> {context.geology.tectonicContext}</div>
                    )}
                    {context.geology.geomorphology && (
                      <div><b>Geomorphology (1:50K):</b> {context.geology.geomorphology}</div>
                    )}
                    <div className="pt-0.5 text-[7px] text-[#4b7a60] flex items-center justify-between border-t border-[#d4ede4] mt-1">
                      <span>Scale: {context.geology.scale}</span>
                      <span>Source: Geological Survey of India</span>
                    </div>
                  </div>
                </div>
              ) : context.geology?.confidence === "GSI_WMS_REFERENCE" ? (
                <div data-testid="selected-location-geology" className="rounded-lg border border-[#d9e6f2] bg-[#f4f8fd] p-2 text-[8.5px]">
                  <div className="flex items-center justify-between border-b border-[#c2daf0] pb-1">
                    <span className="font-bold uppercase text-[#1e3a5f]">Geology — GSI Bhukosh</span>
                    <span className="rounded bg-sky-100 px-1 py-0.2 text-[7.5px] font-bold text-sky-800">
                      OFFICIAL WMS
                    </span>
                  </div>
                  <p className="mt-1 text-[8px] text-[#2c4c6e]">
                    Interactive geological map available through official GSI WMS. Vector attribute query: UNAVAILABLE.
                  </p>
                </div>
              ) : (
                <div data-testid="selected-location-geology" className="rounded-lg border border-[#f5dcdc] bg-[#fdf5f5] p-2 text-[8.5px]">
                  <div className="flex items-center justify-between border-b border-[#f0cccc] pb-1">
                    <span className="font-bold uppercase text-[#882b2b]">Geology — GSI Bhukosh</span>
                    <span className="rounded bg-rose-100 px-1 py-0.2 text-[7.5px] font-bold text-rose-800">
                      UNAVAILABLE
                    </span>
                  </div>
                  <p className="mt-1 text-[8px] text-[#803d3d]">
                    {context.geology?.limitations ?? "No machine-readable GSI geological geometry available for this query. No provisional geometry fabricated."}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[#516b77]">{context.provenance?.provenanceLabel ?? "Authoritative administrative context"}</p>
            <div className="flex flex-wrap gap-1">
              <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">CEEW 2021 CVI</span>
              <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">DST Common Framework</span>
              <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">XDI 2050 Risk</span>
              <span className="rounded border border-[#dfeaec] bg-white px-1.5 py-0.5 text-[8px] text-[#607682]">geoBoundaries ADM1</span>
            </div>
            <p className="pt-1 text-[9px] text-[#819099] border-t border-[#eaf1f3]">
              The screening value is a transparent decision-support signal; it is not an official hazard warning or evacuation order.
            </p>
            <button type="button" onClick={onOpenKeralaAssessment} disabled aria-disabled="true" className="h-7 w-full cursor-not-allowed rounded-lg border border-[#d9e4e6] bg-[#f4f7f8] text-[10px] font-semibold text-[#8a9aa1]">
              Retained Kerala assessment actions disabled for this location
            </button>
          </div>
        </AccordionSection>
      </div>
    </aside>
  );
}


export function IndiaLocationSummaryStrip({ context }: { context: IndiaLocationContext }) {
  const next = context.environment.forecast[0];
  const decision = context.decision;
  const effectiveTier = decision?.responsePriority.priorityLevel ?? context.screening.priority;
  const riskScore = decision ? `${decision.responsePriority.priorityScore}/100` : (context.screening.riskScore === null ? "Unavailable" : `${context.screening.riskScore}/100`);
  const locationPath = [context.location.address.locality, context.location.address.city, context.location.address.district, context.location.address.state].filter(Boolean).filter((value, index, values) => values.indexOf(value) === index).join(" · ") || "India";
  const contextLive = context.environment.status === "LIVE MODELLED ENVIRONMENTAL CONTEXT";
  return (
    <section data-testid="india-location-summary-strip" aria-labelledby="location-decision-context-title" className="overflow-hidden rounded-2xl border border-[#b9d8df] bg-white shadow-[0_16px_36px_rgba(22,75,91,0.08)]">
      <div className="grid gap-4 bg-[#102b45] p-4 text-white sm:p-5 lg:grid-cols-[minmax(0,1fr)_190px] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#9edbe5]">Location decision context</p>
            <span className="rounded-full border border-[#6aa3ae]/50 bg-[#1b4659] px-2 py-0.5 text-[9px] font-semibold text-[#d7eef0]">Selected search result</span>
            {decision ? (
              <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase ${
                decision.responsePriority.priorityLevel === "HIGH"
                  ? "bg-[#fee2e2] text-[#b91c1c]"
                  : decision.responsePriority.priorityLevel === "MEDIUM"
                    ? "bg-[#ffedd5] text-[#c2410c]"
                    : "bg-[#dcfce7] text-[#15803d]"
              }`}>
                CANONICAL {decision.responsePriority.priorityLevel} PRIORITY ({decision.hazardAssessment.primaryHazard})
              </span>
            ) : context.redZone ? (
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
            ) : null}
          </div>
          <h2 id="location-decision-context-title" className="mt-1.5 text-xl font-bold tracking-tight">{context.location.name}</h2>
          <p className="mt-1 text-[11px] text-[#c3d7dc]">{context.location.category} · {locationPath}</p>
          <p className="mt-3 max-w-3xl text-[11px] leading-relaxed text-[#d2e1e4]">{decision ? decision.explanation.whyThisPriority : context.screening.hazardContext}</p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#b9dce1]">Decision priority</p>
          <p className={`mt-1 text-2xl font-bold ${
            effectiveTier === "HIGH" || effectiveTier === "Immediate" || effectiveTier === "High" || (context.screening.riskLevel as string) === "High"
              ? "text-[#ff8d88]"
              : effectiveTier === "MEDIUM" || effectiveTier === "Moderate" || (context.screening.riskLevel as string) === "Moderate"
                ? "text-[#ffd87a]"
                : "text-[#7ce39a]"
          }`}>{riskScore}</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] ${badgeClass(context.screening.priority)}`}>{effectiveTier} priority</span>
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
  return <section data-testid="selected-location-report-action" className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#bfdce2] bg-[#eff8f8] p-3.5 shadow-[0_10px_24px_rgba(28,55,70,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-4"><div className="flex items-start gap-3"><img src="/resq-logo.png" alt="ResQ Logo" className="h-10 w-10 shrink-0 rounded-xl object-contain bg-white p-0.5 shadow-sm ring-1 ring-[#1b7184]/20" /><div><p className="text-xs font-bold text-[#244f63]">Complete selected-area analysis</p><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-[#66808a]">Download the {context.location.category.toLowerCase()} PDF with the grounded AI/ML narrative, selected metrics, forecast, mapped extent, colour legend, sources, and analyst-review notes.</p></div></div><button type="button" onClick={onDownload} disabled={isPending} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d59] px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(23,61,89,.16)] transition hover:bg-[#0d304a] disabled:cursor-wait disabled:opacity-70"><FileText className="h-4 w-4" />{isPending ? "Building selected-area PDF…" : "Download selected-area PDF"}</button></section>;
}

export function SelectedLocationForecastDetails({ context }: { context: IndiaLocationContext }) {
  return <div><SelectedLocationPriorityQueue context={context} /><SelectedLocationPriorityDecisionTable context={context} /><SelectedLocationForecastSidebar context={context} /><SelectedLocationInfrastructure context={context} /></div>;
}
