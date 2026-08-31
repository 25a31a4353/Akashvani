import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, detail, icon: Icon, accent = "blue" }: { label: string; value: string; detail: string; icon: LucideIcon; accent?: "blue" | "red" | "orange" | "teal" }) {
  const colors = {
    blue: "bg-[#e7f1f7] text-[#166181]",
    red: "bg-[#fceced] text-[#b63139]",
    orange: "bg-[#fff2e8] text-[#bd5d1f]",
    teal: "bg-[#e5f4f2] text-[#207266]",
  };
  return <div className="rounded-xl border border-[#e3e9ed] bg-white p-3 shadow-[0_8px_18px_rgba(28,55,70,0.04)]">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold text-[#738390]">{label}</p><p className="mt-1.5 text-xl font-bold tracking-tight text-[#173347]">{value}</p></div>
      <span className={cn("grid h-8 w-8 place-items-center rounded-lg", colors[accent])}><Icon className="h-4 w-4" /></span>
    </div>
    <p className="mt-1.5 text-[10px] leading-relaxed text-[#71808b]">{detail}</p>
  </div>;
}
