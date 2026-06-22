"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types/database";

export function useRealtimeMessages(bookingId: string, initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const profileCache = useRef<Map<string, Message["profiles"]>>(new Map());

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
          const senderId = payload.new.sender_id as string;
          let senderProfile = profileCache.current.get(senderId);

          if (!senderProfile) {
            // Select only what the chat UI needs — avoid leaking email/phone/company
            const { data } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, role")
              .eq("id", senderId)
              .single();
            senderProfile = (data ?? undefined) as Message["profiles"];
            if (senderProfile) profileCache.current.set(senderId, senderProfile);
          }

          const newMessage: Message = {
            ...(payload.new as Message),
            profiles: senderProfile,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  return { messages, setMessages };
}
