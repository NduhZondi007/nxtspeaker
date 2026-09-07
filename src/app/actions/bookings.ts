"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  canClientCancel,
  canSpeakerTransition,
  isBookingStatus,
  validateBookingDates,
} from "@/lib/utils/booking";
import type { BookingStatus, EventFormat } from "@/lib/types/database";

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

// Server Action arguments are deserialised JSON: the `CreateBookingInput`
// annotation is erased at build time, so everything below is validated at
// runtime. Mirrors the schema used by the equivalent REST route
// (src/app/api/bookings/route.ts) so the two entry points cannot drift.
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

  // Verify caller is a CLIENT — speakers must not create bookings
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "CLIENT") return { error: "Only clients can create bookings" };

  const parsed = CreateBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid booking details" };
  }
  const booking = parsed.data;

  const dateError = validateBookingDates(booking.event_date, booking.event_end_date);
  if (dateError) return { error: dateError };

  // Always look up the speaker's listed fee — never trust the client-supplied value
  const { data: speaker } = await supabase
    .from("speaker_profiles")
    .select("speaking_fee_zar, status")
    .eq("id", booking.speaker_id)
    .eq("status", "ACTIVE")
    .single();

  if (!speaker) return { error: "Speaker not found or unavailable" };

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

  if (error) return { error: error.message };

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
  const { data: speakerProfile } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!speakerProfile) return { error: "Only speakers can update booking status" };

  const { data: current } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("speaker_id", speakerProfile.id)
    .single();

  if (!current) return { error: "Booking not found" };
  if (!canSpeakerTransition(current.status as BookingStatus, status)) {
    return { error: `Cannot change a ${current.status.toLowerCase()} booking to ${status.toLowerCase()}` };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("speaker_id", speakerProfile.id) // enforce ownership at DB layer too
    .select()
    .single();

  if (error) return { error: error.message };

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

  const { data: current } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();

  if (!current) return { error: "Booking not found" };
  if (!canClientCancel(current.status as BookingStatus)) {
    return { error: `A ${current.status.toLowerCase()} booking cannot be cancelled` };
  }

  const { data, error } = await supabase
    .from("bookings")
    .update({
      status: "CANCELLED",
      cancelled_reason: reason?.trim().slice(0, 1000) || null,
    })
    .eq("id", bookingId)
    .eq("client_id", user.id) // clients can only cancel their own bookings
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/client/bookings/${bookingId}`);
  revalidatePath("/client/bookings");
  revalidatePath("/client/dashboard");
  revalidatePath("/speaker/bookings");

  return { data };
}
