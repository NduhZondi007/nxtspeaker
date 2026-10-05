import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { Booking, Message, Profile } from "@/lib/types/database";

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: vi.fn() }),
}));

// A channel that never delivers: anything rendered must come from onSend.
vi.mock("@/lib/supabase/client", () => {
  const channel = { on: () => channel, subscribe: () => channel, unsubscribe: () => {} };
  return { createClient: () => ({ channel: () => channel, removeChannel: () => {} }) };
});

Element.prototype.scrollIntoView = vi.fn();

const me = { id: "user-1", full_name: "Lerato Client", role: "CLIENT" } as Profile;
const booking = { id: "booking-1", status: "CONFIRMED" } as Booking;

describe("ChatPanel", () => {
  it("shows a sent message as soon as onSend returns it, without a realtime event", async () => {
    const user = userEvent.setup();
    const sent: Message = {
      id: "msg-1", booking_id: "booking-1", sender_id: "user-1",
      content: "Is the venue confirmed?", read_at: null, created_at: "2026-10-05T10:00:00Z",
    };
    render(
      <ChatPanel booking={booking} initialMessages={[]} currentUser={me}
        onSend={async () => ({ data: sent })} />
    );

    await user.type(screen.getByRole("textbox"), "Is the venue confirmed?{Enter}");

    expect(await screen.findByText("Is the venue confirmed?")).toBeInTheDocument();
  });
});
