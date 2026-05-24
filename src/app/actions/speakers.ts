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

export async function uploadAvatar(file: File) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "Only JPG, PNG, WebP, or GIF images are allowed" };
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image must be under 5 MB" };
  }

  // Use MIME-derived extension — ignore file.name which can be spoofed
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("speaker-avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("speaker-avatars")
    .getPublicUrl(path);

  await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", user.id);

  revalidatePath("/speaker/profile");

  return { url: urlData.publicUrl };
}
