import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useRealtimeBookingStatus } from "@/lib/hooks/useRealtimeBookingStatus";
import { ToastProvider } from "@/components/ui/Toast";

const mockRefresh = vi.fn();
const mockUnsubscribe = vi.fn();
const mockRemoveChannel = vi.fn();

// Captures the callback registered for postgres_changes so the test can
// simulate a realtime UPDATE payload arriving from Supabase.
let registeredCallback: ((payload: unknown) => void) | null = null;

const mockChannel = {
  on: vi.fn((_event: string, _filter: unknown, cb: (payload: unknown) => void) => {
    registeredCallback = cb;
    return mockChannel;
  }),
  subscribe: vi.fn(() => mockChannel),
  unsubscribe: mockUnsubscribe,
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn(() => mockChannel),
    removeChannel: mockRemoveChannel,
  }),
}));

function Harness({ clientId }: { clientId: string }) {
  useRealtimeBookingStatus(clientId);
  return null;
}

describe("useRealtimeBookingStatus", () => {
  beforeEach(() => {
    registeredCallback = null;
    mockRefresh.mockClear();
    mockUnsubscribe.mockClear();
    mockRemoveChannel.mockClear();
  });

  it("subscribes to bookings UPDATE events filtered by client_id", () => {
    render(
      <ToastProvider>
        <Harness clientId="client-1" />
      </ToastProvider>
    );

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: "client_id=eq.client-1",
      }),
      expect.any(Function)
    );
  });

  it("refreshes the router and shows a toast when a booking's status changes", async () => {
    render(
      <ToastProvider>
        <Harness clientId="client-1" />
      </ToastProvider>
    );

    expect(registeredCallback).not.toBeNull();

    registeredCallback!({
      new: { id: "booking-1", status: "CONFIRMED", event_name: "Annual Conference" },
      old: { id: "booking-1", status: "PENDING" },
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  it("ignores updates where the status did not change", () => {
    render(
      <ToastProvider>
        <Harness clientId="client-1" />
      </ToastProvider>
    );

    registeredCallback!({
      new: { id: "booking-1", status: "PENDING", client_notes: "updated notes" },
      old: { id: "booking-1", status: "PENDING" },
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
