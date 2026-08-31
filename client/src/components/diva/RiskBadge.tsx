import { cn } from "@/lib/utils";
import type { RelocationPriority, RiskLevel } from "@shared/diva";

const tones: Record<RiskLevel | RelocationPriority, string> = {
  Critical: "bg-[#fce8e8] text-[#9d2529] ring-[#efb4b6]",
  High: "bg-[#fff0e6] text-[#b64b12] ring-[#f3c49f]",
  Moderate: "bg-[#fff8df] text-[#8b6510] ring-[#ead696]",
  Low: "bg-[#e8f5ed] text-[#236c49] ring-[#aad7bc]",
  Immediate: "bg-[#fce8e8] text-[#9d2529] ring-[#efb4b6]",
};

export function RiskBadge({ level, className }: { level: RiskLevel | RelocationPriority; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] ring-1", tones[level], className)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{level}</span>;
}
