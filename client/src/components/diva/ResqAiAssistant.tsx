import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileQuestion,
  HelpCircle,
  Info,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Route,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResqStructuredContext, AssistantExplanation } from "../../../../server/diva/assistant";
import type { IndiaLocationContext } from "@shared/india";

export function buildResqAssistantContext(
  context?: IndiaLocationContext | ResqStructuredContext | null,
  selectedLocation?: any
): ResqStructuredContext {
  if (context && "locationName" in context) {
    return context as ResqStructuredContext;
  }
  const indiaCtx = context as IndiaLocationContext | undefined;
  const loc = indiaCtx?.location ?? selectedLocation;
  return {
    locationName: loc?.name ?? "Selected Location",
    category: loc?.category,
    district: loc?.address?.district ?? loc?.address?.city,
    state: loc?.address?.state,
    latitude: loc?.latitude ?? 20.5937,
    longitude: loc?.longitude ?? 78.9629,
    primaryHazard: indiaCtx?.hazardProfile?.redZone.primaryHazard ?? indiaCtx?.screening.hazardContext,
    secondaryHazards: [],
    classificationZone: indiaCtx?.hazardProfile?.redZone.status ?? indiaCtx?.screening.riskLevel?.toUpperCase() ?? "SCREENING",
    classificationScore: indiaCtx?.hazardProfile?.redZone.score ?? indiaCtx?.screening.riskScore ?? null,
    classificationReasons: indiaCtx?.hazardProfile?.redZone.primaryDriverReason ? [indiaCtx.hazardProfile.redZone.primaryDriverReason] : [],
    exposedHabitations: indiaCtx?.hazardProfile?.exposedHabitations.map((h: any) => ({
      name: h.name,
      population: h.population,
      exposureLevel: h.exposureLevel,
      hazardType: h.hazardType,
      distanceKm: h.distanceToHazardKm,
    })) ?? [],
    relocationPriority: indiaCtx?.screening.priority ?? "MODERATE",
    facilitiesAvailable: indiaCtx?.infrastructure.items.length ?? 0,
    facilityCapacityVerified: false,
    facilityCapacityNote: "OpenStreetMap / Overpass geometry; building structural capacity requires district field survey verification.",
    weatherConditions: indiaCtx?.environment ? {
      temperatureC: indiaCtx.environment.temperatureC,
      precipitationMm: indiaCtx.environment.precipitationMm,
      airQualityAqi: indiaCtx.environment.usAqi,
      status: indiaCtx.environment.status,
    } : undefined,
    unavailableData: [
      "Real-time indoor shelter beds unverified from OSM",
      "Field responder unit telematics pending manual check-in",
    ],
  };
}

export interface ResqAiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context?: IndiaLocationContext | ResqStructuredContext | null;
  selectedLocation?: any;
}

export function ResqAiAssistant({ isOpen, onClose, context, selectedLocation }: ResqAiAssistantProps) {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const explainMutation = trpc.diva.assistant.explain.useMutation();
  const structuredCtx = buildResqAssistantContext(context, selectedLocation);

  // Initial trigger or cached result
  const [explanation, setExplanation] = useState<AssistantExplanation | null>(null);

  const fetchExplanation = async () => {
    try {
      const res = await explainMutation.mutateAsync(structuredCtx);
      setExplanation(res);
    } catch (err) {
      console.warn("ResQ Assistant query failed:", err);
    }
  };

  React.useEffect(() => {
    if (isOpen && !explanation && !explainMutation.isPending) {
      fetchExplanation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, structuredCtx.locationName]);

  if (!isOpen) return null;

  const quickQuestions = [
    { id: "primary", label: t.aiQuestionPrimaryHazard, section: "primary" },
    { id: "secondary", label: t.aiQuestionSecondaryHazards, section: "secondary" },
    { id: "classification", label: t.aiQuestionWhyClassified, section: "classification" },
    { id: "habitation", label: t.aiQuestionExposedHabitation, section: "habitation" },
    { id: "priority", label: t.aiQuestionRelocationPriority, section: "priority" },
    { id: "facilities", label: t.aiQuestionFacilitiesAvailable, section: "facilities" },
    { id: "capacity", label: t.aiQuestionFacilityCapacity, section: "capacity" },
    { id: "destination", label: t.aiQuestionSelectedDestination, section: "destination" },
    { id: "route", label: t.aiQuestionRouteAvailable, section: "route" },
    { id: "unavailable", label: t.aiQuestionUnavailableData, section: "unavailable" },
    { id: "nextSteps", label: t.aiQuestionResponderNextSteps, section: "checklist" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resq-assistant-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#0d2331] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="resq-assistant-title" className="text-sm font-bold tracking-tight">
                  {t.aiAssistantTitle}
                </h2>
                <span className="rounded bg-teal-900/80 border border-teal-500/30 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                  DECISION SUPPORT
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Grounded Explanation for <strong className="text-white">{structuredCtx.locationName}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchExplanation}
              disabled={explainMutation.isPending}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10"
              aria-label="Refresh explanation"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", explainMutation.isPending && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-slate-300 hover:text-white hover:bg-white/10"
              aria-label={t.close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Disclaimer Warning */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-[10px] text-amber-900 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>{t.aiDisclaimer}</span>
        </div>

        {/* Quick Question Chips */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
          <button
            onClick={() => setActiveFilter("ALL")}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold transition shrink-0",
              activeFilter === "ALL"
                ? "bg-[#18485e] text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            All Responses
          </button>
          {quickQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => setActiveFilter(q.section)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-medium transition shrink-0",
                activeFilter === q.section
                  ? "bg-[#18485e] text-white font-bold"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
              )}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {explainMutation.isPending ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="h-7 w-7 text-teal-600 animate-spin mb-3" />
              <p className="text-xs font-semibold text-slate-700">Synthesizing ResQ structured telemetry…</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                Auditing hazard baselines, OSM facilities, road connectivity and exposed habitations for {structuredCtx.locationName}.
              </p>
            </div>
          ) : explanation ? (
            <div className="space-y-4 text-xs">
              {/* Top Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#143d52] text-sm">{explanation.headline}</h3>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                      explanation.isDeterministicFallback
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-teal-100 text-teal-800 border border-teal-300"
                    )}
                  >
                    {explanation.isDeterministicFallback ? "DETERMINISTIC FALLBACK" : "AI SYNTHESIZED"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 font-mono">
                  Grounding: {explanation.grounding} · Generated: {new Date(explanation.generatedAt).toLocaleTimeString("en-IN")}
                </p>
              </div>

              {/* QA Sections */}
              {(activeFilter === "ALL" || activeFilter === "primary") && (
                <div className="rounded-xl border border-red-200 bg-red-50/40 p-3">
                  <h4 className="font-bold text-red-900 flex items-center gap-1.5 text-xs mb-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                    1. Primary Hazard
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.primaryHazardExplanation}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "secondary") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs mb-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    2. Secondary Hazards
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.secondaryHazardsExplanation}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "classification") && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <Layers className="h-3.5 w-3.5 text-slate-600" />
                    3. Why is this location classified this way?
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{explanation.classificationRationale}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "habitation") && (
                <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-3">
                  <h4 className="font-bold text-orange-900 flex items-center gap-1.5 text-xs mb-1">
                    <Users className="h-3.5 w-3.5 text-orange-600" />
                    4. Exposed Habitation
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.exposedHabitationsSummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "priority") && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <Compass className="h-3.5 w-3.5 text-indigo-600" />
                    5. Relocation Priority
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{explanation.relocationPrioritySummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "facilities") && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <Building2 className="h-3.5 w-3.5 text-teal-600" />
                    6. Available Facilities (OSM)
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{explanation.facilitiesSummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "capacity") && (
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                    7. Facility Capacity Verification Status
                  </h4>
                  <p className="text-slate-700 leading-relaxed text-[11px]">{explanation.facilityCapacitySummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "destination") && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs mb-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    8. Selected Destination Candidate
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.selectedDestinationSummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "route") && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/30 p-3">
                  <h4 className="font-bold text-sky-900 flex items-center gap-1.5 text-xs mb-1">
                    <Route className="h-3.5 w-3.5 text-sky-600" />
                    9. Available Evacuation Route
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.routeSummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "unavailable") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3">
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs mb-1">
                    <Info className="h-3.5 w-3.5 text-amber-600" />
                    10. Unavailable Data & Gaps
                  </h4>
                  <p className="text-slate-800 leading-relaxed text-[11px]">{explanation.unavailableDataSummary}</p>
                </div>
              )}

              {(activeFilter === "ALL" || activeFilter === "checklist") && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3">
                  <h4 className="font-bold text-blue-900 flex items-center gap-1.5 text-xs mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    11. Responder Verification Checklist
                  </h4>
                  <ul className="space-y-1 text-[10.5px] text-slate-700">
                    {explanation.responderChecklist.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-bold text-blue-800">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileQuestion className="h-8 w-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No explanation generated yet</p>
              <Button size="sm" onClick={fetchExplanation} className="mt-3 text-xs bg-[#163c58]">
                Generate Location Explanation
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-[10px] text-slate-500 italic">
            ResQ AI Assistant answers only from deterministic telemetry.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
            {t.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
