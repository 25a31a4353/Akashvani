import React, { useState, useEffect } from "react";
import type { IndiaLocationContext, IndiaLocation } from "@shared/india";
import { buildLocationSignature } from "../../../../server/diva/locationSignature";
import { Activity, CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiagnosticStatus = "AVAILABLE" | "UNAVAILABLE" | "ERROR" | "STALE" | "NOT_APPLICABLE";

interface DiagnosticItem {
  name: string;
  status: DiagnosticStatus;
  detail: string;
  source: string;
  timestamp?: string | null;
}

export function LocationConsistencyDiagnostics({
  context,
  selectedLocation,
}: {
  context?: IndiaLocationContext | null;
  selectedLocation?: IndiaLocation | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only visible when URL has ?debug=1 or ?diagnostics=1 or localStorage resq_debug is set
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("debug") === "1" || urlParams.get("diagnostics") === "1" || localStorage.getItem("resq_debug") === "true") {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  const loc = context?.location ?? selectedLocation;
  const signature = loc ? buildLocationSignature(loc) : "NO_LOCATION_SELECTED";

  const diagnostics: DiagnosticItem[] = [
    {
      name: "Selected Location",
      status: loc ? "AVAILABLE" : "UNAVAILABLE",
      detail: loc ? `${loc.name} (${loc.category || "District"}) [${loc.latitude.toFixed(4)}°N, ${loc.longitude.toFixed(4)}°E]` : "No active location",
      source: loc?.source ?? "System Selection",
      timestamp: new Date().toISOString(),
    },
    {
      name: "Decision Context",
      status: context?.decision ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.decision ? `Decision ID: ${context.decision.decisionId} · Tier: ${context.decision.recommendedAction.tier}` : "Canonical decision pipeline awaiting location context",
      source: "ResQ Canonical Decision Engine V3.1",
      timestamp: context?.decision?.decisionTimestamp,
    },
    {
      name: "Weather & Atmosphere",
      status: context?.environment?.temperatureC != null ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.environment?.temperatureC != null ? `${context.environment.temperatureC}°C · Precip: ${context.environment.precipitationMm ?? 0} mm · Press: ${context.environment.surfacePressureHpa ?? "—"} hPa` : "Open-Meteo telemetry missing or incomplete",
      source: context?.environment?.source ?? "Open-Meteo High-Resolution NWP Model (ECMWF/GFS)",
      timestamp: context?.environment?.observedAt,
    },
    {
      name: "Population Baseline",
      status: (context?.decision?.exposureAssessment?.populationValue ?? loc?.population) != null ? "AVAILABLE" : "UNAVAILABLE",
      detail: (context?.decision?.exposureAssessment?.populationValue ?? loc?.population) != null ? `${(context?.decision?.exposureAssessment?.populationValue ?? loc?.population)?.toLocaleString("en-IN")} people` : "State/Habitation population unverified",
      source: loc?.populationSource ?? "Census of India 2011 Primary Census Abstract",
    },
    {
      name: "Hazard Exposure Profile",
      status: context?.hazardProfile?.redZone ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.hazardProfile?.redZone ? `Primary: ${context.hazardProfile.redZone.primaryHazard} (Score: ${context.hazardProfile.redZone.score}/100)` : "Screening baseline only",
      source: "GSI Landslide / BIS IS 1893 Seismic / CWC Flood",
    },
    {
      name: "Facility Registry (OSM)",
      status: context?.infrastructure?.status !== "UNAVAILABLE" ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.infrastructure?.items?.length ? `${context.infrastructure.items.length} mapped facilities discovered` : "0 facilities verified within 35 km buffer",
      source: "OpenStreetMap / Overpass Spatial API",
      timestamp: context?.infrastructure?.observedAt,
    },
    {
      name: "Verified Shelter Capacity",
      status: context?.decision?.capacityAssessment?.capacityVerified ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.decision?.capacityAssessment?.capacityVerified ? `Capacity: ${context.decision.capacityAssessment.notes}` : "Capacity unavailable from open mapping sources (strictly null)",
      source: "District DDMA Shelter Registry / OSM Metadata",
    },
    {
      name: "Road Evacuation Route",
      status: context?.decision?.routingAssessment?.isRoadRoute ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.decision?.routingAssessment?.isRoadRoute ? `OSRM Driving Route: ${context.decision.routingAssessment.distanceKm} km (~${context.decision.routingAssessment.durationMinutes} min)` : "Road-network routing unavailable (direct corridor disabled)",
      source: "Open Source Routing Machine (OSRM) Road Network",
    },
    {
      name: "Relocation Recommendation",
      status: context?.decision?.relocationAssessment?.bestCandidate ? "AVAILABLE" : "UNAVAILABLE",
      detail: context?.decision?.relocationAssessment?.bestCandidate ? `Destination: ${context.decision.relocationAssessment.bestCandidate.name} (${context.decision.relocationAssessment.bestCandidate.facilityRole})` : "No safe candidate identified within buffer",
      source: "ResQ Safe-Haven Spatial Multi-Criteria Engine",
    },
    {
      name: "ResQ AI Assistant Grounding",
      status: "AVAILABLE",
      detail: "Grounding: SUPPLIED RESQ STRUCTURED ANALYSIS ONLY · Deterministic Fallback Active",
      source: "Deterministic Decision Support Model",
    },
  ];

  const getStatusBadge = (status: DiagnosticStatus) => {
    switch (status) {
      case "AVAILABLE":
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-700/50"><CheckCircle2 className="h-2.5 w-2.5" /> AVAILABLE</span>;
      case "UNAVAILABLE":
        return <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-700/50"><AlertTriangle className="h-2.5 w-2.5" /> UNAVAILABLE</span>;
      case "ERROR":
        return <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-700/50"><XCircle className="h-2.5 w-2.5" /> ERROR</span>;
      case "STALE":
        return <span className="inline-flex items-center gap-1 rounded bg-purple-950/80 px-1.5 py-0.5 text-[9px] font-bold text-purple-400 border border-purple-700/50"><Activity className="h-2.5 w-2.5" /> STALE</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold text-slate-400">NOT_APPLICABLE</span>;
    }
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 max-w-md w-full">
      <div className="rounded-xl border border-cyan-800/60 bg-[#06141d]/95 text-slate-200 shadow-2xl backdrop-blur-md overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left border-b border-cyan-900/40 hover:bg-cyan-950/40 transition"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-cyan-200">ResQ Diagnostic Inspector (Phase 15)</span>
          </div>
          {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
        </button>

        {isOpen && (
          <div className="p-3.5 space-y-2.5 max-h-[70vh] overflow-y-auto text-[11px]">
            <div className="rounded-lg bg-black/40 p-2.5 border border-cyan-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Deterministic Signature</p>
              <p className="font-mono text-[10px] text-slate-300 break-all mt-0.5">{signature}</p>
            </div>

            <div className="space-y-1.5">
              {diagnostics.map((d) => (
                <div key={d.name} className="rounded-md border border-slate-800 bg-[#091e2b]/60 p-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{d.name}</span>
                    {getStatusBadge(d.status)}
                  </div>
                  <p className="text-slate-400 text-[10.5px]">{d.detail}</p>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
                    <span>Source: {d.source}</span>
                    {d.timestamp && <span>{new Date(d.timestamp).toLocaleTimeString("en-IN")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
