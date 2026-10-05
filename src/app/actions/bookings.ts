"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";
import { toUserError } from "@/lib/errors";
import {
  canClientCancel,
  canSpeakerTransition,
  isBookingStatus,
  todayInSAST,
  validateBookingDates,
} from "@/lib/utils/booking";
import { isSpeakerListable } from "@/lib/utils/profile-completeness";
import type { BookingStatus, EventFormat, SpeakerProfile } from "@/lib/types/database";

interface CreateBookingInput {
  speaker_id: string;
  event_name: string;
  audience_demographics: string;
  exact_location: string;
  event_organiser: string;
  associated_company: string;
  event_date: string;
  event_end_date?: string;
  duration_minutes: number;
  event_format: EventFormat;
  estimated_audience?: number;
  client_notes?: string;
  hospitality_rider_agreed: boolean;
  // quoted_fee_zar is intentionally omitted — always fetched server-side
}

const log = createLogger("bookings");

/** Returned when a conditional update matched no row: someone else moved it. */
const CONFLICT_ERROR = "This booking was changed by someone else. Refresh the page and try again.";

// Server Action arguments are deserialised JSON: the `CreateBookingInput`
// annotation is erased at build time, so everything below is validated at
// runtime. This is the only booking-creation entry point — the duplicate
// REST route (src/app/api/bookings) had no caller and was removed.
const CreateBookingSchema = z.object({
  speaker_id: z.string().uuid("Invalid speaker"),
  event_name: z.string().trim().min(1, "Event name is required").max(200),
  audience_demographics: z.string().trim().min(1, "Audience demographics are required").max(2000),
  exact_location: z.string().trim().min(1, "Location is required").max(300),
  event_organiser: z.string().trim().min(1, "Event organiser is required").max(200),
  associated_company: z.string().trim().min(1, "Associated company is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  event_end_date: z.string().optional().nullable(),
  duration_minutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(15, "Duration must be at least 15 minutes")
    .max(480, "Duration cannot exceed 480 minutes"),
  event_format: z.enum(["in-person", "virtual", "hybrid"]),
  estimated_audience: z
    .number()
    .int()
    .positive("Estimated audience must be a positive number")
    .max(1_000_000)
    .optional()
    .nullable(),
  client_notes: z.string().trim().max(4000).optional().nullable(),
  hospitality_rider_agreed: z.boolean(),
});

export async function createBooking(input: CreateBookingInput) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking details" };
  }
  const booking = parsed.data;

  const dateError = validateBookingDates(booking.event_date, booking.event_end_date);
  if (dateError) return { error: dateError };

  // The role check and the fee lookup are independent — one round trip, not two.
  const [profileRes, speakerRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    // Always look up the speaker's listed fee — never trust the client-supplied value
    supabase
      .from("speaker_profiles")
      .select(
        "speaking_fee_zar, status, bio, expertise, languages, location, photo_urls, profiles(avatar_url)"
      )
      .eq("id", booking.speaker_id)
      .eq("status", "ACTIVE")
      .maybeSingle(),
  ]);

  if (profileRes.error) return { error: toUserError(profileRes.error, "Could not verify your account") };
  // Verify caller is a CLIENT — speakers must not create bookings
  if (profileRes.data?.role !== "CLIENT") return { error: "Only clients can create bookings" };

  if (speakerRes.error) return { error: toUserError(speakerRes.error, "Could not load this speaker") };
  const speaker = speakerRes.data;
  if (!speaker) return { error: "Speaker not found or unavailable" };

  // A speaker hidden from discovery for an incomplete profile must not be
  // bookable through a stale link or a hand-crafted request either — the same
  // rule that governs the listing governs the booking.
  if (!isSpeakerListable(speaker as unknown as Partial<SpeakerProfile>)) {
    return { error: "This speaker is not currently accepting bookings" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: user.id,
      speaker_id: booking.speaker_id,
      event_name: booking.event_name,
      audience_demographics: booking.audience_demographics,
      exact_location: booking.exact_location,
      event_organiser: booking.event_organiser,
      associated_company: booking.associated_company,
      event_date: booking.event_date,
      event_end_date: booking.event_end_date || null,
      duration_minutes: booking.duration_minutes,
      event_format: booking.event_format,
      estimated_audience: booking.estimated_audience || null,
      client_notes: booking.client_notes || null,
      hospitality_rider_agreed: booking.hospitality_rider_agreed,
      hospitality_agreed_at: booking.hospitality_rider_agreed ? new Date().toISOString() : null,
      quoted_fee_zar: speaker.speaking_fee_zar, // authoritative server-side value
      status: "PENDING",
    })
    .select()
    .single();

  if (error) return { error: toUserError(error, "Could not create the booking") };

  revalidatePath("/client/bookings");
  revalidatePath("/client/dashboard");

  return { data };
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };
  // `status` is client-supplied: without this guard any string reached the
  // UPDATE, and any *valid* status could be set from any other one — a
  // speaker could cancel a booking on the client's behalf, mark an event
  // COMPLETED before it happened, or re-open a declined request.
  if (!isBookingStatus(status)) return { error: "Invalid booking status" };

  // Only speakers may accept/decline/complete bookings — clients use cancelBooking
  const { data: speakerProfile, error: spError } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (spError) return { error: toUserError(spError, "Could not verify your speaker profile") };
  if (!speakerProfile) return { error: "Only speakers can update booking status" };

  const { data: current, error: readError } = await supabase
    .from("bookings")
    .select("status, event_date")
    .eq("id", bookingId)
    .eq("speaker_id", speakerProfile.id)
    .maybeSingle();

  if (readError) return { error: toUserError(readError, "Could not load the booking") };
  if (!current) return { error: "Booking not found" };
  const from = current.status as BookingStatus;
  if (!canSpeakerTransition(from, status)) {
    return { error: `Cannot change a ${from.toLowerCase()} booking to ${status.toLowerCase()}` };
  }

  // Completion starts the payout hold. Marking an event delivered before it
  // happened would start the clock on money for work not yet done.
  if (status === "COMPLETED" && String(current.event_date) > todayInSAST()) {
    return { error: "You can't mark an event delivered before the event date" };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("speaker_id", speakerProfile.id) // enforce ownership at DB layer too
    .eq("status", from) // and only from the state we validated against
    .select()
    .maybeSingle();

  if (error) return { error: toUserError(error, "Could not update the booking") };
  if (!data) return { error: CONFLICT_ERROR };

  revalidatePath(`/client/bookings/${bookingId}`);
  revalidatePath(`/speaker/bookings/${bookingId}`);
  revalidatePath("/client/bookings");
  revalidatePath("/speaker/bookings");
  revalidatePath("/speaker/dashboard");

  return { data };
}

export async function cancelBooking(bookingId: string, reason?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };

  const { data: current, error: readError } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .maybeSingle();

  if (readError) return { error: toUserError(readError, "Could not load the booking") };
  if (!current) return { error: "Booking not found" };
  const from = current.status as BookingStatus;
  if (!canClientCancel(from)) {
    return { error: `A ${from.toLowerCase()} booking cannot be cancelled` };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_reason: typeof reason === "string" ? reason.trim().slice(0, 1000) || null : null,
    })
    .eq("id", bookingId)
    .eq("client_id", user.id) // clients can only cancel their own bookings
    .eq("status", from) // a booking that became PAID meanwhile must go through refund
    .select()
    .maybeSingle();

  if (error) return { error: toUserError(error, "Could not cancel the booking") };
  if (!data) return { error: CONFLICT_ERROR };

  // A checkout opened before the cancellation is still live at Yoco. Closing
  // our payment rows means a late success lands on a CANCELLED payment for a
  // CANCELLED booking — the "owes a refund" state the admin reconciliation
  // view surfaces — and initiateBookingPayment cannot reuse the old row.
  // Payments have no client write policy, hence the service client.
  const { error: paymentError } = await createServiceClient()
    .from("payments")
    .update({ status: "CANCELLED" })
    .eq("booking_id", bookingId)
    .in("status", ["CREATED", "PENDING"]);

  if (paymentError) {
    // The booking is cancelled either way; the open payment needs a human.
    log.error("Could not close open payments for a cancelled booking", {
      bookingId,
      cause: paymentError,
    });
  }

  revalidatePath(`/client/bookings/${bookingId}`);
  revalidatePath("/client/bookings");
  revalidatePath("/client/dashboard");
  revalidatePath("/speaker/bookings");

  return { data };
}
