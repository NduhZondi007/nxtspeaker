"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isBookingStatus } from "@/lib/utils/booking";
import { containsPattern, escapePostgrestFilterValue } from "@/lib/utils/postgrest";
import type { BookingStatus, SpeakerProfileFormData } from "@/lib/types/database";

const MAX_ADMIN_MESSAGE_LENGTH = 4000;

/**
 * Keeps `auth.users.app_metadata.role` in step with `profiles.role`.
 *
 * The two are read by different layers: the admin portal authorises against
 * `profiles.role`, while every admin RLS policy authorises against the
 * `app_metadata.role` claim in the request JWT (they were rewritten to read
 * the claim in 20260622194851 to break an infinite-recursion loop). Updating
 * only the table therefore produced an "admin" who could open the portal but
 * whose queries still ran with ordinary-user visibility — `/admin/users`
 * listed nobody but themselves. `app_metadata` is writable only by the
 * service role, so it stays a trustworthy source for RLS.
 *
 * The claim is baked into the JWT at sign-in, so the user must re-authenticate
 * (or refresh their token) before the new role takes effect in RLS.
 */
async function syncRoleClaim(userId: string, role: "ADMIN" | "SPEAKER" | "CLIENT") {
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  return error?.message ?? null;
}

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

  const claimError = await syncRoleClaim(userId, "ADMIN");
  if (claimError) {
    // Roll the table back rather than leave the two sources disagreeing.
    await service
      .from("profiles")
      .update({ role: target.role, base_role: null })
      .eq("id", userId);
    return { error: `Could not grant admin access: ${claimError}` };
  }

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

  const claimError = await syncRoleClaim(userId, target.base_role as "SPEAKER" | "CLIENT");
  if (claimError) {
    await service
      .from("profiles")
      .update({ role: "ADMIN", base_role: target.base_role })
      .eq("id", userId);
    return { error: `Could not revoke admin access: ${claimError}` };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { data: true };
}

export async function adminUpdateBookingStatus(bookingId: string, status: BookingStatus, reason?: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };
  if (!isBookingStatus(status)) return { error: "Invalid booking status" };

  // Only touch `cancelled_reason` when one is actually supplied — passing
  // `reason ?? null` unconditionally erased the recorded reason every time an
  // admin changed the status of an already-cancelled booking.
  const trimmedReason = reason?.trim().slice(0, 1000);
  const patch: { status: BookingStatus; cancelled_reason?: string | null } = { status };
  if (trimmedReason !== undefined) patch.cancelled_reason = trimmedReason || null;

  const service = createServiceClient();
  const { data, error } = await service
    .from("bookings")
    .update(patch)
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
    // Keep the JWT claim RLS reads in step with the table (see syncRoleClaim)
    await syncRoleClaim(userId, "SPEAKER");
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

  const q = typeof query === "string" ? query.trim() : "";
  if (!q) return { data: [], error: null };

  // `.or()` takes a raw PostgREST filter string. Interpolating the search
  // term straight into it let a term containing `,` or `)` close the
  // condition and append arbitrary ones (`x,role.eq.ADMIN`), so the term is
  // both wildcard-escaped and quoted. Search runs as the admin's own user so
  // RLS still applies.
  const pattern = escapePostgrestFilterValue(containsPattern(q));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
    .neq("role", "ADMIN")
    .limit(8);

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function adminSendMessage(bookingId: string, content: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > MAX_ADMIN_MESSAGE_LENGTH) {
    return { error: `Message must be ${MAX_ADMIN_MESSAGE_LENGTH} characters or fewer` };
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("messages")
    .insert({ booking_id: bookingId, sender_id: user!.id, content: trimmed })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/admin/bookings/${bookingId}`);
  return { data };
}
