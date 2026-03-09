"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SpeakerProfileFormData, HospitalityRider } from "@/lib/types/database";

export async function updateSpeakerProfile(data: Partial<SpeakerProfileFormData>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("speaker_profiles")
    .update(data)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/speaker/profile");
  revalidatePath("/client/discover");

  return { success: true };
}

export async function updateRider(data: Partial<HospitalityRider>) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Get speaker_profile id
  const { data: sp } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!sp) return { error: "Speaker profile not found" };

  const { error } = await supabase
    .from("hospitality_riders")
    .update(data)
    .eq("speaker_id", sp.id);

  if (error) return { error: error.message };

  revalidatePath("/speaker/rider");

  return { success: true };
}

export async function uploadAvatar(file: File) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const ext = file.name.split(".").pop();
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("speaker-avatars")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage
    .from("speaker-avatars")
    .getPublicUrl(path);

  // Update profile avatar_url
  await supabase
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", user.id);

  revalidatePath("/speaker/profile");

  return { url: urlData.publicUrl };
}
