import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeakerCard } from "@/components/speakers/SpeakerCard";
import type { SpeakerProfile } from "@/lib/types/database";

const speaker = {
  id: "a",
  title: "Futurist",
  expertise: ["AI"],
  location: "Cape Town",
  speaking_fee_zar: 5000,
  profiles: {
    id: "u",
    full_name: "Ann",
    avatar_url: "https://x.supabase.co/storage/v1/object/public/speaker-avatars/u/a.png",
  },
} as unknown as SpeakerProfile;

describe("SpeakerCard", () => {
  it("styles hover with CSS classes rather than inline JS-managed shadows", () => {
    const { container } = render(<SpeakerCard speaker={speaker} onClick={vi.fn()} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card.getAttribute("style")).toBeNull();
    expect(card.className).toMatch(/hover:shadow/);
  });

  it("requests a quarter-width image on the four-column xl grid", () => {
    render(<SpeakerCard speaker={speaker} onClick={vi.fn()} />);
    expect(screen.getByRole("img", { name: "Ann" }).getAttribute("sizes")).toMatch(/25vw/);
  });

  it("does not crash when expertise is null", () => {
    render(
      <SpeakerCard speaker={{ ...speaker, expertise: null } as unknown as SpeakerProfile} onClick={vi.fn()} />
    );
    expect(screen.getByText("Speaker")).toBeInTheDocument();
  });

  it("gives the Book button a name that says which speaker it books", () => {
    render(<SpeakerCard speaker={speaker} onClick={vi.fn()} />);
    expect(screen.getByRole("button", { name: /book ann/i })).toBeInTheDocument();
  });
});
