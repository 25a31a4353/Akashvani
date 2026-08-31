import React from "react";
import { ExternalLink, History, Info } from "lucide-react";

const ASDMA_REPORTS = "https://asdma.assam.gov.in/documents/reports-0";
const ASSAM_WATER_RESOURCES = "https://waterresources.assam.gov.in/portlets/flood-erosion-problems";

type AssamDisasterRecord = {
  year: number;
  event: string;
  geography: string;
  detail: string;
  status: "Source directory" | "Context source";
};

const records: AssamDisasterRecord[] = [
  { year: 2016, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2017, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2018, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2019, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2020, event: "Flood, flash-flood, and landslide season", geography: "Multiple districts", detail: "ASDMA annual and event reports are the source of record; this view does not substitute unverified counts.", status: "Source directory" },
  { year: 2021, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2022, event: "Severe flood season", geography: "Multiple districts", detail: "ASDMA annual and event reports are the source of record; this view does not substitute unverified counts.", status: "Source directory" },
  { year: 2023, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
  { year: 2024, event: "Major flood and erosion season", geography: "Multiple districts", detail: "ASDMA annual and event reports are the source of record; this view does not substitute unverified counts.", status: "Source directory" },
  { year: 2025, event: "Monsoon flood and river-bank erosion", geography: "Statewide seasonal context", detail: "Year-specific impacts require the corresponding ASDMA report to be normalized.", status: "Source directory" },
];

export function AssamDisasterHistory() {
  return (
    <section data-testid="assam-disaster-history" className="mt-4 rounded-2xl border border-[#dbe6e9] bg-white p-4 shadow-[0_12px_30px_rgba(28,55,70,0.04)] sm:p-5">
      <div className="flex flex-col gap-3 border-b border-[#edf1f2] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#eaf4f5] text-[#20778b]"><History className="h-4 w-4" /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1d7084]">Assam disaster history</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight text-[#284b60]">Ten-year evidence window · 2016–2025</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#71838c]">The official Assam context identifies recurrent flood and erosion exposure. Year-specific casualty, affected-population, damage, and district fields are shown only when normalized from the source report.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <a href={ASDMA_REPORTS} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7e5e8] px-2.5 py-2 text-[10px] font-semibold text-[#2b6578] hover:bg-[#f4fafb]">ASDMA reports <ExternalLink className="h-3 w-3" /></a>
          <a href={ASSAM_WATER_RESOURCES} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7e5e8] px-2.5 py-2 text-[10px] font-semibold text-[#2b6578] hover:bg-[#f4fafb]">Flood context <ExternalLink className="h-3 w-3" /></a>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead><tr className="border-b border-[#edf1f2] text-[9px] font-bold uppercase tracking-[0.1em] text-[#82959d]"><th className="px-2 py-2">Year</th><th className="px-2 py-2">Recorded hazard context</th><th className="px-2 py-2">Geography</th><th className="px-2 py-2">Impact detail status</th><th className="px-2 py-2">Source status</th></tr></thead>
          <tbody>{records.map(record => <tr key={record.year} className="border-b border-[#f0f3f4] text-xs last:border-0"><td className="px-2 py-3 font-bold text-[#31596c]">{record.year}</td><td className="px-2 py-3 font-semibold text-[#486574]">{record.event}</td><td className="px-2 py-3 text-[#657b85]">{record.geography}</td><td className="px-2 py-3 text-[#657b85]">{record.detail}</td><td className="px-2 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-[#eef7f4] px-2 py-1 text-[9px] font-bold text-[#28715f]"><Info className="h-3 w-3" />{record.status}</span></td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-[#7a8d95]">Coverage note: the Assam Government Water Resources page reports 39.58% of state area as flood-prone and an average annual flood-affected area of 9.31 lakh hectares. Those long-run context values are not a substitute for event-specific annual impact totals. This panel is not an official warning or forecast.</p>
    </section>
  );
}
