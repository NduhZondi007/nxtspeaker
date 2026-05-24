"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types/database";

export function useRealtimeMessages(bookingId: string, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`booking:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${bookingId}`,
        },
        async (payload) => {
          // Select only what the chat UI needs — avoid leaking email/phone/company
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, role")
            .eq("id", payload.new.sender_id)
            .single();

          const newMessage: Message = {
            ...(payload.new as Message),
            profiles: (profile ?? undefined) as Message["profiles"],
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { messages, setMessages };
}
