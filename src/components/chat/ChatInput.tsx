"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { BrandMentionCard } from "./BrandMentionCard";
import { useToast } from "@/components/ui/Toast";
import type { Message } from "@/lib/types/database";

export interface SendResult {
  error?: string;
  /** The stored message, so the thread can show it without waiting on realtime. */
  data?: Message;
}

interface ChatInputProps {
  /** Resolves with `{ error }` when the message could not be delivered. */
  onSend: (content: string) => Promise<SendResult | void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showBrandCard = /nxtspeaker/i.test(value);
  const { error } = useToast();

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    // Clear straight away and keep the box enabled: disabling it for the
    // round trip blocked typing and dropped focus after every send.
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // A failed send must not lose what the user wrote — put it back, unless
    // they have already started typing something new.
    function restore(reason: string) {
      setValue((current) => current || trimmed);
      error("Message not sent", reason);
    }

    try {
      const result = await onSend(trimmed);
      if (result?.error) restore(result.error);
    } catch (err) {
      restore(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  return (
    <div className="relative flex items-end gap-3 p-4 border-t border-line bg-white">
      {showBrandCard && <BrandMentionCard />}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        rows={1}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        className="flex-1 resize-none px-3 py-2.5 text-sm border border-line rounded-[8px] bg-white text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-colors disabled:opacity-50"
        style={{ minHeight: "42px", maxHeight: "120px" }}
      />
      <button
        onClick={handleSend}
        aria-label="Send message"
        disabled={!value.trim() || disabled || sending}
        className="w-10 h-10 rounded-[8px] bg-primary text-white flex items-center justify-center transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
      >
        {sending ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send size={16} />
        )}
      </button>
    </div>
  );
}
