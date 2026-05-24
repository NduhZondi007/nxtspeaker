"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_MESSAGE_LENGTH = 4000;

export async function sendMessage(bookingId: string, content: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message cannot be empty" };
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` };
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
