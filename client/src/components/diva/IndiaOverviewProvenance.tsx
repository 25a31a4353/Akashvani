import React, { useState } from "react";
import { DATA_SOURCE_AUDIT_LIST, type DataSourceRecord } from "@shared/sourceRegistry";

interface ProvenanceCardProps {
  category: string;
  source: string;
  type: string;
  status: "AVAILABLE" | "LIVE" | "UNAVAILABLE" | "MODELLED" | "OFFICIAL";
  resolution?: string;
  year?: string;
  unit?: string;
  reasonIfUnavailable?: string;
  note?: string;
  testId?: string;
}

function ProvenanceCard({
  category,
  source,
  type,
  status,
  resolution,
  year,
  unit,
  reasonIfUnavailable,
  note,
  testId,
}: ProvenanceCardProps) {
  const statusColor =
    status === "LIVE"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
      : status === "AVAILABLE"
      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
      : status === "UNAVAILABLE"
      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
      : "bg-amber-500/20 text-amber-300 border-amber-500/40";

  return (
    <div
      data-testid={testId}
      className="rounded-lg border border-[#233549] bg-[#0c1824]/90 p-2 text-[9px] shadow-sm backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-[#1b2b3c] pb-1">
        <span className="font-bold uppercase tracking-wider text-[#38bdf8]">{category}</span>
        <span className={`rounded border px-1.5 py-0.2 text-[8px] font-bold ${statusColor}`}>
          {status}
        </span>
      </div>
      <div className="mt-1 space-y-0.5 text-[#94a3b8]">
        <p className="font-medium text-[#e2e8f0]">{source}</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-[8.5px]">
          {resolution && (
            <div>
              <span className="text-[#64748b]">Resolution: </span>
              <span className="text-[#cbd5e1]">{resolution}</span>
            </div>
          )}
          {year && (
            <div>
              <span className="text-[#64748b]">Year: </span>
              <span className="text-[#cbd5e1]">{year}</span>
            </div>
          )}
          {unit && (
            <div>
              <span className="text-[#64748b]">Unit: </span>
              <span className="text-[#cbd5e1]">{unit}</span>
            </div>
          )}
          <div>
            <span className="text-[#64748b]">Type: </span>
            <span className="font-semibold text-[#7dd3fc]">{type}</span>
          </div>
        </div>
        {reasonIfUnavailable && (
          <p className="rounded bg-rose-950/40 p-1 text-[8px] text-rose-300 border border-rose-900/50">
            {reasonIfUnavailable}
          </p>
        )}
        {note && <p className="text-[8px] text-[#64748b] italic">{note}</p>}
      </div>
    </div>
  );
}

export function IndiaOverviewProvenance({
  sources,
  statuses,
  updatedAt,
  initialOpen = false,
}: {
  sources: Record<string, string>;
  statuses: Record<string, string>;
  updatedAt: string;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [activeTab, setActiveTab] = useState<"summary" | "audit">("summary");
  const [auditFilter, setAuditFilter] = useState<string>("ALL");

  const categories = ["ALL", ...Array.from(new Set(DATA_SOURCE_AUDIT_LIST.map((s) => s.category)))];
  const filteredAudit =
    auditFilter === "ALL"
      ? DATA_SOURCE_AUDIT_LIST
      : DATA_SOURCE_AUDIT_LIST.filter((s) => s.category === auditFilter);

  return (
    <div
      data-testid="india-layer-provenance"
      className="absolute bottom-12 right-4 z-20 hidden lg:block"
    >
      {/* Collapsed toggle button */}
      <button
        type="button"
        data-testid="data-provenance-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-[#334155] bg-[#07131e]/95 px-3 py-1.5 text-[11px] font-semibold text-[#cbd5e1] shadow-2xl backdrop-blur transition hover:border-[#38bdf8] hover:bg-[#0f1f2e] hover:text-white"
        title="View data provenance and sources"
      >
        <span className="flex h-2 w-2 rounded-full bg-[#38bdf8] animate-pulse" />
        <span className="text-[#38bdf8] font-bold">ResQ</span>
        <span>Data Provenance</span>
        <span className="rounded bg-[#1e293b] px-1 text-[9px] text-[#94a3b8]">{isOpen ? "▲" : "▾"}</span>
      </button>

      {/* Expanded structured provenance panel */}
      {isOpen && (
        <div
          data-testid="data-provenance-panel"
          className="absolute bottom-10 right-0 w-[420px] max-h-[82vh] overflow-y-auto rounded-2xl border border-[#233549] bg-[#07131e]/98 p-3 text-[9.5px] leading-relaxed text-[#94a3b8] shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b border-[#1b2b3c] pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="font-extrabold uppercase tracking-wider text-[#38bdf8]">
                  India layer provenance
                </span>
              </div>
              <p className="text-[8px] text-[#64748b]">
                Audited data sources & evidence coverage for decision support
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab((t) => (t === "summary" ? "audit" : "summary"))}
                className="rounded border border-[#334155] bg-[#102030] px-2 py-0.5 text-[8.5px] font-medium text-[#7dd3fc] hover:bg-[#1a2f45]"
              >
                {activeTab === "summary" ? "Full 22-Source Audit" : "Active Layers"}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-xs text-[#64748b] hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Evidence Coverage Transparent Bar */}
          <div className="mb-2.5 rounded-xl border border-[#1b3447] bg-[#0a1c2a] p-2">
            <div className="flex items-center justify-between text-[9px]">
              <span className="font-bold text-[#e2e8f0]">Evidence Coverage Score</span>
              <span className="font-black text-emerald-400">6 / 7 Categories Available</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#162736]">
              <div className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 w-[85%]" />
            </div>
            <p className="mt-1 text-[8px] text-[#64748b]">
              Transparent completeness: Boundaries, Census population, Copernicus DEM, IMD Weather, Hazard Matrix, OSRM road routes available. OSM facility capacity remains unverified until audited.
            </p>
          </div>

          {activeTab === "summary" ? (
            <div className="space-y-2">
              {/* States */}
              <ProvenanceCard
                category="States"
                source={sources.states ?? "geoBoundaries ADM1 (DataMeet India community / Election Commission of India)"}
                status="AVAILABLE"
                resolution="State administrative polygon"
                year="2011 / 2020"
                unit="WGS84 Boundary"
                type="OFFICIAL / REFERENCE"
                note={statuses.states ?? "NATIONWIDE REFERENCE BOUNDARIES"}
              />

              {/* Population */}
              <ProvenanceCard
                category="Population"
                source="Census of India 2011 (Habitation/District PCA) & WorldPop Global Population"
                status="AVAILABLE"
                resolution="Habitation point / District / 100m raster"
                year="2011 / 2020"
                unit="people (count) · people/km² (raster)"
                type="OFFICIAL & MODELLED"
                note="WorldPop 1 km density raster; people/km²; reference years 2000–2020, not state totals. Habitation Census counts preserved separately."
              />

              {/* Terrain */}
              <ProvenanceCard
                category="Terrain"
                source="Esri World Elevation Terrain image service & Copernicus Digital Elevation Model (GLO-90)"
                status="AVAILABLE"
                resolution="90m spatial grid"
                year="2015"
                unit="Meters MSL"
                type="REFERENCE"
                note={`${statuses.terrain ?? "NATIONWIDE TERRAIN REFERENCE"} · Esri World Elevation Terrain image service. Derived slope computed via 5-point finite-difference spatial gradient.`}
              />

              {/* Geology */}
              <ProvenanceCard
                category="Geology"
                source="Geological Survey of India (GSI) Bhukosh & NGDR Geoscientific Repository"
                status="UNAVAILABLE"
                type="OFFICIAL REFERENCE"
                reasonIfUnavailable={statuses.geology ?? "UNAVAILABLE — NO PROVISIONAL GEOLOGY GEOMETRY IS DISPLAYED"}
                note="Official GSI geological data exists, but no machine-readable vector geometry is currently integrated. No provisional geometry is fabricated."
              />

              {/* Weather & Wind */}
              <ProvenanceCard
                category="Weather & Wind"
                source="India Meteorological Department (IMD Mausam Nowcast & Warnings) + Open-Meteo NWP"
                status="LIVE"
                resolution="District (IMD) / 3km (NWP)"
                year="2026 (Live)"
                unit="°C, mm, km/h"
                type="OBSERVED & MODELLED"
                note={`${statuses.weather ?? "LIVE MODELLED WEATHER + WIND COVERAGE GRID"}. Official IMD warnings parsed in real-time; numerical fields blended from ECMWF/GFS.`}
              />

              {/* Sensitivity */}
              <ProvenanceCard
                category="Sensitivity"
                source={sources.sensitivity ?? "ResQ Analytical Screening Pipeline (CWC + ISRO Landslide Atlas + BIS IS 1893:2016)"}
                status="AVAILABLE"
                resolution="Regional screening envelope"
                year="2026"
                unit="0–100 Screening Index"
                type="DERIVED"
                note={`${statuses.sensitivity ?? "BROAD ANALYTICAL SENSITIVITY EXTENTS"} — Derived analytical screening. Not an official warning or observed event footprint.`}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1 border-b border-[#1b2b3c] pb-2">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAuditFilter(c)}
                    className={`rounded px-1.5 py-0.5 text-[8px] font-semibold transition ${
                      auditFilter === c
                        ? "bg-[#38bdf8] text-[#07131e]"
                        : "bg-[#102030] text-[#7dd3fc] hover:bg-[#1a2f45]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {filteredAudit.map((item: DataSourceRecord) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#1e2f42] bg-[#091522] p-2 text-[8.5px]"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="font-bold text-[#e2e8f0]">{item.name}</span>
                        <p className="text-[8px] text-[#38bdf8]">{item.provider}</p>
                      </div>
                      <span className="rounded bg-[#1e293b] px-1 py-0.5 text-[7.5px] font-bold text-[#94a3b8]">
                        {item.provenanceType}
                      </span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[8px] text-[#64748b]">
                      <div>Resolution: {item.spatialResolution ?? "—"}</div>
                      <div>Coverage: {item.temporalCoverage ?? "—"}</div>
                      <div>Frequency: {item.updateFrequency ?? "—"}</div>
                      <div>Units: {item.units ?? "—"}</div>
                    </div>
                    <p className="mt-1 text-[8px] text-[#cbd5e1]">{item.engineUsageDescription}</p>
                    {item.knownLimitations && (
                      <p className="mt-1 text-[7.5px] text-amber-300/80">
                        <b>Limitation:</b> {item.knownLimitations}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Timestamp */}
          <div className="mt-2.5 flex items-center justify-between border-t border-[#1b2b3c] pt-1.5 text-[8px] text-[#64748b]">
            <span>
              <b>Retrieved:</b>{" "}
              {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} IST
            </span>
            <span>ResQ Phase 3.4 Authoritative Data</span>
          </div>
        </div>
      )}
    </div>
  );
}
