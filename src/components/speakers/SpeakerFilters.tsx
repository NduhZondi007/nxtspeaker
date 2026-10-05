"use client";

import { useId, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EXPERTISE_OPTIONS } from "@/lib/constants/speakers";

export interface FilterState {
  search: string;
  expertise: string[];
  available: boolean | null;
  format: string;
  minFee: number;
  maxFee: number;
  sort: "fee_asc" | "fee_desc" | "rating_desc" | "events_desc";
}

const MAX_FEE_SENTINEL = 200000;

const AVAILABILITY_OPTIONS: { label: string; value: boolean | null }[] = [
  { label: "All", value: null },
  { label: "Available Now", value: true },
  { label: "Unavailable", value: false },
];

const FORMAT_OPTIONS: { label: string; value: string }[] = [
  { label: "Any Format", value: "" },
  { label: "In-Person", value: "in-person" },
  { label: "Virtual", value: "virtual" },
  { label: "Hybrid", value: "hybrid" },
];

const LEGEND_CLASS = "text-xs font-semibold text-primary uppercase tracking-wide mb-2 font-space-mono";

interface SpeakerFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function SpeakerFilters({ filters, onChange }: SpeakerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const id = useId();
  const advancedId = `${id}-advanced`;

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
    filters.maxFee < MAX_FEE_SENTINEL;

  return (
    <div className="space-y-3">
      {/* Search + controls row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <div className="flex-1 relative">
          <label htmlFor={`${id}-search`} className="sr-only">
            Search speakers
          </label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id={`${id}-search`}
            type="search"
            placeholder="Search speakers by name or topic..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 text-sm border-[1.5px] border-secondary rounded-[4px] bg-white text-primary placeholder:text-muted caret-accent focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
        </div>

        <label htmlFor={`${id}-sort`} className="sr-only">
          Sort speakers
        </label>
        <select
          id={`${id}-sort`}
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
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
          aria-controls={advancedId}
          className={[
            "flex items-center gap-2 px-3 py-2.5 text-sm border rounded-[4px] transition-colors",
            showAdvanced
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-line bg-white text-primary hover:border-secondary",
          ].join(" ")}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
          {hasActiveFilters && (
            <span
              className="w-4 h-4 rounded-full bg-secondary text-white text-[9px] font-bold flex items-center justify-center"
              aria-label="(active)"
            >
              ✓
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() =>
              onChange({
                search: "",
                expertise: [],
                available: null,
                format: "",
                minFee: 0,
                maxFee: MAX_FEE_SENTINEL,
                sort: "rating_desc",
              })
            }
            className="flex items-center gap-1 px-3 py-2.5 text-sm border border-line rounded-[4px] text-muted hover:text-danger hover:border-danger transition-colors"
          >
            <X size={14} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div
          id={advancedId}
          className="bg-white border border-line rounded-[4px] p-4 space-y-4 animate-[slide-up_0.2s_ease-out]"
        >
          {/* Expertise chips */}
          <fieldset>
            <legend className={LEGEND_CLASS}>Expertise</legend>
            <div className="flex flex-wrap gap-1.5">
              {EXPERTISE_OPTIONS.map((tag) => {
                const selected = filters.expertise.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleExpertise(tag)}
                    className={[
                      "px-2.5 py-1 text-xs rounded-full border transition-colors",
                      selected
                        ? "bg-accent text-white border-accent font-semibold"
                        : "border-line text-primary hover:border-secondary",
                    ].join(" ")}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Availability */}
            <fieldset>
              <legend className={LEGEND_CLASS}>Availability</legend>
              <div className="space-y-1.5">
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`${id}-availability`}
                      checked={filters.available === opt.value}
                      onChange={() => update({ available: opt.value })}
                      className="accent-accent"
                    />
                    <span className="text-sm text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Format */}
            <fieldset>
              <legend className={LEGEND_CLASS}>Format</legend>
              <div className="space-y-1.5">
                {FORMAT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`${id}-format`}
                      checked={filters.format === opt.value}
                      onChange={() => update({ format: opt.value })}
                      className="accent-accent"
                    />
                    <span className="text-sm text-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Fee range */}
            <fieldset>
              <legend className={LEGEND_CLASS}>Fee Range (ZAR)</legend>
              <div className="flex gap-2 items-center">
                <label htmlFor={`${id}-min-fee`} className="sr-only">
                  Minimum fee (ZAR)
                </label>
                <input
                  id={`${id}-min-fee`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Min"
                  value={filters.minFee || ""}
                  onChange={(e) => update({ minFee: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1.5 text-xs border border-line rounded-[4px] text-primary focus:outline-none focus:border-secondary"
                />
                <span className="text-muted text-xs" aria-hidden="true">
                  –
                </span>
                <label htmlFor={`${id}-max-fee`} className="sr-only">
                  Maximum fee (ZAR)
                </label>
                <input
                  id={`${id}-max-fee`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Max"
                  value={filters.maxFee === MAX_FEE_SENTINEL ? "" : filters.maxFee}
                  onChange={(e) => update({ maxFee: Number(e.target.value) || MAX_FEE_SENTINEL })}
                  className="w-full px-2 py-1.5 text-xs border border-line rounded-[4px] text-primary focus:outline-none focus:border-secondary"
                />
              </div>
            </fieldset>
          </div>
        </div>
      )}
    </div>
  );
}
