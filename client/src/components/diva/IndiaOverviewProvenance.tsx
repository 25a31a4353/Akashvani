import React, { useState } from "react";

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
        className="flex items-center gap-1.5 rounded-lg border border-[#334155] bg-[#0f172a]/90 px-2.5 py-1.5 text-[10px] font-medium text-[#cbd5e1] shadow-lg backdrop-blur transition hover:border-[#475569] hover:bg-[#1e293b] hover:text-white"
        title="View data provenance and sources"
      >
        <span className="text-[#38bdf8]">ⓘ</span>
        <span>Data provenance</span>
        <span className="text-[9px] text-[#94a3b8]">{isOpen ? "▲" : "▾"}</span>
      </button>

      {/* Compact expanded card */}
      {isOpen && (
        <div
          data-testid="data-provenance-panel"
          className="absolute bottom-9 right-0 w-[300px] rounded-xl border border-[#334155] bg-[#0f172a]/95 p-3 text-[9.5px] leading-relaxed text-[#94a3b8] shadow-2xl backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between border-b border-[#1e293b] pb-1.5">
            <span className="font-semibold uppercase tracking-wider text-[#38bdf8]">
              India layer provenance
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-0.5 text-xs text-[#64748b] hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5">
            <p>
              <b className="text-[#e2e8f0]">States:</b> {statuses.states}
            </p>
            <p>
              <b className="text-[#e2e8f0]">Population:</b> WorldPop 1 km density raster; people/km²; reference years 2000–2020, not state totals.
            </p>
            <p>
              <b className="text-[#e2e8f0]">Terrain:</b> {statuses.terrain} · Esri World Elevation Terrain image service.
            </p>
            <p>
              <b className="text-[#e2e8f0]">Geology:</b> {statuses.geology}
            </p>
            <p>
              <b className="text-[#e2e8f0]">Weather & wind:</b> {statuses.weather}
            </p>
            <p>
              <b className="text-[#e2e8f0]">Sensitivity:</b> {statuses.sensitivity}
            </p>
            {sources.sensitivity && (
              <p className="text-[8.5px] text-[#64748b]">
                <b>Source:</b> {sources.sensitivity}
              </p>
            )}
            <p className="border-t border-[#1e293b] pt-1 text-[8.5px] text-[#64748b]">
              <b>Retrieved:</b> {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
