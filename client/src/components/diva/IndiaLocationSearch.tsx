import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import type { IndiaLocation } from "@shared/india";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function IndiaLocationSearch({ onSelect, tone = "light" }: { onSelect: (location: IndiaLocation) => void; tone?: "light" | "dark" }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = trpc.diva.india.search.useQuery(
    { query },
    { enabled: query.trim().length >= 2, staleTime: 15 * 60 * 1000 }
  );

  const dark = tone === "dark";
  const items = results.data ?? [];

  useEffect(() => {
    setIsOpen(query.trim().length >= 2);
    setActiveIndex(-1);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item: IndiaLocation) => {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || items.length === 0) {
      if (e.key === "ArrowDown" && query.trim().length >= 2) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = activeIndex >= 0 && activeIndex < items.length ? items[activeIndex] : items[0];
      if (selected) {
        handleSelect(selected);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative z-30 w-full">
      <Search
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          dark ? "text-[#8faab1]" : "text-[#6f8791]"
        }`}
      />
      <Input
        ref={inputRef}
        data-testid="india-location-search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        onFocus={() => {
          if (query.trim().length >= 2) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search India: state, city, district, locality"
        className={
          dark
            ? "h-10 rounded-xl border-[#3c5964] bg-[#0c2029]/95 pl-9 pr-16 text-sm text-[#e7f5f6] shadow-2xl placeholder:text-[#8ca4ab] focus-visible:ring-[#66be83]"
            : "h-10 rounded-xl border-[#cfe0e4] bg-white pl-9 pr-16 text-sm shadow-sm focus-visible:ring-[#31879b]"
        }
        aria-label="Search Indian locations"
      />
      <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {results.isFetching && (
          <Loader2 className={`h-4 w-4 animate-spin ${dark ? "text-[#78ca83]" : "text-[#328397]"}`} />
        )}
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className={`rounded p-0.5 ${dark ? "text-[#8faab1] hover:text-white" : "text-[#6f8791] hover:text-black"}`}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div
          data-testid="india-location-results"
          className={`absolute top-11 max-h-[380px] w-full overflow-y-auto rounded-xl p-1.5 shadow-2xl ${
            dark ? "border border-[#3c5964] bg-[#0b1d26]" : "border border-[#d7e4e7] bg-white"
          }`}
        >
          {results.isLoading ? (
            <p className={`px-3 py-3 text-xs ${dark ? "text-[#9eb4ba]" : "text-[#6f8490]"}`}>Searching India…</p>
          ) : items.length ? (
            items.map((item, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  data-testid="india-location-result"
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? dark
                        ? "bg-[#18404a] text-white"
                        : "bg-[#e2f1f4] text-[#134958]"
                      : dark
                      ? "hover:bg-[#15333d]"
                      : "hover:bg-[#edf7f8]"
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                      dark ? "bg-[#173b39] text-[#79cf87]" : "bg-[#e9f5f6] text-[#1e778a]"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs font-bold ${
                        dark ? "text-[#e6f6f1]" : "text-[#274d60]"
                      }`}
                    >
                      {item.name}
                    </span>
                    <span
                      className={`block truncate text-[10px] ${
                        dark ? "text-[#91aab1]" : "text-[#718690]"
                      }`}
                    >
                      {item.category} · {item.displayName}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className={`px-3 py-3 text-xs ${dark ? "text-[#9eb4ba]" : "text-[#6f8490]"}`}>
              No matching Indian location was found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
