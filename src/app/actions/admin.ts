"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { createLogger } from "@/lib/logger";
import { toUserError } from "@/lib/errors";
import { canAdminTransition, isBookingStatus } from "@/lib/utils/booking";
import { containsPattern, escapePostgrestFilterValue } from "@/lib/utils/postgrest";
import type { BookingStatus, SpeakerProfileFormData } from "@/lib/types/database";

const log = createLogger("admin");

const MAX_ADMIN_MESSAGE_LENGTH = 4000;
const CONFLICT_ERROR = "This booking was changed by someone else. Refresh the page and try again.";

const UserId = z.string().uuid();

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
 *
 * Returns the raw error for logging; callers never show it to the user.
 */
async function syncRoleClaim(userId: string, role: "ADMIN" | "SPEAKER" | "CLIENT"): Promise<unknown> {
  const service = createServiceClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  return error ?? null;
}

export async function promoteToAdmin(userId: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };
  if (!UserId.safeParse(userId).success) return { error: "Invalid user" };
  if (user!.id === userId) return { error: "You cannot promote yourself" };

  const service = createServiceClient();

  const { data: target, error: fetchError } = await service
    .from("profiles")
    .select("role, base_role")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) return { error: toUserError(fetchError, "Could not load the user") };
  if (!target) return { error: "User not found" };
  if (target.role === "ADMIN") return { error: "User is already an admin" };

  const { error } = await service
    .from("profiles")
    .update({ role: "ADMIN", base_role: target.role })
    .eq("id", userId);

  if (error) return { error: toUserError(error, "Could not grant admin access") };

  const claimError = await syncRoleClaim(userId, "ADMIN");
  if (claimError) {
    log.error("Admin claim sync failed; rolling back profile", { userId, cause: claimError });
    // Roll the table back rather than leave the two sources disagreeing.
    const { error: rollbackError } = await service
      .from("profiles")
      .update({ role: target.role, base_role: null })
      .eq("id", userId);
    if (rollbackError) {
      log.error("Rollback after failed admin grant also failed", { userId, cause: rollbackError });
      return {
        error: "Could not grant admin access, and the role change could not be undone. Check this user's role manually.",
      };
    }
    return { error: "Could not grant admin access. Please try again." };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { data: true };
}

/**
 * Restores a former admin's base role.
 *
 * Session invalidation: the role change only reaches RLS when the user's JWT
 * is reissued. supabase-js (auth-js 2.x) exposes `auth.admin.signOut(jwt)`,
 * which needs the target's own access token — there is no user-id-keyed
 * "sign out everywhere" in the admin API. Revoking their sessions therefore
 * needs a SECURITY DEFINER SQL function over auth.sessions /
 * auth.refresh_tokens (a migration, tracked separately). Until it exists the
 * revoked admin's current access token keeps the ADMIN claim until it
 * expires (the project JWT expiry), although the portal itself — which
 * checks `profiles.role` — locks them out immediately.
 */
export async function revokeAdmin(userId: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };
  if (!UserId.safeParse(userId).success) return { error: "Invalid user" };
  if (user!.id === userId) return { error: "You cannot revoke your own admin access" };

  const service = createServiceClient();

  const { data: target, error: fetchError } = await service
    .from("profiles")
    .select("role, base_role")
    .eq("id", userId)
    .maybeSingle();

  if (fetchError) return { error: toUserError(fetchError, "Could not load the user") };
  if (!target) return { error: "User not found" };
  if (target.role !== "ADMIN") return { error: "User is not an admin" };
  if (!target.base_role) return { error: "Cannot revoke admin: base role unknown. Update manually in DB." };

  const { error } = await service
    .from("profiles")
    .update({ role: target.base_role, base_role: null })
    .eq("id", userId);

  if (error) return { error: toUserError(error, "Could not revoke admin access") };

  const claimError = await syncRoleClaim(userId, target.base_role as "SPEAKER" | "CLIENT");
  if (claimError) {
    log.error("Admin claim revoke failed; rolling back profile", { userId, cause: claimError });
    const { error: rollbackError } = await service
      .from("profiles")
      .update({ role: "ADMIN", base_role: target.base_role })
      .eq("id", userId);
    if (rollbackError) {
      log.error("Rollback after failed admin revoke also failed", { userId, cause: rollbackError });
      return {
        error: "Could not revoke admin access, and the role change could not be undone. Check this user's role manually.",
      };
    }
    return { error: "Could not revoke admin access. Please try again." };
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { data: true };
}

/**
 * Admin status change, constrained by ADMIN_TRANSITIONS.
 *
 * The service role bypasses the SQL state machine, so the check here is the
 * only one. The update is conditional on the status that was validated: if
 * the webhook moved the booking to PAID between read and write, nothing is
 * changed and the admin is told to refresh.
 */
export async function adminUpdateBookingStatus(bookingId: string, status: BookingStatus, reason?: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };
  if (!isBookingStatus(status)) return { error: "Invalid booking status" };

  const service = createServiceClient();

  const { data: current, error: readError } = await service
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .maybeSingle();

  if (readError) return { error: toUserError(readError, "Could not load the booking") };
  if (!current) return { error: "Booking not found" };

  const from = current.status as BookingStatus;
  if (!canAdminTransition(from, status)) {
    if (from === "PAID" && status === "CANCELLED") {
      return { error: "A paid booking is cancelled by refunding its payment, not by changing its status." };
    }
    return { error: `Cannot change a ${from.toLowerCase()} booking to ${status.toLowerCase()}` };
  }

  // Only touch `cancelled_reason` when one is actually supplied — passing
  // `reason ?? null` unconditionally erased the recorded reason every time an
  // admin changed the status of an already-cancelled booking.
  const trimmedReason = typeof reason === "string" ? reason.trim().slice(0, 1000) : undefined;
  const patch: { status: BookingStatus; cancelled_reason?: string | null } = { status };
  if (trimmedReason !== undefined) patch.cancelled_reason = trimmedReason || null;

  const { data, error } = await service
    .from("bookings")
    .update(patch)
    .eq("id", bookingId)
    .eq("status", from)
    .select("id, status")
    .maybeSingle();

  if (error) return { error: toUserError(error, "Could not update the booking") };
  if (!data) return { error: CONFLICT_ERROR };

  if (status === "CANCELLED") {
    // Same reasoning as cancelBooking: a checkout opened before the cancel is
    // still live at the provider and must not be able to settle this booking.
    const { error: paymentError } = await service
      .from("payments")
      .update({ status: "CANCELLED" })
      .eq("booking_id", bookingId)
      .in("status", ["CREATED", "PENDING"]);
    if (paymentError) {
      log.error("Could not close open payments for an admin-cancelled booking", {
        bookingId,
        cause: paymentError,
      });
    }
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  return { data };
}

type AdminSpeakerInput = Pick<
  SpeakerProfileFormData,
  | "title"
  | "bio"
  | "speaking_fee_zar"
  | "expertise"
  | "languages"
  | "location"
  | "level"
  | "available"
  | "virtual_available"
  | "hybrid_available"
  | "tags"
>;

const StringList = z.array(z.string().trim().min(1).max(100)).max(50);

const AdminSpeakerSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  bio: z.string().trim().max(4000).optional().nullable(),
  speaking_fee_zar: z
    .number({ message: "Speaking fee must be a number" })
    .finite("Speaking fee must be a number")
    .nonnegative("Speaking fee cannot be negative")
    .max(100_000_000, "Speaking fee is too large"),
  expertise: StringList.optional(),
  languages: StringList.optional(),
  location: z.string().trim().max(200).optional().nullable(),
  level: z.number().int().min(1, "Level must be 1–5").max(5, "Level must be 1–5").optional(),
  available: z.boolean().optional(),
  virtual_available: z.boolean().optional(),
  hybrid_available: z.boolean().optional(),
  tags: StringList.optional(),
});

/**
 * Creates a speaker profile for an existing user.
 *
 * supabase-js cannot run a transaction, so this is four separate writes. Each
 * step's error is checked; once the profile row exists, a later failure is
 * reported as a partial success naming what still needs fixing rather than
 * silently returning `{ data }`.
 */
export async function adminCreateSpeaker(userId: string, data: AdminSpeakerInput) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (!UserId.safeParse(userId).success) return { error: "Invalid user" };
  const parsed = AdminSpeakerSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid speaker details" };
  const input = parsed.data;

  const service = createServiceClient();

  const [targetRes, existingRes] = await Promise.all([
    service.from("profiles").select("role").eq("id", userId).maybeSingle(),
    service.from("speaker_profiles").select("id").eq("user_id", userId).maybeSingle(),
  ]);

  if (targetRes.error) return { error: toUserError(targetRes.error, "Could not load the user") };
  if (!targetRes.data) return { error: "User not found" };
  if (existingRes.error) return { error: toUserError(existingRes.error, "Could not check for an existing profile") };
  if (existingRes.data) return { error: "User already has a speaker profile" };

  const { data: sp, error: spError } = await service
    .from("speaker_profiles")
    .insert({
      user_id: userId,
      title: input.title,
      bio: input.bio || null,
      speaking_fee_zar: input.speaking_fee_zar,
      expertise: input.expertise ?? [],
      languages: input.languages ?? [],
      location: input.location || null,
      level: input.level ?? 1,
      available: input.available ?? true,
      virtual_available: input.virtual_available ?? false,
      hybrid_available: input.hybrid_available ?? false,
      tags: input.tags ?? [],
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (spError || !sp) return { error: toUserError(spError, "Could not create the speaker profile") };

  const incomplete: string[] = [];

  const { error: riderError } = await service.from("hospitality_riders").insert({ speaker_id: sp.id });
  if (riderError) {
    log.error("adminCreateSpeaker: hospitality rider insert failed", { userId, cause: riderError });
    incomplete.push("their hospitality rider was not created");
  }

  if (targetRes.data.role !== "ADMIN") {
    const { error: roleError } = await service
      .from("profiles")
      .update({ role: "SPEAKER" })
      .eq("id", userId);
    if (roleError) {
      log.error("adminCreateSpeaker: role update failed", { userId, cause: roleError });
      incomplete.push("their role was not changed to speaker");
    } else {
      // Keep the JWT claim RLS reads in step with the table (see syncRoleClaim)
      const claimError = await syncRoleClaim(userId, "SPEAKER");
      if (claimError) {
        log.error("adminCreateSpeaker: role claim sync failed", { userId, cause: claimError });
        incomplete.push("their sign-in role was not updated");
      }
    }
  }

  revalidatePath("/admin/speakers");

  if (incomplete.length > 0) {
    return {
      error: `Speaker profile created, but ${incomplete.join(" and ")}. Fix this before they start taking bookings.`,
    };
  }
  return { data: sp };
}

export async function adminToggleSpeakerStatus(speakerProfileId: string, active: boolean) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  if (!z.string().uuid().safeParse(speakerProfileId).success) return { error: "Invalid speaker" };
  if (typeof active !== "boolean") return { error: "Invalid status" };

  const service = createServiceClient();
  const { data, error } = await service
    .from("speaker_profiles")
    .update({ status: active ? "ACTIVE" : "INACTIVE" })
    .eq("id", speakerProfileId)
    .select("id, status")
    .maybeSingle();

  if (error) return { error: toUserError(error, "Could not update the speaker") };
  if (!data) return { error: "Speaker not found" };

  revalidatePath("/admin/speakers");
  return { data };
}

export async function adminSearchUsers(query: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError, data: null };

  const q = typeof query === "string" ? query.trim().slice(0, 200) : "";
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

  if (error) return { error: toUserError(error, "Search failed. Please try again."), data: null };
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

  if (error) return { error: toUserError(error, "Could not send your message") };

  // No revalidatePath: ChatPanel appends the returned row and realtime
  // delivers it to the other participants. Re-rendering the whole admin
  // booking page on every message bought nothing.
  return { data };
}
