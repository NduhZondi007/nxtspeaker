"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  quoted_fee_zar: number;
}

export async function createBooking(input: CreateBookingInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: user.id,
      speaker_id: input.speaker_id,
      event_name: input.event_name,
      audience_demographics: input.audience_demographics,
      exact_location: input.exact_location,
      event_organiser: input.event_organiser,
      associated_company: input.associated_company,
      event_date: input.event_date,
      event_end_date: input.event_end_date || null,
      duration_minutes: input.duration_minutes,
      event_format: input.event_format,
      estimated_audience: input.estimated_audience || null,
      client_notes: input.client_notes || null,
      hospitality_rider_agreed: input.hospitality_rider_agreed,
      hospitality_agreed_at: input.hospitality_rider_agreed ? new Date().toISOString() : null,
      quoted_fee_zar: input.quoted_fee_zar,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "CANCELLED", cancelled_reason: reason || null })
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/client/bookings/${bookingId}`);
  revalidatePath("/client/bookings");

  return { data };
}
