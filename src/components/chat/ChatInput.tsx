"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { BrandMentionCard } from "./BrandMentionCard";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const showBrandCard = /nxtspeaker/i.test(value);

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
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
        disabled={disabled || sending}
        rows={1}
        placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
        className="flex-1 resize-none px-3 py-2.5 text-sm border border-line rounded-[8px] bg-white text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all disabled:opacity-50"
        style={{ minHeight: "42px", maxHeight: "120px" }}
      />
      <button
        onClick={handleSend}
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
