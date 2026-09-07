import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverClient } from "@/app/client/discover/DiscoverClient";
import { ToastProvider } from "@/components/ui/Toast";
import { createBooking } from "@/app/actions/bookings";
import type { SpeakerProfile } from "@/lib/types/database";

const mockPush = vi.fn();

const { mockMaybeSingle, mockReviewsOrder, mockGetUser, authState } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockReviewsOrder: vi.fn(),
  mockGetUser: vi.fn(),
  // Mutable so a test can simulate AuthProvider's profile fetch coming back
  // empty, which is the condition that used to strand the booking flow.
  authState: {
    profile: { id: "client-1", full_name: "Test Client", role: "CLIENT" } as unknown,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/bookings", () => ({
  createBooking: vi.fn(),
}));

vi.mock("@/components/layout/AuthProvider", () => ({
  useAuth: () => ({ profile: authState.profile }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
          order: () => mockReviewsOrder(),
        }),
      }),
    }),
  }),
}));

// Presentational children are mocked out — this test exercises DiscoverClient's
// own orchestration (select -> book -> submit -> redirect), not their internals.
vi.mock("@/components/speakers/SpeakerCard", () => ({
  SpeakerCard: ({ speaker, onClick }: { speaker: SpeakerProfile; onClick: (s: SpeakerProfile) => void }) => (
    <button onClick={() => onClick(speaker)}>select-{speaker.id}</button>
  ),
}));

vi.mock("@/components/speakers/SpeakerModal", () => ({
  SpeakerModal: ({
    speaker,
    onBook,
    bookingLoading,
  }: {
    speaker: SpeakerProfile | null;
    onBook: (s: SpeakerProfile) => void;
    bookingLoading?: boolean;
  }) =>
    speaker ? (
      <button onClick={() => onBook(speaker)} disabled={bookingLoading}>
        {bookingLoading ? "booking-loading" : `book-${speaker.id}`}
      </button>
    ) : null,
}));

vi.mock("@/components/bookings/BookingForm", () => ({
  BookingForm: ({ onSubmit }: { onSubmit: (data: unknown) => Promise<void> }) => (
    <button
      onClick={() =>
        onSubmit({
          event_name: "Annual Conference",
          audience_demographics: "Executives",
          exact_location: "Cape Town",
          event_organiser: "Test Client",
          associated_company: "Acme",
          event_date: "2027-01-01",
          event_end_date: "",
          duration_minutes: 60,
          event_format: "in-person",
          estimated_audience: undefined,
          client_notes: "",
          hospitality_rider_agreed: true,
        })
      }
    >
      submit-booking
    </button>
  ),
}));

const speaker = {
  id: "speaker-1",
  expertise: ["Leadership"],
  profiles: { full_name: "Jane Speaker" },
} as unknown as SpeakerProfile;

function renderDiscoverClient() {
  return render(
    <ToastProvider>
      <DiscoverClient initialSpeakers={[speaker]} />
    </ToastProvider>
  );
}

describe("DiscoverClient / handleBook", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockReviewsOrder.mockReset().mockResolvedValue({ data: [], error: null });
    mockGetUser.mockReset().mockResolvedValue({ data: { user: { id: "client-1" } } });
    authState.profile = { id: "client-1", full_name: "Test Client", role: "CLIENT" };
  });

  it("opens the booking wizard even when the client-side profile is unavailable — never closes the speaker card onto an empty screen", async () => {
    // AuthProvider swallows the error from its own profiles fetch, so a signed-in
    // client can legitimately end up with profile === null. The booking modal
    // used to be gated on it while handleBook closed the speaker card
    // regardless, so the card vanished and nothing replaced it.
    authState.profile = null;
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));

    // The wizard must be on screen, not a blank grid.
    expect(await screen.findByText("submit-booking")).toBeInTheDocument();
    expect(screen.queryByText("book-speaker-1")).not.toBeInTheDocument();
  });

  it("keeps the profile modal visible with a loading indicator while the rider fetch is in flight — never drops to the bare grid with no feedback", async () => {
    let resolveRider!: (v: { data: null; error: null }) => void;
    mockMaybeSingle.mockReturnValue(
      new Promise((resolve) => {
        resolveRider = resolve;
      })
    );
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));

    // Still mid-fetch: the mocked SpeakerModal must still be rendering (now
    // showing a loading indicator) — never a frame with neither modal shown.
    expect(await screen.findByText("booking-loading")).toBeInTheDocument();
    expect(screen.queryByText("submit-booking")).not.toBeInTheDocument();

    resolveRider({ data: null, error: null });

    expect(await screen.findByText("submit-booking")).toBeInTheDocument();
  });

  it("opens the booking wizard once the rider fetch resolves, with the fetched rider", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: "rider-1", speaker_id: "speaker-1" },
      error: null,
    });
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));

    expect(await screen.findByText("submit-booking")).toBeInTheDocument();
  });

  it("logs (does not silently discard) a rider-fetch error, and still opens the wizard so the client isn't stranded", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied for table hospitality_riders" },
    });
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));

    expect(await screen.findByText("submit-booking")).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("recovers from a thrown/rejected rider fetch instead of leaving the button permanently loading", async () => {
    // Unlike a resolved { error } (handled above), this simulates the fetch
    // itself rejecting — a network failure or unexpected client exception.
    // Production symptom this guards against: the button spins forever and
    // the wizard never opens because nothing ever clears bookingLoading.
    mockMaybeSingle.mockRejectedValue(new Error("Failed to fetch"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));

    expect(await screen.findByText("submit-booking")).toBeInTheDocument();
    expect(screen.queryByText("booking-loading")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

describe("DiscoverClient / handleSubmitBooking", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(createBooking).mockReset();
    mockMaybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    mockReviewsOrder.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it("redirects to the new booking's detail page on success instead of just closing the modal", async () => {
    vi.mocked(createBooking).mockResolvedValue({ data: { id: "booking-123" } } as never);
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));
    await user.click(await screen.findByText("submit-booking"));

    expect(mockPush).toHaveBeenCalledWith("/client/bookings/booking-123");
  });

  it("does not redirect when booking creation fails", async () => {
    vi.mocked(createBooking).mockResolvedValue({ error: "Speaker not found or unavailable" } as never);
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));
    await user.click(await screen.findByText("submit-booking"));

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an error toast (does not silently fail) when createBooking throws instead of resolving with an error", async () => {
    // Unlike a resolved { error } (handled above), this simulates the call
    // itself rejecting — a network failure or unexpected server action
    // exception. Without a try/catch, this is a silent unhandled rejection:
    // BookingForm's own local `finally` still re-enables its submit button,
    // but the user gets zero toast, success or error — no explanation at all.
    vi.mocked(createBooking).mockRejectedValue(new Error("Failed to fetch"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    renderDiscoverClient();

    await user.click(screen.getByText("select-speaker-1"));
    await user.click(await screen.findByText("book-speaker-1"));
    await user.click(await screen.findByText("submit-booking"));

    expect(await screen.findByText("Booking failed")).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
