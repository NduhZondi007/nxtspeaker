"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canonicalStorageUrl, parseOwnedStorageObjectPath } from "@/lib/utils/storage";
import type { SpeakerProfileFormData, HospitalityRider } from "@/lib/types/database";

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

  if (error) return { error: error.message };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");

  return { success: true };
}

export async function updateRider(data: Partial<HospitalityRider>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!sp) return { error: "Speaker profile not found" };

  // Whitelist the preference columns rather than blacklisting the four
  // known metadata ones: a blacklist passes through any *other* key the
  // caller invents, which reaches Postgres and fails as a raw schema error.
  const parsed = RiderSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid rider details" };
  }

  const riderFields = parsed.data;
  if (Object.keys(riderFields).length === 0) return { error: "No valid fields to update" };

  const { error } = await supabase
    .from("hospitality_riders")
    .update(riderFields)
    .eq("speaker_id", sp.id);

  if (error) return { error: error.message };

  revalidatePath("/speaker/rider");

  return { success: true };
}

// Per-file size and MIME limits are declared on the storage buckets
// themselves (migration 20260907120000) rather than as constants here — they
// were previously enforced only in the browser upload handler, which a direct
// storage API call bypasses entirely.
const MAX_PHOTOS = 5;

export async function saveSpeakerPhotoUrl(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the URL is a public object in our own bucket, inside this user's
  // folder. A substring check was satisfied by any host that happened to
  // contain the same path segment.
  if (!parseOwnedStorageObjectPath(url, PHOTO_BUCKET, user.id))
    return { error: "Invalid photo URL" };

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("photo_urls")
    .eq("user_id", user.id)
    .single();

  if (!sp) return { error: "Speaker profile not found" };
  if ((sp.photo_urls ?? []).length >= MAX_PHOTOS)
    return { error: `Maximum ${MAX_PHOTOS} photos allowed` };

  // Strip query params before saving to DB
  const cleanUrl = canonicalStorageUrl(url);
  if ((sp.photo_urls ?? []).includes(cleanUrl)) return { url: cleanUrl };

  const { error: dbError } = await supabase
    .from("speaker_profiles")
    .update({ photo_urls: [...(sp.photo_urls ?? []), cleanUrl] })
    .eq("user_id", user.id);

  if (dbError) return { error: dbError.message };

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

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("photo_urls")
    .eq("user_id", user.id)
    .single();
  if (!sp) return { error: "Speaker profile not found" };

  // Photos are stored canonically (query string stripped by
  // saveSpeakerPhotoUrl). Filtering on the raw `url` meant that a caller
  // passing a cache-busted URL deleted the storage object while leaving the
  // row's URL in place — a permanently broken image on the public profile.
  const cleanUrl = canonicalStorageUrl(url);

  const { error: dbError } = await supabase
    .from("speaker_profiles")
    .update({
      photo_urls: ((sp.photo_urls as string[]) ?? []).filter(
        (u: string) => canonicalStorageUrl(u) !== cleanUrl
      ),
    })
    .eq("user_id", user.id);
  if (dbError) return { error: dbError.message };

  await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);

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

  if (dbError) return { error: dbError.message };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { success: true };
}
