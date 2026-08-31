import React from "react";
import { Switch } from "@/components/ui/switch";
import { nationwideLayerControls } from "./nationwideLayerConfig";

export function IndiaOverviewLayerControls({ layers, onChange }: { layers: Record<string, boolean>; onChange: (id: string, enabled: boolean) => void }) {
  return <div data-testid="india-overview-layer-controls">{nationwideLayerControls.map(([id, label]) => <label key={id} className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-xs text-[#4c6472]"><span>{label}</span><Switch checked={layers[id]} onCheckedChange={enabled => onChange(id, enabled)} aria-label={`Toggle ${label}`} /></label>)}</div>;
}
