import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DiscoverClient } from "@/app/client/discover/DiscoverClient";
import { ToastProvider } from "@/components/ui/Toast";
import { createBooking } from "@/app/actions/bookings";
import type { SpeakerProfile } from "@/lib/types/database";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/app/actions/bookings", () => ({
  createBooking: vi.fn(),
}));

vi.mock("@/components/layout/AuthProvider", () => ({
  useAuth: () => ({
    profile: { id: "client-1", full_name: "Test Client", role: "CLIENT" },
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
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
  SpeakerModal: ({ speaker, onBook }: { speaker: SpeakerProfile | null; onBook: (s: SpeakerProfile) => void }) =>
    speaker ? <button onClick={() => onBook(speaker)}>book-{speaker.id}</button> : null,
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

describe("DiscoverClient / handleSubmitBooking", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.mocked(createBooking).mockReset();
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
});
