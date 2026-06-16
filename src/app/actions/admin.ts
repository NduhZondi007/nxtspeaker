"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { BookingStatus, SpeakerProfileFormData } from "@/lib/types/database";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const, user: null, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") return { error: "Admin access required" as const, user: null, supabase: null };

  return { error: null, user, supabase };
}

export async function promoteToAdmin(userId: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };
  if (user!.id === userId) return { error: "You cannot promote yourself" };

  const service = createServiceClient();

  const { data: target, error: fetchError } = await service
    .from("profiles")
    .select("role, base_role")
    .eq("id", userId)
    .single();

  if (fetchError || !target) return { error: "User not found" };
  if (target.role === "ADMIN") return { error: "User is already an admin" };

  const { error } = await service
    .from("profiles")
    .update({ role: "ADMIN", base_role: target.role })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { data: true };
}

export async function revokeAdmin(userId: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };
  if (user!.id === userId) return { error: "You cannot revoke your own admin access" };

  const service = createServiceClient();

  const { data: target, error: fetchError } = await service
    .from("profiles")
    .select("role, base_role")
    .eq("id", userId)
    .single();

  if (fetchError || !target) return { error: "User not found" };
  if (target.role !== "ADMIN") return { error: "User is not an admin" };
  if (!target.base_role) return { error: "Cannot revoke admin: base role unknown. Update manually in DB." };

  const { error } = await service
    .from("profiles")
    .update({ role: target.base_role, base_role: null })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { data: true };
}

export async function adminUpdateBookingStatus(bookingId: string, status: BookingStatus, reason?: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const service = createServiceClient();
  const { data, error } = await service
    .from("bookings")
    .update({ status, cancelled_reason: reason ?? null })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  return { data };
}

export async function adminCreateSpeaker(
  userId: string,
  data: Pick<SpeakerProfileFormData, "title" | "bio" | "speaking_fee_zar" | "expertise" | "languages" | "location" | "level" | "available" | "virtual_available" | "hybrid_available" | "tags">
) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const service = createServiceClient();

  const { data: target, error: profileError } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profileError || !target) return { error: "User not found" };

  const { data: existing } = await service
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) return { error: "User already has a speaker profile" };

  const { data: sp, error: spError } = await service
    .from("speaker_profiles")
    .insert({
      user_id: userId,
      title: data.title,
      bio: data.bio || null,
      speaking_fee_zar: data.speaking_fee_zar,
      expertise: data.expertise ?? [],
      languages: data.languages ?? [],
      location: data.location || null,
      level: data.level ?? 1,
      available: data.available ?? true,
      virtual_available: data.virtual_available ?? false,
      hybrid_available: data.hybrid_available ?? false,
      tags: data.tags ?? [],
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (spError) return { error: spError.message };

  await service.from("hospitality_riders").insert({ speaker_id: sp!.id });

  if (target.role !== "ADMIN") {
    await service
      .from("profiles")
      .update({ role: "SPEAKER" })
      .eq("id", userId);
  }

  revalidatePath("/admin/speakers");
  return { data: sp };
}

export async function adminToggleSpeakerStatus(speakerProfileId: string, active: boolean) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const service = createServiceClient();
  const { data, error } = await service
    .from("speaker_profiles")
    .update({ status: active ? "ACTIVE" : "INACTIVE" })
    .eq("id", speakerProfileId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/speakers");
  return { data };
}

export async function adminSearchUsers(query: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError, data: null };

  const supabase = await createClient();
  const q = query.trim().toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .neq("role", "ADMIN")
    .limit(8);

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function adminSendMessage(bookingId: string, content: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  const service = createServiceClient();
  const { data, error } = await service
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: user!.id, content })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { data };
}
