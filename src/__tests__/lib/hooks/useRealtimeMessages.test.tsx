import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeMessages } from "@/lib/hooks/useRealtimeMessages";
import type { Message, Profile } from "@/lib/types/database";

let registeredCallback: ((payload: { new: Record<string, unknown> }) => Promise<void>) | null = null;
const mockFrom = vi.fn();

const mockChannel = {
  on: vi.fn((_e: string, _f: unknown, cb: typeof registeredCallback) => {
    registeredCallback = cb;
    return mockChannel;
  }),
  subscribe: vi.fn(() => mockChannel),
  unsubscribe: vi.fn(),
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
    from: mockFrom,
  }),
}));

const me = { id: "user-1", full_name: "Lerato Client", role: "CLIENT" } as Profile;

const row = {
  id: "msg-1",
  booking_id: "booking-1",
  sender_id: "user-1",
  content: "Hello",
  read_at: null,
  created_at: "2026-10-05T10:00:00Z",
};

describe("useRealtimeMessages", () => {
  beforeEach(() => {
    registeredCallback = null;
    mockFrom.mockReset();
  });

  it("keeps one copy when appendMessage runs before the realtime INSERT", async () => {
    const { result } = renderHook(() => useRealtimeMessages("booking-1", [], me));

    act(() => result.current.appendMessage({ ...row, profiles: me } as Message));
    await act(() => registeredCallback!({ new: row }));

    expect(result.current.messages).toHaveLength(1);
  });

  it("keeps one copy when the realtime INSERT arrives first", async () => {
    const { result } = renderHook(() => useRealtimeMessages("booking-1", [], me));

    await act(() => registeredCallback!({ new: row }));
    act(() => result.current.appendMessage({ ...row, profiles: me } as Message));

    expect(result.current.messages).toHaveLength(1);
  });

  it("does not look up the current user's profile for their own messages", async () => {
    const { result } = renderHook(() => useRealtimeMessages("booking-1", [], me));

    await act(() => registeredCallback!({ new: row }));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result.current.messages[0].profiles).toEqual(me);
  });
});
