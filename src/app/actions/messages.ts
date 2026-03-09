"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMessage(bookingId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("messages")
    .insert({
      booking_id: bookingId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select("*, profiles(*)")
    .single();

  if (error) return { error: error.message };

  return { data };
}
