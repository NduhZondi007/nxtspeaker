import type { HospitalityRider } from "@/lib/types/database";

/** The editable part of a rider: everything except row metadata. */
export type RiderPreferences = Omit<HospitalityRider, "id" | "speaker_id" | "created_at" | "updated_at">;

export const RIDER_COLUMNS =
  "water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests";

/** Mirrors the column defaults on hospitality_riders, for a speaker with no row yet. */
export const DEFAULT_RIDER: RiderPreferences = {
  water_still: true,
  water_sparkling: false,
  water_room_temp: false,
  dietary_restrictions: [],
  dietary_notes: null,
  meal_required: true,
  meal_timing: "no preference",
  green_room_required: true,
  green_room_notes: null,
  av_requirements: null,
  presentation_clicker: true,
  confidence_monitor: false,
  flights_required: false,
  accommodation_required: false,
  accommodation_standard: "four_star",
  additional_requests: null,
};

/** Fill any NULL column (they are all nullable in SQL) from the defaults. */
export function toRiderPreferences(row: Partial<RiderPreferences> | null): RiderPreferences {
  const merged = { ...DEFAULT_RIDER } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_RIDER)) {
    const value = row?.[key as keyof RiderPreferences];
    if (value !== null && value !== undefined) merged[key] = value;
  }
  return merged as RiderPreferences;
}
