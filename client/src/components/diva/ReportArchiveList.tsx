import { Download, FileText } from "lucide-react";
import React from "react";

export type PersistedPdfArchiveEntry = { id: string; title: string; createdAt: Date | string; kind: "ASSESSMENT" | "HISTORICAL"; storageUrl: string; riskLevel: string | null };

export function ReportArchiveList({ reports }: { reports: PersistedPdfArchiveEntry[] }) {
  if (!reports.length) return <div data-testid="reports-pdf-archive" className="rounded-xl border border-dashed border-[#d5e4e8] bg-[#f8fbfc] px-4 py-7 text-center"><FileText className="mx-auto h-5 w-5 text-[#8ba2ad]" /><p className="mt-2 text-xs font-semibold text-[#4f6c7c]">No persisted PDFs yet</p><p className="mt-1 text-[10px] text-[#82919a]">New assessment and historical reports appear here after object-storage persistence.</p></div>;
  return <div data-testid="reports-pdf-archive" className="divide-y divide-[#e7eef0] overflow-hidden rounded-xl border border-[#d9e6e9] bg-[#fbfdfd]">{reports.map(report => <div key={report.id} data-testid={`report-${report.kind.toLowerCase()}-${report.id}`} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"><div><p className="text-xs font-semibold text-[#294c60]">{report.title}</p><p className="mt-0.5 text-[9px] text-[#7c8d96]">{report.kind === "HISTORICAL" ? "Historical validation PDF" : `Assessment PDF · ${report.riskLevel ?? "risk not recorded"}`} · {new Date(report.createdAt).toLocaleString()}</p></div><a data-testid={`download-${report.id}`} href={report.storageUrl} target="_blank" rel="noreferrer" className="inline-flex h-7 items-center rounded-md border border-[#d5e4e7] bg-white px-2 text-[10px] font-bold text-[#2b647b]"><Download className="mr-1 h-3 w-3" />PDF</a></div>)}</div>;
}
