import type { IndiaLocationContext } from "@shared/india";
import { cn } from "@/lib/utils";

export function SelectedLocationInfrastructure({ context }: { context: IndiaLocationContext }) {
  const sample = context.infrastructure.items.slice(0, 9);
  const hasFacilities = context.infrastructure.items.length > 0;

  return (
    <section data-testid="selected-location-infrastructure" className="mt-3 rounded-2xl border border-[#cfe3e7] bg-white p-3.5 shadow-[0_10px_24px_rgba(28,55,70,.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#1d788d]">Nearby Mapped Infrastructure</p>
          <p className="mt-1 text-xs font-bold text-[#294d60]">
            {hasFacilities ? `${context.infrastructure.items.length} verified facility records returned` : "Facilities: Unavailable"}
          </p>
        </div>
        <span className={cn(
          "rounded-full px-2 py-1 text-[9px] font-bold",
          hasFacilities ? "bg-[#edf7f8] text-[#1d7084]" : "bg-slate-100 text-slate-700"
        )}>
          {hasFacilities ? "LIVE OSM FACILITY SAMPLE" : "UNAVAILABLE"}
        </span>
      </div>

      {hasFacilities ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sample.map(item => (
            <div key={item.id} className="rounded-lg bg-[#f4f9fa] p-2 border border-[#e1eff2]">
              <p className="truncate text-[11px] font-semibold text-[#315669]">{item.name}</p>
              <p className="mt-0.5 text-[9px] text-[#718892] capitalize">{item.type.replace(/_/g, " ")}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[10.5px] text-slate-600 space-y-1">
          <p><strong>Reason:</strong> No verified facility records returned for this location extent.</p>
          <p><strong>Source:</strong> OpenStreetMap / Overpass API</p>
          <p className="text-[9.5px] text-slate-500 italic">Notice: We could not verify facility data for this coordinate radius. This is not evidence that facilities are physically absent.</p>
          {context.infrastructure.observedAt && (
            <p className="text-[9px] text-slate-400">Last checked: {new Date(context.infrastructure.observedAt).toLocaleString("en-IN")}</p>
          )}
        </div>
      )}

      <p className="mt-3 text-[9px] leading-relaxed text-[#718892]">
        {context.infrastructure.source}
        {context.infrastructure.observedAt ? ` Updated ${new Date(context.infrastructure.observedAt).toLocaleString("en-IN")}.` : ""}
      </p>
    </section>
  );
}
