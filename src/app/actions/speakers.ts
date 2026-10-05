"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getMySpeakerProfileId } from "@/lib/auth/session";
import { toUserError } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
import { canonicalStorageUrl, parseOwnedStorageObjectPath } from "@/lib/utils/storage";
import type { SpeakerProfileFormData, HospitalityRider } from "@/lib/types/database";

const log = createLogger("actions/speakers");

const AVATAR_BUCKET = "speaker-avatars";
const PHOTO_BUCKET = "speaker-photos";

// Bounds for the free-form profile fields. Server Action arguments are just
// deserialised JSON, so the `SpeakerProfileFormData` annotation enforces
// nothing at the boundary — a negative fee or a level outside 1–5 previously
// reached the UPDATE and either stuck (fee) or failed on a raw CHECK
// constraint violation (level).
const SpeakerProfileSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    bio: z.string().trim().max(5000).nullable(),
    expertise: z.array(z.string().trim().min(1).max(80)).max(30),
    languages: z.array(z.string().trim().min(1).max(80)).max(30),
    location: z.string().trim().max(200).nullable(),
    speaking_fee_zar: z
      .number()
      .min(0, "Speaking fee cannot be negative")
      .max(100_000_000, "Speaking fee is unrealistically high"),
    level: z.number().int().min(1, "Level must be between 1 and 5").max(5, "Level must be between 1 and 5"),
    available: z.boolean(),
    virtual_available: z.boolean(),
    hybrid_available: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(80)).max(30),
    profile_video_url: z.string().trim().url("Enter a valid video URL").max(500).nullable(),
  })
  .partial();

const RiderSchema = z
  .object({
    water_still: z.boolean(),
    water_sparkling: z.boolean(),
    water_room_temp: z.boolean(),
    dietary_restrictions: z.array(z.string().trim().min(1).max(80)).max(30),
    dietary_notes: z.string().trim().max(2000).nullable(),
    meal_required: z.boolean(),
    meal_timing: z.enum(["before", "after", "no preference"]),
    green_room_required: z.boolean(),
    green_room_notes: z.string().trim().max(2000).nullable(),
    av_requirements: z.string().trim().max(2000).nullable(),
    presentation_clicker: z.boolean(),
    confidence_monitor: z.boolean(),
    flights_required: z.boolean(),
    accommodation_required: z.boolean(),
    accommodation_standard: z.enum(["three_star", "four_star", "five_star"]),
    additional_requests: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .strip();

export async function updateSpeakerProfile(data: Partial<SpeakerProfileFormData>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Explicitly whitelist allowed fields — prevents injection of computed fields
  // such as avg_rating, total_events, status, or user_id
  const candidate: Record<string, unknown> = {};
  if (data.title !== undefined)              candidate.title = data.title;
  if (data.bio !== undefined)                candidate.bio = data.bio;
  if (data.expertise !== undefined)          candidate.expertise = data.expertise;
  if (data.languages !== undefined)          candidate.languages = data.languages;
  if (data.location !== undefined)           candidate.location = data.location;
  if (data.speaking_fee_zar !== undefined)   candidate.speaking_fee_zar = data.speaking_fee_zar;
  if (data.level !== undefined)              candidate.level = data.level;
  if (data.available !== undefined)          candidate.available = data.available;
  if (data.virtual_available !== undefined)  candidate.virtual_available = data.virtual_available;
  if (data.hybrid_available !== undefined)   candidate.hybrid_available = data.hybrid_available;
  if (data.tags !== undefined)               candidate.tags = data.tags;
  if (data.profile_video_url !== undefined)  candidate.profile_video_url = data.profile_video_url;

  if (Object.keys(candidate).length === 0) return { error: "No valid fields to update" };

  const parsed = SpeakerProfileSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid profile details" };
  }
  const safeUpdate = parsed.data;

  const { error } = await supabase
    .from("speaker_profiles")
    .update(safeUpdate)
    .eq("user_id", user.id);

  if (error) return { error: toUserError(error, "Could not save your profile. Please try again.") };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");

  return { success: true };
}

export async function updateRider(data: Partial<HospitalityRider>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Ownership comes from the session, never from the payload: RiderSchema
  // strips any client-supplied speaker_id and the row key is set below.
  let speakerId: string | null;
  try {
    speakerId = await getMySpeakerProfileId();
  } catch (err) {
    log.error("speaker profile lookup failed", { cause: err });
    return { error: "Could not save your rider. Please try again." };
  }
  if (!speakerId) return { error: "Speaker profile not found" };

  // Whitelist the preference columns rather than blacklisting the four
  // known metadata ones: a blacklist passes through any *other* key the
  // caller invents, which reaches Postgres and fails as a raw schema error.
  const parsed = RiderSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rider details" };
  }

  const riderFields = parsed.data;
  if (Object.keys(riderFields).length === 0) return { error: "No valid fields to update" };

  // An upsert, not an update: registration creates the rider row only on a
  // best-effort basis, and an update against a missing row silently changed
  // nothing — the speaker could never save a rider at all.
  const { error } = await supabase
    .from("hospitality_riders")
    .upsert({ ...riderFields, speaker_id: speakerId }, { onConflict: "speaker_id" });

  if (error) return { error: toUserError(error, "Could not save your rider. Please try again.") };

  revalidatePath("/speaker/rider");

  return { success: true };
}

// Per-file size and MIME limits are declared on the storage buckets
// themselves (migration 20260907120000) rather than as constants here — they
// were previously enforced only in the browser upload handler, which a direct
// storage API call bypasses entirely.
const MAX_PHOTOS = 5;
const PHOTO_WRITE_ATTEMPTS = 3;

type PhotoListResult =
  | { ok: true; urls: string[] }
  | { ok: false; reason: "read_failed" | "not_found" | "conflict" | "write_failed" | "rejected"; message?: string };

/** Postgres array literal for an equality filter on a text[] column. */
function toPgTextArray(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return `{${quoted.join(",")}}`;
}

/**
 * Read-modify-write of speaker_profiles.photo_urls as compare-and-swap.
 *
 * Two uploads finishing together used to read the same list and each write
 * back "list + mine", so one photo silently vanished (and MAX_PHOTOS could be
 * exceeded). The UPDATE is now guarded by the exact list that was read: if
 * another request changed it in between, zero rows match, and the whole
 * step — including the limit check in `change` — is retried on a fresh read.
 *
 * An RPC doing `array_append ... WHERE cardinality(photo_urls) < 5` would make
 * this a single statement; that needs a migration, so this is the app-side
 * equivalent.
 */
async function mutatePhotoUrls(
  supabase: SupabaseClient,
  userId: string,
  change: (current: string[]) => { next: string[] } | { reject: string } | { unchanged: true }
): Promise<PhotoListResult> {
  for (let attempt = 0; attempt < PHOTO_WRITE_ATTEMPTS; attempt++) {
    const { data: sp, error: readError } = await supabase
      .from("speaker_profiles")
      .select("photo_urls")
      .eq("user_id", userId)
      .maybeSingle();

    if (readError) {
      log.error("photo_urls read failed", { cause: readError });
      return { ok: false, reason: "read_failed" };
    }
    if (!sp) return { ok: false, reason: "not_found" };

    const original = (sp.photo_urls as string[] | null) ?? null;
    const decision = change(original ?? []);
    if ("reject" in decision) return { ok: false, reason: "rejected", message: decision.reject };
    if ("unchanged" in decision) return { ok: true, urls: original ?? [] };

    let update = supabase
      .from("speaker_profiles")
      .update({ photo_urls: decision.next })
      .eq("user_id", userId);
    update =
      original === null
        ? update.is("photo_urls", null)
        : update.eq("photo_urls", toPgTextArray(original));

    const { data: updated, error: writeError } = await update.select("id");
    if (writeError) {
      log.error("photo_urls write failed", { cause: writeError });
      return { ok: false, reason: "write_failed" };
    }
    if (Array.isArray(updated) && updated.length > 0) return { ok: true, urls: decision.next };

    log.warn("photo_urls changed concurrently; retrying", { attempt });
  }
  return { ok: false, reason: "conflict" };
}

export async function saveSpeakerPhotoUrl(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the URL is a public object in our own bucket, inside this user's
  // folder. A substring check was satisfied by any host that happened to
  // contain the same path segment.
  if (!parseOwnedStorageObjectPath(url, PHOTO_BUCKET, user.id))
    return { error: "Invalid photo URL" };

  // Strip query params before saving to DB
  const cleanUrl = canonicalStorageUrl(url);

  const result = await mutatePhotoUrls(supabase, user.id, (current) => {
    if (current.includes(cleanUrl)) return { unchanged: true };
    if (current.length >= MAX_PHOTOS) return { reject: `Maximum ${MAX_PHOTOS} photos allowed` };
    return { next: [...current, cleanUrl] };
  });

  if (!result.ok) {
    if (result.reason === "not_found") return { error: "Speaker profile not found" };
    if (result.reason === "rejected") return { error: result.message! };
    return { error: "Could not save the photo. Please try again." };
  }

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { url: cleanUrl };
}

export async function removeSpeakerPhoto(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const storagePath = parseOwnedStorageObjectPath(url, PHOTO_BUCKET, user.id);
  if (!storagePath) return { error: "Not authorized to delete this photo" };

  // Photos are stored canonically (query string stripped by
  // saveSpeakerPhotoUrl). Filtering on the raw `url` meant that a caller
  // passing a cache-busted URL deleted the storage object while leaving the
  // row's URL in place — a permanently broken image on the public profile.
  const cleanUrl = canonicalStorageUrl(url);

  const result = await mutatePhotoUrls(supabase, user.id, (current) => {
    const next = current.filter((u) => canonicalStorageUrl(u) !== cleanUrl);
    return next.length === current.length ? { unchanged: true } : { next };
  });

  if (!result.ok) {
    if (result.reason === "not_found") return { error: "Speaker profile not found" };
    return { error: "Could not remove the photo. Please try again." };
  }

  // The profile no longer references the file, so the user-visible removal
  // has happened; a failed delete only leaves an orphaned object behind.
  const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
  if (storageError) log.error("photo storage delete failed (orphaned object)", { path: storagePath, cause: storageError });

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { success: true };
}

export async function saveAvatarUrl(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the URL is a public object in our own bucket, inside this user's
  // folder (see parseOwnedStorageObjectPath)
  if (!parseOwnedStorageObjectPath(url, AVATAR_BUCKET, user.id))
    return { error: "Invalid avatar URL" };

  // Strip query params (cache-bust suffix) before saving to DB
  const cleanUrl = canonicalStorageUrl(url);

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: cleanUrl })
    .eq("id", user.id);

  if (dbError) return { error: toUserError(dbError, "Could not save your profile photo. Please try again.") };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { success: true };
}
