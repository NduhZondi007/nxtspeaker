import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverClient } from "@/app/client/discover/DiscoverClient";
import { ToastProvider } from "@/components/ui/Toast";
import { createBooking } from "@/app/actions/bookings";
import type { SpeakerProfile } from "@/lib/types/database";

const mockPush = vi.fn();

const { mockMaybeSingle, mockReviewsOrder, mockGetUser, authState, mockGetSpeakers } = vi.hoisted(() => ({
  mockGetSpeakers: vi.fn(),
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

vi.mock("@/lib/data/speakers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/data/speakers")>()),
  getSpeakers: (...args: unknown[]) => mockGetSpeakers(...args),
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
    reviews,
    reviewsLoading,
    onBook,
    onClose,
    bookingLoading,
  }: {
    speaker: SpeakerProfile | null;
    reviews: { id: string }[];
    reviewsLoading?: boolean;
    onBook: (s: SpeakerProfile) => void;
    onClose: () => void;
    bookingLoading?: boolean;
  }) =>
    speaker ? (
      <div>
        <button onClick={() => onBook(speaker)} disabled={bookingLoading}>
          {bookingLoading ? "booking-loading" : `book-${speaker.id}`}
        </button>
        <button onClick={onClose}>close-modal</button>
        <p>{reviewsLoading ? "reviews-loading" : `reviews:${reviews.map((r) => r.id).join(",")}`}</p>
      </div>
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

function makeListable(id: string, name: string, title: string): SpeakerProfile {
  return {
    id,
    title,
    expertise: ["Leadership"],
    profiles: { id: `u-${id}`, full_name: name, avatar_url: null },
  } as unknown as SpeakerProfile;
}

describe("DiscoverClient / search", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockGetSpeakers.mockReset().mockResolvedValue({ data: [], error: null, hasMore: false });
    mockReviewsOrder.mockReset().mockResolvedValue({ data: [], error: null });
  });

  it("filters the loaded speakers in memory and never refetches on a search keystroke", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DiscoverClient
          initialSpeakers={[
            makeListable("a", "Thandi Mokoena", "AI Futurist"),
            makeListable("b", "Sam Ndlovu", "Sales Coach"),
          ]}
        />
      </ToastProvider>
    );

    await user.type(screen.getByLabelText(/search speakers/i), "futurist");
    // Longer than the 300ms fetch debounce.
    await act(() => new Promise((r) => setTimeout(r, 400)));

    expect(screen.getByText("select-a")).toBeInTheDocument();
    expect(screen.queryByText("select-b")).not.toBeInTheDocument();
    expect(mockGetSpeakers).not.toHaveBeenCalled();
  });
});

describe("DiscoverClient / load more", () => {
  beforeEach(() => {
    mockGetSpeakers.mockReset();
  });

  it("fetches the next page at the next offset and appends it", async () => {
    mockGetSpeakers.mockResolvedValue({
      data: [makeListable("c", "Lerato", "Coach")],
      error: null,
      hasMore: false,
    });
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DiscoverClient initialSpeakers={[makeListable("a", "Ann", "Futurist")]} initialHasMore />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: /load more/i }));

    expect(await screen.findByText("select-c")).toBeInTheDocument();
    expect(screen.getByText("select-a")).toBeInTheDocument();
    expect(mockGetSpeakers).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ offset: 24 })
    );
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });

  it("hides load more when the server said there is no next page", () => {
    render(
      <ToastProvider>
        <DiscoverClient initialSpeakers={[makeListable("a", "Ann", "Futurist")]} />
      </ToastProvider>
    );
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});

describe("DiscoverClient / reviews", () => {
  beforeEach(() => {
    mockReviewsOrder.mockReset();
  });

  it("shows a loading state instead of the previous speaker's reviews, and ignores a late response", async () => {
    const pending: Record<string, (v: unknown) => void> = {};
    let call = 0;
    mockReviewsOrder.mockImplementation(
      () =>
        new Promise((resolve) => {
          pending[call++ === 0 ? "a" : "b"] = resolve;
        })
    );
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <DiscoverClient
          initialSpeakers={[makeListable("a", "Ann", "One"), makeListable("b", "Ben", "Two")]}
        />
      </ToastProvider>
    );

    await user.click(screen.getByText("select-a"));
    expect(screen.getByText("reviews-loading")).toBeInTheDocument();
    await user.click(screen.getByText("close-modal"));
    await user.click(screen.getByText("select-b"));
    expect(screen.getByText("reviews-loading")).toBeInTheDocument();

    await act(async () => pending.b({ data: [{ id: "review-b" }], error: null }));
    expect(screen.getByText("reviews:review-b")).toBeInTheDocument();

    // Speaker A's slower response lands afterwards; it must not replace B's.
    await act(async () => pending.a({ data: [{ id: "review-a" }], error: null }));
    expect(screen.getByText("reviews:review-b")).toBeInTheDocument();
  });
});
