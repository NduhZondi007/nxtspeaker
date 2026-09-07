"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

interface SubmitReviewInput {
  bookingId: string;
  /**
   * Accepted for call-site readability but deliberately ignored — the speaker
   * a review is attributed to is read off the booking, never taken from the
   * caller. Trusting it let a client post a genuine, `verified: true` review
   * against *any* speaker's `avg_rating`, since the RLS INSERT policy only
   * checks that the booking belongs to the reviewer and is completed.
   */
  speakerId?: string;
  rating: number;
  headline?: string;
  body?: string;
}

const SubmitReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking"),
  rating: z
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  headline: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().max(4000).optional().nullable(),
});

export async function submitReview(input: SubmitReviewInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = SubmitReviewSchema.safeParse({
    bookingId: input.bookingId,
    rating: input.rating,
    headline: input.headline ?? null,
    body: input.body ?? null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid review" };
  }
  const review = parsed.data;

  // Verify booking is completed and belongs to this client, and read the
  // speaker straight off it
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, client_id, speaker_id")
    .eq("id", review.bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };
  if (booking.status !== "COMPLETED") return { error: "Reviews can only be submitted for completed bookings" };
  if (booking.client_id !== user.id) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: review.bookingId,
      reviewer_id: user.id,
      speaker_id: booking.speaker_id, // authoritative — not the client's value
      rating: review.rating,
      headline: review.headline || null,
      body: review.body || null,
      verified: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/client/bookings/${input.bookingId}`);
  revalidatePath("/client/bookings");

  return { data };
}
