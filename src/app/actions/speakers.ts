"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SpeakerProfileFormData, HospitalityRider } from "@/lib/types/database";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

export async function updateSpeakerProfile(data: Partial<SpeakerProfileFormData>) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Explicitly whitelist allowed fields — prevents injection of computed fields
  // such as avg_rating, total_events, status, or user_id
  const safeUpdate: Partial<SpeakerProfileFormData> = {};
  if (data.title !== undefined)              safeUpdate.title = data.title;
  if (data.bio !== undefined)                safeUpdate.bio = data.bio;
  if (data.expertise !== undefined)          safeUpdate.expertise = data.expertise;
  if (data.languages !== undefined)          safeUpdate.languages = data.languages;
  if (data.location !== undefined)           safeUpdate.location = data.location;
  if (data.speaking_fee_zar !== undefined)   safeUpdate.speaking_fee_zar = data.speaking_fee_zar;
  if (data.level !== undefined)              safeUpdate.level = data.level;
  if (data.available !== undefined)          safeUpdate.available = data.available;
  if (data.virtual_available !== undefined)  safeUpdate.virtual_available = data.virtual_available;
  if (data.hybrid_available !== undefined)   safeUpdate.hybrid_available = data.hybrid_available;
  if (data.tags !== undefined)               safeUpdate.tags = data.tags;
  if (data.profile_video_url !== undefined)  safeUpdate.profile_video_url = data.profile_video_url;

  if (Object.keys(safeUpdate).length === 0) return { error: "No valid fields to update" };

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

  // Strip internal/metadata fields — only update preference columns
  const {
    id: _id,
    speaker_id: _speakerId,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...riderFields
  } = data as HospitalityRider;

  const { error } = await supabase
    .from("hospitality_riders")
    .update(riderFields)
    .eq("speaker_id", sp.id);

  if (error) return { error: error.message };

  revalidatePath("/speaker/rider");

  return { success: true };
}

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 MB
const MAX_PHOTOS = 5;

export async function saveSpeakerPhotoUrl(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the URL belongs to this user's folder in our bucket
  if (!url.includes(`/speaker-photos/${user.id}/`))
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
  const cleanUrl = url.split("?")[0];

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

  const bucketPrefix = "/storage/v1/object/public/speaker-photos/";
  const prefixIndex = url.indexOf(bucketPrefix);
  if (prefixIndex === -1) return { error: "Invalid photo URL" };
  const storagePath = url.split("?")[0].slice(prefixIndex + bucketPrefix.length);

  if (!storagePath.startsWith(`${user.id}/`))
    return { error: "Not authorized to delete this photo" };

  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("photo_urls")
    .eq("user_id", user.id)
    .single();
  if (!sp) return { error: "Speaker profile not found" };

  const { error: dbError } = await supabase
    .from("speaker_profiles")
    .update({ photo_urls: (sp.photo_urls as string[] ?? []).filter((u: string) => u !== url) })
    .eq("user_id", user.id);
  if (dbError) return { error: dbError.message };

  await supabase.storage.from("speaker-photos").remove([storagePath]);

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { success: true };
}

export async function saveAvatarUrl(url: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify the URL belongs to this user's folder in our bucket
  if (!url.includes(`/speaker-avatars/${user.id}/`))
    return { error: "Invalid avatar URL" };

  // Strip query params (cache-bust suffix) before saving to DB
  const cleanUrl = url.split("?")[0];

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: cleanUrl })
    .eq("id", user.id);

  if (dbError) return { error: dbError.message };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");
  return { success: true };
}
