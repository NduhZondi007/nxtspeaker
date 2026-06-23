"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

export interface FilterState {
  search: string;
  expertise: string[];
  available: boolean | null;
  format: string;
  minFee: number;
  maxFee: number;
  sort: "fee_asc" | "fee_desc" | "rating_desc" | "events_desc";
}

const ALL_EXPERTISE = [
  "Leadership", "AI", "Digital Transformation", "Sustainability", "ESG",
  "Innovation", "Future of Work", "Neuroscience", "High Performance",
  "Strategy", "Entrepreneurship", "Change Management",
];

interface SpeakerFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function SpeakerFilters({ filters, onChange }: SpeakerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  function update(patch: Partial<FilterState>) {
    onChange({ ...filters, ...patch });
  }

  function toggleExpertise(tag: string) {
    const next = filters.expertise.includes(tag)
      ? filters.expertise.filter((e) => e !== tag)
      : [...filters.expertise, tag];
    update({ expertise: next });
  }

  const hasActiveFilters =
    filters.search ||
    filters.expertise.length > 0 ||
    filters.available !== null ||
    filters.format ||
    filters.minFee > 0 ||
    filters.maxFee < 200000;

  return (
    <div className="space-y-3">
      {/* Search + controls row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search speakers by name or topic..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-secondary rounded-[4px] bg-white text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>

        <select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as FilterState["sort"] })}
          className="px-3 py-2.5 text-sm border border-secondary rounded-[4px] bg-white text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer"
        >
          <option value="rating_desc">Top Rated</option>
          <option value="fee_asc">Fee: Low to High</option>
          <option value="fee_desc">Fee: High to Low</option>
          <option value="events_desc">Most Events</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={[
            "flex items-center gap-2 px-3 py-2.5 text-sm border rounded-[4px] transition-colors",
            showAdvanced
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-line bg-white text-primary hover:border-secondary",
          ].join(" ")}
        >
          <SlidersHorizontal size={16} />
          Filters
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center">
              ✓
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                search: "",
                expertise: [],
                available: null,
                format: "",
                minFee: 0,
                maxFee: 200000,
                sort: "rating_desc",
              })
            }
            className="flex items-center gap-1 px-3 py-2.5 text-sm border border-line rounded-[4px] text-muted hover:text-danger hover:border-danger transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="bg-white border border-line rounded-[4px] p-4 space-y-4 animate-[slide-up_0.2s_ease-out]">
          {/* Expertise chips */}
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 font-space-mono">
              Expertise
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EXPERTISE.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleExpertise(tag)}
                  className={[
                    "px-2.5 py-1 text-xs rounded-full border transition-colors",
                    filters.expertise.includes(tag)
                      ? "bg-accent text-white border-accent font-semibold"
                      : "border-line text-primary hover:border-secondary",
                  ].join(" ")}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Availability */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 font-space-mono">
                Availability
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "All", value: null },
                  { label: "Available Now", value: true },
                  { label: "Unavailable", value: false },
                ].map((opt) => (
                  <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filters.available === opt.value}
                      onChange={() => update({ available: opt.value })}
                      className="accent-[#FF5700]"
                    />
                    <span className="text-sm text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Format */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 font-space-mono">
                Format
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Any Format", value: "" },
                  { label: "In-Person", value: "in-person" },
                  { label: "Virtual", value: "virtual" },
                  { label: "Hybrid", value: "hybrid" },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={filters.format === opt.value}
                      onChange={() => update({ format: opt.value })}
                      className="accent-[#FF5700]"
                    />
                    <span className="text-sm text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fee range */}
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 font-space-mono">
                Fee Range (ZAR)
              </p>
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minFee || ""}
                    onChange={(e) => update({ minFee: Number(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 text-xs border border-line rounded-[4px] text-primary focus:outline-none focus:border-secondary"
                  />
                  <span className="text-muted text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxFee === 200000 ? "" : filters.maxFee}
                    onChange={(e) => update({ maxFee: Number(e.target.value) || 200000 })}
                    className="w-full px-2 py-1.5 text-xs border border-line rounded-[4px] text-primary focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
