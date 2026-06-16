"use client";

import { useEffect, useRef } from "react";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLocked } from "@/components/chat/ChatLocked";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import { canChat } from "@/lib/utils/booking";
import type { Booking, Message, Profile } from "@/lib/types/database";

interface ChatPanelProps {
  booking: Booking;
  initialMessages: Message[];
  currentUser: Profile;
  onSend: (bookingId: string, content: string) => Promise<void>;
}

export function ChatPanel({ booking, initialMessages, currentUser, onSend }: ChatPanelProps) {
  const chatEnabled = canChat(booking.status);
  const { messages } = useRealtimeMessages(booking.id, initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!chatEnabled) {
    return <ChatLocked />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-sm text-mid-gray">
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
                  <p className="text-[10px] text-mid-gray px-1">
                    {msg.profiles?.full_name ?? "Participant"}
                  </p>
                )}
                <div
                  className={[
                    "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
                    isMe
                      ? "bg-gold text-ink rounded-br-md"
                      : "bg-warm-gray text-charcoal rounded-bl-md",
                  ].join(" ")}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-mid-gray px-1">
                  {new Date(msg.created_at).toLocaleTimeString("en-ZA", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={(content) => onSend(booking.id, content)} />
    </div>
  );
}
