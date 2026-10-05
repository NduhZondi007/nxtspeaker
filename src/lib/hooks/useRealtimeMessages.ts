"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message, Profile } from "@/lib/types/database";

/** Adds a message unless one with the same id is already in the thread. */
function withMessage(prev: Message[], message: Message): Message[] {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}

export function useRealtimeMessages(
  bookingId: string,
  initialMessages: Message[] = [],
  currentUser?: Profile
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  // Seeded with the viewer's own profile so their messages never wait on a
  // `profiles` round trip before rendering.
  const profileCache = useRef<Map<string, Message["profiles"]>>(
    new Map(currentUser ? [[currentUser.id, currentUser]] : [])
  );

  // `initialMessages` seeds state only on first render, so navigating from
  // one booking's thread to another (or a router.refresh() that returns new
  // server-rendered messages) left the previous booking's thread on screen.
  // Re-seed whenever the server hands us a different thread or a longer one.
  const initialIds = initialMessages.map((m) => m.id).join(",");
  useEffect(() => {
    setMessages(initialMessages);
    profileCache.current.clear();
    if (currentUser) profileCache.current.set(currentUser.id, currentUser);
    // `initialIds` is a stable digest of the prop; depending on the array
    // itself would re-run on every render because the parent rebuilds it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, initialIds]);

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

          setMessages((prev) => withMessage(prev, newMessage));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [bookingId]);

  // The sender's copy arrives from the server action, usually before the
  // realtime INSERT; whichever lands second is dropped by id.
  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => withMessage(prev, message));
  }, []);

  return { messages, setMessages, appendMessage };
}
