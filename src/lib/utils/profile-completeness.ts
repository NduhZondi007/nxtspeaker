import type { Profile, SpeakerProfile } from "@/lib/types/database";

/**
 * The single definition of "a complete speaker profile".
 *
 * This governs two things that MUST agree:
 *   1. the progress bar on the speaker's own dashboard, and
 *   2. whether the speaker is listed to clients at all.
 *
 * Keeping them as one definition is deliberate — a speaker being told they are
 * at 100% while still being hidden (or vice versa) is worse than either rule on
 * its own, and this codebase has already been bitten by two copies of a query
 * drifting apart (see docs/ERRORS.md, "Speakers not loading on discover page").
 */

/** A speaker profile plus the joined `profiles` row the avatar lives on. */
type SpeakerLike = Partial<SpeakerProfile> | null | undefined;
type ProfileLike = Partial<Profile> | null | undefined;

export interface CompletenessField {
  key: string;
  /** Shown to the speaker in the "what's missing" list. */
  label: string;
  isComplete: (speaker: SpeakerLike, profile: ProfileLike) => boolean;
}

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

const hasItems = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

export const PROFILE_COMPLETENESS_FIELDS: readonly CompletenessField[] = [
  {
    key: "bio",
    label: "Biography",
    isComplete: (sp) => hasText(sp?.bio),
  },
  {
    key: "expertise",
    label: "At least one expertise topic",
    isComplete: (sp) => hasItems(sp?.expertise),
  },
  {
    key: "languages",
    label: "At least one language",
    isComplete: (sp) => hasItems(sp?.languages),
  },
  {
    key: "location",
    label: "Location",
    isComplete: (sp) => hasText(sp?.location),
  },
  {
    key: "speaking_fee_zar",
    // A brand-new speaker_profiles row defaults the fee to 0, so "not yet set"
    // and "free" are indistinguishable — 0 counts as incomplete. Postgres
    // NUMERIC can arrive as a string, hence the explicit coercion.
    label: "Speaking fee",
    isComplete: (sp) => Number(sp?.speaking_fee_zar ?? 0) > 0,
  },
  {
    key: "avatar_url",
    label: "Profile photo",
    isComplete: (_sp, profile) => hasText(profile?.avatar_url),
  },
  {
    key: "photo_urls",
    label: "At least one portfolio photo",
    isComplete: (sp) => hasItems(sp?.photo_urls),
  },
] as const;

export interface CompletenessResult {
  /** 0-100, rounded. */
  percent: number;
  /** True only at a full 100% — the bar for being listed to clients. */
  isComplete: boolean;
  /** The fields still outstanding, in display order. */
  missing: CompletenessField[];
}

/**
 * Resolves the `profiles` row: callers either pass it explicitly (the speaker's
 * own dashboard, which queries the two tables separately) or rely on the
 * embedded join used by the client-facing speaker queries.
 */
function resolveProfile(speaker: SpeakerLike, profile: ProfileLike): ProfileLike {
  return profile ?? speaker?.profiles;
}

export function getProfileCompleteness(
  speaker: SpeakerLike,
  profile?: ProfileLike
): CompletenessResult {
  const resolvedProfile = resolveProfile(speaker, profile);

  const missing = PROFILE_COMPLETENESS_FIELDS.filter(
    (field) => !field.isComplete(speaker, resolvedProfile)
  );

  const total = PROFILE_COMPLETENESS_FIELDS.length;
  const done = total - missing.length;

  return {
    percent: Math.round((done / total) * 100),
    isComplete: missing.length === 0,
    missing,
  };
}

/**
 * Whether a speaker may be shown to clients or booked.
 *
 * Deliberately also checks `status`, so every client-facing call site gets the
 * same answer from one place rather than remembering to pair a completeness
 * check with its own `status` filter.
 */
export function isSpeakerListable(speaker: SpeakerLike, profile?: ProfileLike): boolean {
  if (speaker?.status !== "ACTIVE") return false;
  return getProfileCompleteness(speaker, profile).isComplete;
}
