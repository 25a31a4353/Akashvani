/**
 * PS191DecisionPanel — Phase 3.4 UI Component
 *
 * Shows the full carrying-capacity + relocation intelligence for a classified district.
 * Triggered when a redzone district polygon is clicked on the map.
 *
 * Data integrity labels (always visible):
 * - Population: CENSUS_2011 / UNAVAILABLE
 * - Exposure: HABITATION_SUM (Phase 3.4) or DISTRICT_SCREENING_ASSUMPTION (fallback) — always labeled
 * - Distance: STRAIGHT_LINE
 * - Priority model: BASELINE PS191 PRIORITY MODEL
 * - Capacity: UNAVAILABLE from OSM
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  HelpCircle,
  Home,
  MapPin,
  Ruler,
  ShieldAlert,
  Users,
  X,
  Loader2,
  Info,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CarryingCapacityAssessment,
  EvacuationFacility,
  RelocationRecommendation,
} from "@shared/hazards";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClassificationBadge({
  classification,
}: {
  classification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE";
}) {
  const cfg =
    classification === "RED"
      ? { bg: "bg-[#fef2f2]", text: "text-[#b91c1c]", border: "border-[#fca5a5]", label: "RED — Critical" }
      : classification === "ORANGE"
      ? { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", border: "border-[#fdba74]", label: "ORANGE — Attention required" }
      : classification === "GREEN"
      ? { bg: "bg-[#f0fdf4]", text: "text-[#15803d]", border: "border-[#86efac]", label: "GREEN — Lower assessed concern" }
      : { bg: "bg-[#f8fafc]", text: "text-[#64748b]", border: "border-[#cbd5e1]", label: "UNAVAILABLE" };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold",
        cfg.bg, cfg.text, cfg.border
      )}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ level }: { level: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" }) {
  const cfg =
    level === "HIGH"
      ? { bg: "bg-[#fef2f2]", text: "text-[#b91c1c]", border: "border-[#fca5a5]" }
      : level === "MEDIUM"
      ? { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", border: "border-[#fdba74]" }
      : level === "LOW"
      ? { bg: "bg-[#f0fdf4]", text: "text-[#15803d]", border: "border-[#86efac]" }
      : { bg: "bg-[#f8fafc]", text: "text-[#64748b]", border: "border-[#cbd5e1]" };
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold",
        cfg.bg, cfg.text, cfg.border
      )}
    >
      {level}
    </span>
  );
}

function FacilityRoleIcon({ role }: { role: string }) {
  if (role === "HOSPITAL_MEDICAL_SUPPORT") return <Building2 className="h-3.5 w-3.5 text-[#0369a1]" />;
  if (role === "EMERGENCY_SHELTER") return <ShieldAlert className="h-3.5 w-3.5 text-[#15803d]" />;
  if (role === "SCHOOL_EVACUATION_SUPPORT") return <Users className="h-3.5 w-3.5 text-[#7c3aed]" />;
  if (role === "RELIEF_CENTRE") return <CheckCircle2 className="h-3.5 w-3.5 text-[#b45309]" />;
  return <MapPin className="h-3.5 w-3.5 text-[#6b7280]" />;
}

function FacilityRoleLabel({ role }: { role: string }) {
  const labels: Record<string, string> = {
    EMERGENCY_SHELTER: "Emergency Shelter",
    HOSPITAL_MEDICAL_SUPPORT: "Hospital (medical support)",
    SCHOOL_EVACUATION_SUPPORT: "School (evacuation support)",
    RELIEF_CENTRE: "Relief Centre",
    COMMUNITY_FACILITY: "Community Facility",
    UNKNOWN: "Unknown role",
  };
  return <span>{labels[role] ?? role}</span>;
}

function SuitabilityTag({ suitability }: { suitability: string }) {
  const cfg =
    suitability === "PREFERRED"
      ? { bg: "bg-[#f0fdf4]", text: "text-[#15803d]" }
      : suitability === "CONDITIONAL"
      ? { bg: "bg-[#fffbeb]", text: "text-[#b45309]" }
      : suitability === "UNSUITABLE"
      ? { bg: "bg-[#fef2f2]", text: "text-[#b91c1c]" }
      : { bg: "bg-[#f8fafc]", text: "text-[#64748b]" };
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", cfg.bg, cfg.text)}>
      {suitability}
    </span>
  );
}

function FacilityRow({ facility }: { facility: EvacuationFacility }) {
  const isRoad = facility.distanceType === "ROAD_NETWORK" && facility.routeDistanceKm != null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#e2e8f0] bg-white p-2.5">
      <FacilityRoleIcon role={facility.facilityRole} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-[#1e3a4a]">{facility.name}</p>
        <p className="mt-0.5 text-[9px] text-[#64748b]">
          <FacilityRoleLabel role={facility.facilityRole} />
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {isRoad ? (
            <span className="flex items-center gap-1 rounded bg-[#ecfdf5] px-1.5 py-0.5 text-[9px] font-semibold text-[#065f46] border border-[#a7f3d0]">
              <Ruler className="h-2.5 w-2.5 text-[#059669]" />
              {facility.routeDistanceKm} km ROAD
              {facility.estimatedTravelTimeMinutes != null && (
                <span>· {facility.estimatedTravelTimeMinutes} min</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[9px] text-[#475569]">
              <Ruler className="h-2.5 w-2.5" />
              {facility.straightLineDistanceKm.toFixed(1)} km STRAIGHT_LINE
            </span>
          )}
          <SuitabilityTag suitability={facility.relocationSuitability} />
        </div>
        <p className="mt-0.5 text-[9px] italic text-[#94a3b8]">
          Capacity: UNAVAILABLE (OSM does not publish evacuation capacity)
        </p>
      </div>
    </div>
  );
}

function ReasonCodeTag({ code }: { code: string }) {
  const labels: Record<string, string> = {
    RED_ZONE: "RED ZONE",
    ORANGE_ZONE: "ORANGE ZONE",
    HIGH_EXPOSURE: "HIGH EXPOSURE",
    HIGH_VULNERABILITY: "HIGH VULNERABILITY",
    POPULATION_EXPOSED: "POPULATION EXPOSED",
    CAPACITY_DEFICIT: "CAPACITY DEFICIT",
    POOR_ACCESS: "POOR ACCESS",
    FACILITY_HAZARD_CONFLICT: "FACILITY HAZARD CONFLICT",
    NO_NEARBY_CAPACITY: "NO NEARBY CAPACITY",
    DATA_LIMITATION: "DATA LIMITATION",
    LOW_HAZARD_SCORE: "LOW HAZARD SCORE",
    ADEQUATE_CAPACITY: "ADEQUATE CAPACITY",
    CAPACITY_DATA_UNAVAILABLE: "CAPACITY DATA UNAVAILABLE",
    FACILITY_CAPACITY_UNKNOWN: "FACILITY CAPACITY UNKNOWN",
  };
  const isCritical = [
    "RED_ZONE",
    "CAPACITY_DEFICIT",
    "NO_NEARBY_CAPACITY",
    "HIGH_EXPOSURE",
    "FACILITY_HAZARD_CONFLICT",
  ].includes(code);
  return (
    <span
      className={cn(
        "rounded border px-1.5 py-0.5 text-[9px] font-bold",
        isCritical
          ? "border-[#fca5a5] bg-[#fef2f2] text-[#b91c1c]"
          : "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]"
      )}
    >
      {labels[code] ?? code}
    </span>
  );
}

// ─── Capacity Section (updated for Phase 3.4) ─────────────────────────────────

function ExposureMethodBadge({ method }: { method: string }) {
  if (method === "HABITATION_SUM" || method === "POINT_BASED_SCREENING") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#bbf7d0] bg-[#f0fdf4] px-1.5 py-0.5 text-[8px] font-bold text-[#15803d]">
        <Home className="h-2.5 w-2.5" />
        HABITATION-LEVEL · DERIVED
      </span>
    );
  }
  if (method === "DISTRICT_SCREENING_ASSUMPTION") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[#fde68a] bg-[#fffbeb] px-1.5 py-0.5 text-[8px] font-bold text-[#b45309]">
        <AlertTriangle className="h-2.5 w-2.5" />
        SCREENING ASSUMPTION · FALLBACK
      </span>
    );
  }
  return (
    <span className="rounded border border-[#e2e8f0] bg-[#f8fafc] px-1.5 py-0.5 text-[8px] font-bold text-[#94a3b8]">
      UNAVAILABLE
    </span>
  );
}

function CapacitySection({ assessment }: { assessment: CarryingCapacityAssessment }) {
  const isCapacityUnavailable =
    assessment.capacityStatus === "CAPACITY_UNAVAILABLE" ||
    assessment.availableCapacity === null;
  const isScreeningFallback = assessment.exposureMethod === "DISTRICT_SCREENING_ASSUMPTION";

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
        Carrying capacity assessment
      </p>
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        {/* District Population */}
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-2">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">District Population</p>
          <p className="mt-0.5 font-bold text-[#1e3a4a]">
            {assessment.population !== null
              ? assessment.population.toLocaleString("en-IN")
              : "UNAVAILABLE"}
          </p>
          <p className="text-[8px] text-[#64748b]">
            Source: {assessment.populationStatus === "POPULATION_OBSERVED" ? "Census 2011 · OFFICIAL" : "UNAVAILABLE"}
          </p>
        </div>

        {/* Exposed Population */}
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-2">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Exposed Population</p>
          <p className="mt-0.5 font-bold text-[#1e3a4a]">
            {assessment.exposedPopulationEstimate !== null
              ? assessment.exposedPopulationEstimate.toLocaleString("en-IN")
              : "UNAVAILABLE"}
          </p>
          <div className="mt-0.5">
            <ExposureMethodBadge method={assessment.exposureMethod} />
          </div>
          {assessment.exposureAssumption && (
            <p className="mt-0.5 text-[8px] italic text-[#94a3b8]">
              {assessment.exposureAssumption.split(".")[0]}
            </p>
          )}
        </div>

        {/* Available Capacity */}
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-2">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Verified Capacity</p>
          <p className="mt-0.5 font-bold text-[#1e3a4a]">
            {assessment.availableCapacity !== null
              ? assessment.availableCapacity.toLocaleString("en-IN")
              : "UNAVAILABLE"}
          </p>
          <p className="text-[8px] text-[#64748b]">
            {assessment.nearbyFacilities.length} nearby support facilities
          </p>
        </div>

        {/* Capacity Deficit */}
        <div className="rounded-lg border border-[#e2e8f0] bg-white p-2">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Capacity Deficit</p>
          <p
            className={cn(
              "mt-0.5 font-bold",
              assessment.capacityDeficit !== null && assessment.capacityDeficit > 0
                ? "text-[#b91c1c]"
                : "text-[#64748b]"
            )}
          >
            {isCapacityUnavailable
              ? "UNAVAILABLE"
              : assessment.capacityDeficit !== null && assessment.capacityDeficit > 0
              ? `${assessment.capacityDeficit.toLocaleString("en-IN")} persons`
              : "No confirmed deficit"}
          </p>
          <p className="text-[8px] text-[#94a3b8]">
            Status: {assessment.capacityStatus.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      {/* Screening fallback warning */}
      {isScreeningFallback && (
        <div className="rounded-lg border border-[#fde68a] bg-[#fffbeb] p-2 text-[9px] text-[#92400e]">
          <p className="font-semibold text-[#b45309]">⚠ Screening Assumption — Spatial Data Unavailable</p>
          <p className="mt-0.5">
            Habitation-level population data is not available for this district. A district-level
            screening rate has been applied as a planning fallback. This is DERIVED, not measured.
            Population exposure may be significantly over- or under-estimated.
          </p>
        </div>
      )}

      {isCapacityUnavailable && (
        <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2 text-[9px] text-[#64748b]">
          <p className="font-semibold text-[#475569]">Capacity Assessment Note:</p>
          <p className="mt-0.5">
            Facility locations are known, but verified evacuation capacity data is not available from the current source. Missing capacity is treated as uncertainty, not as a confirmed deficit.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Habitations Section (Phase 3.4 New) ─────────────────────────────────────

function HabitationsSection({ assessment }: { assessment: CarryingCapacityAssessment }) {
  const [expanded, setExpanded] = useState(false);
  const summary = assessment.habitationSummary;
  if (!summary || summary.totalHabitations === 0) return null;

  const hasExposed = summary.exposedHabitations > 0;

  return (
    <div className="rounded-xl border border-[#e0e7ff] bg-white p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Home className="h-3.5 w-3.5 text-[#4338ca]" />
          <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#4338ca]">
            Habitation-Level Exposure
          </p>
          <span className={cn(
            "rounded px-1.5 py-0.5 text-[8px] font-bold",
            hasExposed ? "bg-[#fef2f2] text-[#b91c1c]" : "bg-[#f8fafc] text-[#64748b]"
          )}>
            {summary.exposedHabitations} exposed
          </span>
        </div>
        <ChevronDown className={cn("h-3 w-3 text-[#94a3b8] transition-transform", expanded && "rotate-180")} />
      </button>

      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
        {([
          { label: "Total", val: summary.totalHabitations, color: "text-[#1e3a4a]" },
          { label: "Exposed", val: summary.exposedHabitations, color: hasExposed ? "text-[#b91c1c]" : "text-[#64748b]" },
          { label: "Partial", val: summary.partiallyExposedHabitations, color: "text-[#b45309]" },
          { label: "Unknown", val: summary.unknownHabitations, color: "text-[#64748b]" },
        ] as const).map(({ label, val, color }) => (
          <div key={label} className="rounded bg-[#f8fafc] p-1.5">
            <p className="text-[8px] text-[#94a3b8]">{label}</p>
            <p className={cn("text-xs font-bold", color)}>{val}</p>
          </div>
        ))}
      </div>

      {summary.summedExposedPopulation !== null ? (
        <div className="mt-2 rounded-lg border border-[#c7d2fe] bg-[#f5f3ff] p-2">
          <p className="text-[8px] font-bold uppercase text-[#4338ca]">Habitation Sum Exposed Population</p>
          <p className="mt-0.5 text-sm font-bold text-[#312e81]">
            {summary.summedExposedPopulation.toLocaleString("en-IN")}
            <span className="ml-1 text-[9px] font-normal text-[#6366f1]">persons</span>
          </p>
          <p className="mt-0.5 text-[8px] italic text-[#6366f1]">
            {summary.unknownPopulationCount > 0
              ? `Lower bound — ${summary.unknownPopulationCount} settlement(s) have unverified population (excluded)`
              : "All exposed settlements have verified Census 2011 population"}
          </p>
        </div>
      ) : hasExposed ? (
        <div className="mt-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2 text-[9px] text-[#64748b]">
          Exposed settlements identified but none have verified Census population.
          Population exposure confirmed; magnitude unknown.
        </div>
      ) : null}

      {expanded && summary.habitationDetails.filter(d => d.exposureStatus !== "NOT_EXPOSED").length > 0 && (
        <div className="mt-2 space-y-1">
          {summary.habitationDetails
            .filter(d => d.exposureStatus !== "NOT_EXPOSED")
            .map((d) => (
              <div key={d.id} className="flex items-start justify-between rounded border border-[#e2e8f0] bg-white px-2 py-1.5 text-[9px]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#1e3a4a]">{d.name}</p>
                  <p className="text-[8px] text-[#64748b]">{d.district}</p>
                </div>
                <div className="ml-2 flex flex-col items-end gap-0.5">
                  <span className={cn(
                    "rounded px-1 py-0.5 text-[8px] font-bold",
                    d.exposureStatus === "EXPOSED"
                      ? "bg-[#fef2f2] text-[#b91c1c]"
                      : d.exposureStatus === "PARTIALLY_EXPOSED"
                      ? "bg-[#fffbeb] text-[#b45309]"
                      : "bg-[#f8fafc] text-[#94a3b8]"
                  )}>
                    {d.exposureStatus.replace(/_/g, " ")}
                  </span>
                  <span className="text-[8px] text-[#64748b]">
                    {d.population !== null ? d.population.toLocaleString("en-IN") + " persons" : "pop: null"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="mt-2 text-[8px] italic text-[#94a3b8]">
        {summary.dataAvailabilityNote}
      </p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export interface PS191DecisionPanelProps {
  districtId: string;
  districtName: string;
  classification: "RED" | "ORANGE" | "GREEN" | "UNAVAILABLE";
  stateCode?: string;
  onClose?: () => void;
}

export function PS191DecisionPanel({
  districtId,
  districtName,
  classification,
  stateCode,
  onClose,
}: PS191DecisionPanelProps) {
  const [showLimitations, setShowLimitations] = useState(false);
  const [showFacilities, setShowFacilities] = useState(true);

  const capacityQuery = trpc.diva.hazards.capacity.useQuery(
    { districtId, stateCode, radiusKm: 30 },
    { staleTime: 5 * 60_000, retry: 1 }
  );

  const relocationQuery = trpc.diva.hazards.relocation.useQuery(
    { districtId, stateCode, radiusKm: 30 },
    { staleTime: 5 * 60_000, retry: 1 }
  );

  const assessment = capacityQuery.data;
  const recommendation = relocationQuery.data;
  const isLoading = capacityQuery.isLoading || relocationQuery.isLoading;

  return (
    <div
      data-testid="ps191-decision-panel"
      className="overflow-hidden rounded-2xl border border-[#c7d2fe] bg-[#f8f9ff] shadow-[0_16px_38px_rgba(22,55,120,0.1)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-[#e0e7ff] bg-white p-3.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#4338ca]">
            PS191 CARRYING CAPACITY + RELOCATION
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-[#1e1b4b]">{districtName}</h3>
          <div className="mt-1.5 flex items-center gap-2">
            <ClassificationBadge classification={classification} />
            {recommendation && (
              <PriorityBadge level={recommendation.priorityLevel} />
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close PS191 panel"
            className="rounded-lg p-1.5 text-[#64748b] hover:bg-[#f1f5f9]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="p-3.5 space-y-3">
        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-[#64748b]">
            <Loader2 className="h-4 w-4 animate-spin text-[#4338ca]" />
            Discovering facilities and computing capacity…
          </div>
        )}

        {/* Error */}
        {(capacityQuery.isError || relocationQuery.isError) && !isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-[#fca5a5] bg-[#fef2f2] p-3 text-[11px] text-[#b91c1c]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Capacity assessment temporarily unavailable. Hazard classification above remains valid.
          </div>
        )}

        {/* Main content */}
        {assessment && recommendation && (
          <>
            {/* Capacity section */}
            <CapacitySection assessment={assessment} />

            {/* Habitations section (Phase 3.4) */}
            <HabitationsSection assessment={assessment} />

            {/* Facilities */}
            <div>
              <button
                onClick={() => setShowFacilities((v) => !v)}
                className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]"
                aria-expanded={showFacilities}
              >
                <span>
                  Nearby facilities ({assessment.nearbyFacilities.length})
                  {" · "}
                  <span className="font-normal normal-case">
                    {assessment.searchRadiusKm} km radius · capacity = null (OSM)
                  </span>
                </span>
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", showFacilities && "rotate-180")}
                />
              </button>

              {showFacilities && (
                <div className="mt-2 space-y-1.5">
                  {assessment.nearbyFacilities.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#e2e8f0] bg-white p-3 text-center text-[10px] text-[#94a3b8]">
                      No facilities discovered within {assessment.searchRadiusKm} km.
                      OSM coverage varies significantly across states.
                    </div>
                  ) : (
                    assessment.nearbyFacilities.slice(0, 5).map((f) => (
                      <FacilityRow key={f.facilityId} facility={f} />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Candidate destination */}
            {recommendation.candidateStatus === "PREFERRED_CANDIDATE" && recommendation.candidateDestination ? (
              <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#15803d]">
                  Best screened candidate
                </p>
                <p className="mt-1 text-xs font-bold text-[#14532d]">
                  {recommendation.candidateDestination}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[9px] text-[#166534]">
                  {recommendation.distanceKm !== null && (
                    <span className="flex items-center gap-1 font-semibold">
                      <Ruler className="h-2.5 w-2.5" />
                      {recommendation.distanceType === "ROAD_NETWORK"
                        ? `${recommendation.distanceKm} km (ROAD_NETWORK${recommendation.travelTimeMinutes != null ? ` · ~${recommendation.travelTimeMinutes} mins` : ""})`
                        : `${recommendation.distanceKm.toFixed(1)} km (STRAIGHT_LINE_PROXY — NOT road distance)`}
                    </span>
                  )}
                  {recommendation.destinationHazardStatus && (
                    <SuitabilityTag suitability={recommendation.destinationHazardStatus} />
                  )}
                </div>
                <p className="mt-1 text-[9px] italic text-[#4ade80]">
                  Destination capacity: UNAVAILABLE · Subject to field verification
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#fed7aa] bg-[#fffaf5] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#c2410c]">
                  No preferred candidate identified
                </p>
                <p className="mt-1 text-[11px] text-[#7c2d12]">
                  No preferred relocation candidate was identified within the current search radius.
                </p>
              </div>
            )}

            {/* Conditional alternatives */}
            {recommendation.conditionalAlternatives && recommendation.conditionalAlternatives.length > 0 && (
              <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b45309]">
                  Conditional alternatives (Field verification required)
                </p>
                <div className="mt-2 space-y-1.5">
                  {recommendation.conditionalAlternatives.slice(0, 3).map((f) => (
                    <FacilityRow key={f.facilityId} facility={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Facilities with hazard conflict */}
            {recommendation.facilitiesWithHazardConflict && recommendation.facilitiesWithHazardConflict.length > 0 && (
              <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#b91c1c]">
                  Facilities with hazard conflict (Unsuitable)
                </p>
                <p className="mt-0.5 text-[9px] text-[#991b1b]">
                  Located in high-risk zones. Shown for situational awareness only; not recommended as relocation destinations.
                </p>
                <div className="mt-2 space-y-1.5">
                  {recommendation.facilitiesWithHazardConflict.slice(0, 3).map((f) => (
                    <FacilityRow key={f.facilityId} facility={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Priority + reason codes */}
            <div className="rounded-xl border border-[#e0e7ff] bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#4338ca]">
                    Relocation priority
                  </p>
                  <p className="text-[8px] text-[#64748b]">
                    Confidence: <span className="font-semibold">{recommendation.priorityConfidence}</span>
                  </p>
                </div>
                <PriorityBadge level={recommendation.priorityLevel} />
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-[#334155]">
                {recommendation.explanation}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {recommendation.reasonCodes.map((code) => (
                  <ReasonCodeTag key={code} code={code} />
                ))}
              </div>
              <div className="mt-2.5 rounded-lg bg-[#f8fafc] p-2 text-[9px] text-[#475569]">
                <div className="flex items-center justify-between font-bold text-[#1e3a4a]">
                  <span>Deterministic Score Breakdown:</span>
                  <span>Total: {recommendation.scoreBreakdown.total}/100</span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1 text-[9px]">
                  <div>Hazard severity: <span className="font-semibold">{recommendation.scoreBreakdown.hazardSeverity}</span>/30</div>
                  <div>Population exposure: <span className="font-semibold">{recommendation.scoreBreakdown.populationExposure}</span>/20</div>
                  <div>Vulnerability: <span className="font-semibold">{recommendation.scoreBreakdown.vulnerability}</span>/20</div>
                  <div>Capacity deficit: <span className="font-semibold">{recommendation.scoreBreakdown.capacityDeficit}</span>/15</div>
                  <div>Accessibility: <span className="font-semibold">{recommendation.scoreBreakdown.accessibility}</span>/15</div>
                </div>
                <p className="mt-1.5 border-t border-[#e2e8f0] pt-1 italic text-[#94a3b8]">
                  Model: {recommendation.modelLabel} · Not AI prediction. Weights are transparent baseline defaults.
                </p>
              </div>
            </div>

            {/* Data quality */}
            <div className="rounded-lg border border-[#e2e8f0] bg-white p-2.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#64748b]">
                <Info className="h-3 w-3" />
                Data quality: {assessment.confidence}
              </div>
              <button
                onClick={() => setShowLimitations((v) => !v)}
                className="mt-1 flex w-full items-center justify-between text-[9px] text-[#94a3b8] hover:text-[#64748b]"
                aria-expanded={showLimitations}
              >
                <span>View limitations ({assessment.limitations.length})</span>
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", showLimitations && "rotate-180")}
                />
              </button>
              {showLimitations && (
                <ul className="mt-1.5 list-disc space-y-1 pl-3.5 text-[9px] leading-relaxed text-[#64748b]">
                  {assessment.limitations.map((lim, i) => (
                    <li key={i}>{lim}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Provenance */}
            <p className="text-[8px] leading-relaxed text-[#94a3b8]">
              {assessment.provenance}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Compact inline version for map popup ────────────────────────────────────

export function PS191CapacityInline({
  districtId,
  stateCode,
}: {
  districtId: string;
  stateCode?: string;
}) {
  const capacityQuery = trpc.diva.hazards.capacity.useQuery(
    { districtId, stateCode, radiusKm: 30 },
    { staleTime: 5 * 60_000, retry: 0 }
  );
  const relocationQuery = trpc.diva.hazards.relocation.useQuery(
    { districtId, stateCode, radiusKm: 30 },
    { staleTime: 5 * 60_000, retry: 0 }
  );

  if (capacityQuery.isLoading || relocationQuery.isLoading) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-[#64748b]">
        <Loader2 className="h-3 w-3 animate-spin" /> Computing capacity…
      </div>
    );
  }

  const assessment = capacityQuery.data;
  const recommendation = relocationQuery.data;
  if (!assessment || !recommendation) return null;

  return (
    <div data-testid="ps191-capacity-inline" className="mt-2 space-y-1.5 text-[10px]">
      <div className="grid grid-cols-2 gap-1">
        <div className="rounded bg-[#f8fafc] p-1.5">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Population</p>
          <p className="font-bold text-[#1e293b]">
            {assessment.population?.toLocaleString("en-IN") ?? "UNAVAILABLE"}
          </p>
        </div>
        <div className="rounded bg-[#f8fafc] p-1.5">
          <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Relocation priority</p>
          <p className={cn("font-bold", recommendation.priorityLevel === "HIGH" ? "text-[#b91c1c]" : recommendation.priorityLevel === "MEDIUM" ? "text-[#c2410c]" : "text-[#15803d]")}>
            {recommendation.priorityLevel}
          </p>
        </div>
      </div>
      <div className="rounded bg-[#f8fafc] p-1.5">
        <p className="text-[8px] font-bold uppercase text-[#94a3b8]">Nearest facility</p>
        <p className="font-semibold text-[#1e293b]">
          {assessment.nearbyFacilities[0]?.name ?? "None discovered"}
          {assessment.nearbyFacilities[0] && (
            <span className="ml-1 font-normal text-[#64748b]">
              ({assessment.nearbyFacilities[0].straightLineDistanceKm.toFixed(1)} km STRAIGHT_LINE)
            </span>
          )}
        </p>
      </div>
      <p className="text-[8px] italic text-[#94a3b8]">
        BASELINE PS191 PRIORITY MODEL · Score {recommendation.priorityScore}/100 · Not AI
      </p>
    </div>
  );
}
