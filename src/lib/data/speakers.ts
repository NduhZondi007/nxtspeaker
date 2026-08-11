import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakerProfile } from "@/lib/types/database";
import type { FilterState } from "@/components/speakers/SpeakerFilters";

export const DEFAULT_SPEAKER_FILTERS: FilterState = {
  search: "",
  expertise: [],
  available: null,
  format: "",
  minFee: 0,
  maxFee: 200000,
  sort: "rating_desc",
};

/**
 * Repository layer for speaker_profiles reads.
 *
 * This is the single definition of "how we query speakers" — it is called
 * both from the Server Component that renders the initial /client/discover
 * page (using the cookie-authenticated server client, no race possible) and
 * from the client-side filter-change handler (using the browser client).
 * Keeping one implementation means the two call sites can never drift apart,
 * which was the mechanism behind an earlier bug (see docs/ERRORS.md,
 * "Speakers not loading on discover page").
 */
export async function getSpeakers(
  supabase: SupabaseClient,
  filters: FilterState
): Promise<{ data: SpeakerProfile[]; error: string | null }> {
  let query = supabase
    .from("speaker_profiles")
    .select("*, profiles(*)")
    .eq("status", "ACTIVE");

  if (filters.available !== null) query = query.eq("available", filters.available);
  if (filters.minFee > 0) query = query.gte("speaking_fee_zar", filters.minFee);
  if (filters.maxFee < 200000) query = query.lte("speaking_fee_zar", filters.maxFee);
  if (filters.expertise.length > 0) query = query.overlaps("expertise", filters.expertise);
  if (filters.format === "virtual") query = query.eq("virtual_available", true);
  else if (filters.format === "hybrid") query = query.eq("hybrid_available", true);

  switch (filters.sort) {
    case "fee_asc":
      query = query.order("speaking_fee_zar", { ascending: true });
      break;
    case "fee_desc":
      query = query.order("speaking_fee_zar", { ascending: false });
      break;
    case "events_desc":
      query = query.order("total_events", { ascending: false });
      break;
    default:
      query = query.order("avg_rating", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message };
  }

  let results = (data ?? []) as SpeakerProfile[];
  if (filters.search) {
    results = filterBySearch(results, filters.search);
  }

  return { data: results, error: null };
}

/** Client-side text filter — name/title/expertise/bio substring match. */
export function filterBySearch(speakers: SpeakerProfile[], search: string): SpeakerProfile[] {
  const q = search.toLowerCase();
  return speakers.filter(
    (sp) =>
      sp.profiles?.full_name?.toLowerCase().includes(q) ||
      sp.title?.toLowerCase().includes(q) ||
      sp.expertise?.some((e) => e.toLowerCase().includes(q)) ||
      sp.bio?.toLowerCase().includes(q)
  );
}
