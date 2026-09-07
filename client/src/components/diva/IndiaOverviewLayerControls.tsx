import React from "react";
import { Switch } from "@/components/ui/switch";
import { auditedLayerGroups } from "./nationwideLayerConfig";

export function IndiaOverviewLayerControls({ layers, onChange }: { layers: Record<string, boolean>; onChange: (id: string, enabled: boolean) => void }) {
  return (
    <div data-testid="india-overview-layer-controls">
      {auditedLayerGroups.map((group, groupIdx) => (
        <div key={group.label} className={groupIdx > 0 ? "pt-2.5 mt-2.5 border-t border-[#e7edef]" : ""}>
          <div className="mb-1.5 font-bold text-[9.5px] text-[#718894] uppercase tracking-[0.12em]">
            {group.label}
          </div>
          {group.items.map(([id, label]) => (
            <label key={id} className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-xs text-[#4c6472] hover:text-[#193d53]">
              <span className="truncate pr-2">{label}</span>
              <Switch checked={Boolean(layers[id])} onCheckedChange={enabled => onChange(id, enabled)} aria-label={`Toggle ${label}`} />
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}


