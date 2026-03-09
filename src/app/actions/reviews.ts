"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface SubmitReviewInput {
  bookingId: string;
  speakerId: string;
  rating: number;
  headline?: string;
  body?: string;
}

export async function submitReview(input: SubmitReviewInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify booking is completed and belongs to this client
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, client_id")
    .eq("id", input.bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };
  if (booking.status !== "COMPLETED") return { error: "Reviews can only be submitted for completed bookings" };
  if (booking.client_id !== user.id) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      reviewer_id: user.id,
      speaker_id: input.speakerId,
      rating: input.rating,
      headline: input.headline || null,
      body: input.body || null,
      verified: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/client/bookings/${input.bookingId}`);
  revalidatePath("/client/bookings");

  return { data };
}
