import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageSelector({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const { language, setLanguage } = useLanguage();

  const isLight = tone === "light";

  return (
    <div
      data-testid="language-selector"
      className={cn(
        "flex items-center gap-1 rounded-xl border p-0.5 text-xs shadow-sm transition-all",
        isLight
          ? "border-[#d8e5e8] bg-white text-[#334e5e]"
          : "border-[#344d5a] bg-[#091b26]/95 text-[#cbd5e1] backdrop-blur-md",
        className
      )}
      aria-label="Language selection"
    >
      <Globe className={cn("h-3.5 w-3.5 ml-1 mr-0.5 shrink-0", isLight ? "text-[#1d7890]" : "text-cyan-400")} />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={cn(
          "px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all",
          language === "en"
            ? isLight
              ? "bg-[#1d7890] text-white shadow-sm"
              : "bg-cyan-600 text-white shadow-sm"
            : isLight
            ? "text-[#627783] hover:text-[#18394a] hover:bg-[#f0f5f7]"
            : "text-[#94a3b8] hover:text-white hover:bg-[#132c3c]"
        )}
        title="English"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("hi")}
        className={cn(
          "px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all",
          language === "hi"
            ? isLight
              ? "bg-[#1d7890] text-white shadow-sm"
              : "bg-cyan-600 text-white shadow-sm"
            : isLight
            ? "text-[#627783] hover:text-[#18394a] hover:bg-[#f0f5f7]"
            : "text-[#94a3b8] hover:text-white hover:bg-[#132c3c]"
        )}
        title="हिन्दी (Hindi)"
      >
        हिन्दी
      </button>
      <button
        type="button"
        onClick={() => setLanguage("te")}
        className={cn(
          "px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all",
          language === "te"
            ? isLight
              ? "bg-[#1d7890] text-white shadow-sm"
              : "bg-cyan-600 text-white shadow-sm"
            : isLight
            ? "text-[#627783] hover:text-[#18394a] hover:bg-[#f0f5f7]"
            : "text-[#94a3b8] hover:text-white hover:bg-[#132c3c]"
        )}
        title="తెలుగు (Telugu)"
      >
        తెలుగు
      </button>
    </div>
  );
}
