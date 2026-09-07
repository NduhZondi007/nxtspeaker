"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canChat } from "@/lib/utils/booking";
import type { BookingStatus } from "@/lib/types/database";

const MAX_MESSAGE_LENGTH = 4000;

export async function sendMessage(bookingId: string, content: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!z.string().uuid().safeParse(bookingId).success) return { error: "Invalid booking" };

  const trimmed = typeof content === "string" ? content.trim() : "";
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` };
  }

  // RLS is the real gate, but it can only answer "allowed / not allowed" —
  // a rejected insert surfaces as an opaque policy-violation string. Reading
  // the booking first lets us say *why*, and applies the same `canChat` rule
  // the UI uses (RLS alone still permits messages on a CANCELLED booking,
  // whose thread the UI shows as locked).
  const { data: booking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };
  if (!canChat(booking.status as BookingStatus)) {
    return { error: "Chat is not available for this booking" };
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      booking_id: bookingId,
      sender_id: user.id,
      content: trimmed,
    })
    .select("*, profiles(*)")
    .single();

  if (error) return { error: error.message };

  return { data };
}
