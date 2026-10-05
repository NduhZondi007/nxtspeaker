"use client";

import { useEffect, useRef } from "react";
import { ChatInput, type SendResult } from "@/components/chat/ChatInput";
import { ChatLocked } from "@/components/chat/ChatLocked";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { canChat, formatTimeSAST } from "@/lib/utils/booking";
import type { BookingStatus, Message, Profile } from "@/lib/types/database";

interface ChatPanelProps {
  /** Only the id and status are needed — the full booking row (with the other
   *  party's joined profile) has no business being serialised to the browser. */
  bookingId: string;
  status: BookingStatus;
  initialMessages: Message[];
  currentUser: Profile;
  onSend: (bookingId: string, content: string) => Promise<SendResult | void>;
}

export function ChatPanel({ bookingId, status, initialMessages, currentUser, onSend }: ChatPanelProps) {
  const chatEnabled = canChat(status);
  const { messages, appendMessage } = useRealtimeMessages(bookingId, initialMessages, currentUser);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Jump to the bottom on first load — smooth-scrolling a long history made
  // opening a thread feel slow. Only new messages glide in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: hasScrolledRef.current ? "smooth" : "auto" });
    hasScrolledRef.current = true;
  }, [messages]);

  async function handleSend(content: string): Promise<SendResult | void> {
    const result = await onSend(bookingId, content);
    if (result?.data) appendMessage({ ...result.data, profiles: currentUser });
    return result;
  }

  if (!chatEnabled) {
    return <ChatLocked />;
  }

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Messages"
      >
        {messages.length === 0 && (
          <div className="text-center py-8 text-sm text-muted">
            No messages yet. Start the conversation.
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                {!isMe && (
                  <p className="text-[10px] text-muted px-1">
                    {msg.profiles?.full_name ?? "Participant"}
                  </p>
                )}
                <div
                  className={[
                    "px-3.5 py-2.5 rounded-[8px] text-sm leading-relaxed break-words",
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-soft text-ink rounded-bl-sm",
                  ].join(" ")}
                >
                  {msg.content}
                </div>
                {/* Explicit zone and clock: the server renders in UTC and the
                    browser in SAST, which mismatched on hydration. */}
                <time dateTime={msg.created_at} className="text-[10px] text-muted px-1">
                  {formatTimeSAST(msg.created_at)}
                </time>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} />
    </div>
  );
}
