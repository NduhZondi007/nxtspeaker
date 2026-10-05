import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeakerModal } from "@/components/speakers/SpeakerModal";
import type { Review, SpeakerProfile } from "@/lib/types/database";

function makeSpeaker(id: string, name: string, overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
  return {
    id,
    user_id: `u-${id}`,
    title: "Keynote",
    bio: "Bio",
    expertise: ["Leadership"],
    languages: ["English"],
    location: "Durban",
    speaking_fee_zar: 10000,
    fee_currency: "ZAR",
    level: 3,
    available: true,
    virtual_available: false,
    hybrid_available: false,
    tags: [],
    total_events: 2,
    avg_rating: 4.2,
    profile_video_url: null,
    photo_urls: ["https://x.supabase.co/storage/v1/object/public/speaker-photos/a.png"],
    status: "ACTIVE",
    created_at: "",
    updated_at: "",
    profiles: { id: `u-${id}`, full_name: name, avatar_url: null } as SpeakerProfile["profiles"],
    ...overrides,
  };
}

const review = {
  id: "r1",
  rating: 5,
  headline: "Great",
  body: "Loved it",
  verified: true,
  profiles: { id: "c1", full_name: "Client One", avatar_url: null },
} as unknown as Review;

function renderModal(props: Partial<React.ComponentProps<typeof SpeakerModal>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <SpeakerModal
      speaker={makeSpeaker("a", "Ann Speaker")}
      reviews={[]}
      onClose={onClose}
      onBook={vi.fn()}
      {...props}
    />
  );
  return { onClose, user: userEvent.setup(), ...utils };
}

describe("SpeakerModal", () => {
  it("names the dialog after the speaker", () => {
    renderModal();
    expect(screen.getByRole("dialog", { name: /ann speaker/i })).toBeInTheDocument();
  });

  it("shows the tier label from the shared constants", () => {
    renderModal();
    expect(screen.getByText("Established Expert")).toBeInTheDocument();
  });

  it("exposes tabs with tablist/tab/tabpanel semantics", async () => {
    const { user } = renderModal({ reviews: [review] });
    const tablist = screen.getByRole("tablist");
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: /reviews/i }));
    expect(screen.getByRole("tab", { name: /reviews/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Client One");
  });

  it("returns to the profile tab when a different speaker is shown", async () => {
    const { user, rerender, onClose } = renderModal();
    await user.click(screen.getByRole("tab", { name: /booking/i }));

    rerender(
      <SpeakerModal speaker={makeSpeaker("b", "Ben Speaker")} reviews={[]} onClose={onClose} onBook={vi.fn()} />
    );

    expect(screen.getByRole("tab", { name: /profile/i })).toHaveAttribute("aria-selected", "true");
  });

  it("shows a loading state rather than 'No reviews yet' while reviews load", async () => {
    const { user } = renderModal({ reviewsLoading: true });
    await user.click(screen.getByRole("tab", { name: /reviews/i }));
    expect(screen.queryByText(/no reviews yet/i)).not.toBeInTheDocument();
    expect(screen.getByText(/loading reviews/i)).toBeInTheDocument();
  });

  it("opens photos in a labelled lightbox that Escape closes without closing the profile", async () => {
    const { user, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: /view ann speaker photo 1/i }));
    const lightbox = screen.getByRole("dialog", { name: /photo/i });
    const close = within(lightbox).getByRole("button", { name: /close photo/i });
    expect(document.activeElement).toBe(close);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /photo/i })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: /ann speaker/i })).toBeInTheDocument();
  });
});
