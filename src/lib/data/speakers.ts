import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review, SpeakerProfile } from "@/lib/types/database";
import type { FilterState } from "@/components/speakers/SpeakerFilters";
import { isSpeakerListable } from "@/lib/utils/profile-completeness";

export const DEFAULT_SPEAKER_FILTERS: FilterState = {
  search: "",
  expertise: [],
  available: null,
  format: "",
  minFee: 0,
  maxFee: 200000,
  sort: "rating_desc",
};

/** Rows per discover page. Listability is re-checked in memory, so a page can render fewer. */
export const SPEAKER_PAGE_SIZE = 24;

/**
 * Columns a client may see about OTHER users.
 *
 * `profiles(*)` used to ship every listed speaker's email address and phone
 * number to every signed-in browser. Only what the discover grid and the
 * speaker card render is selected; add a column here deliberately, never `*`.
 */
export const PUBLIC_PROFILE_COLUMNS = "id, full_name, avatar_url";

export const PUBLIC_SPEAKER_COLUMNS = [
  "id",
  "user_id",
  "title",
  "bio",
  "expertise",
  "languages",
  "location",
  "speaking_fee_zar",
  "fee_currency",
  "level",
  "available",
  "virtual_available",
  "hybrid_available",
  "tags",
  "total_events",
  "avg_rating",
  "profile_video_url",
  "photo_urls",
  "status",
  "created_at",
  "updated_at",
  // Name and photo come from speaker_profiles' own public copy, never from a
  // join to `profiles`: reading other users' profiles rows is what exposed
  // every speaker's email and phone (audit H2, 20261005140000).
  "display_name",
  "display_avatar_url",
].join(", ");

/**
 * Gives a speaker row the `profiles` shape the cards and listability rule
 * read, built from the public columns on speaker_profiles. The identity is
 * deliberately minimal: there is no email, phone or company to leak.
 */
export function withPublicIdentity<T extends Partial<SpeakerProfile>>(row: T): T {
  return {
    ...row,
    profiles: {
      id: row.user_id,
      full_name: row.display_name ?? "",
      avatar_url: row.display_avatar_url ?? null,
    } as SpeakerProfile["profiles"],
  };
}

const PUBLIC_REVIEW_COLUMNS = [
  "id",
  "booking_id",
  "reviewer_id",
  "speaker_id",
  "rating",
  "headline",
  "body",
  "verified",
  "created_at",
  `profiles(${PUBLIC_PROFILE_COLUMNS})`,
].join(", ");

export interface SpeakerPageOptions {
  offset?: number;
  limit?: number;
}

export interface SpeakerPage {
  data: SpeakerProfile[];
  error: string | null;
  /** True when the raw page was full, so another page may exist. */
  hasMore: boolean;
}

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
  filters: FilterState,
  { offset = 0, limit = SPEAKER_PAGE_SIZE }: SpeakerPageOptions = {}
): Promise<SpeakerPage> {
  // The parts of isSpeakerListable that live on speaker_profiles are pushed
  // into SQL so incomplete rows are never downloaded. isSpeakerListable stays
  // the final word below (it also covers the public avatar).
  let query = supabase
    .from("speaker_profiles")
    .select(PUBLIC_SPEAKER_COLUMNS)
    .eq("status", "ACTIVE")
    .gt("speaking_fee_zar", 0)
    .not("bio", "is", null)
    .not("location", "is", null)
    .not("display_avatar_url", "is", null)
    .not("expertise", "eq", "{}")
    .not("languages", "eq", "{}")
    .not("photo_urls", "eq", "{}");

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
  // Stable tiebreak so pages never overlap or skip rows with equal sort keys.
  query = query.order("id", { ascending: true }).range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    return { data: [], error: error.message, hasMore: false };
  }

  const raw = ((data ?? []) as unknown as SpeakerProfile[]).map(withPublicIdentity);

  // Only fully-complete profiles are shown to clients. Sharing one predicate
  // with the speaker's own progress bar is what stops the two from
  // disagreeing — see isSpeakerListable in @/lib/utils/profile-completeness.
  let results = raw.filter((sp) => isSpeakerListable(sp));

  if (filters.search) {
    results = filterBySearch(results, filters.search);
  }

  return { data: results, error: null, hasMore: raw.length === limit };
}

/** Reviews for one speaker, newest first, with only public reviewer fields. */
export async function getSpeakerReviews(
  supabase: SupabaseClient,
  speakerId: string
): Promise<{ data: Review[]; error: string | null }> {
  const { data, error } = await supabase
    .from("reviews")
    .select(PUBLIC_REVIEW_COLUMNS)
    .eq("speaker_id", speakerId)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as unknown as Review[], error: null };
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
