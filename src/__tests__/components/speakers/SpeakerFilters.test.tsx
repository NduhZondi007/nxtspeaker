import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpeakerFilters, type FilterState } from "@/components/speakers/SpeakerFilters";
import { DEFAULT_SPEAKER_FILTERS } from "@/lib/data/speakers";
import { EXPERTISE_OPTIONS } from "@/lib/constants/speakers";

function setup(filters: Partial<FilterState> = {}) {
  const onChange = vi.fn();
  render(<SpeakerFilters filters={{ ...DEFAULT_SPEAKER_FILTERS, ...filters }} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe("SpeakerFilters / accessibility", () => {
  it("labels the search box and the sort select", () => {
    setup();
    expect(screen.getByLabelText(/search speakers/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sort speakers/i)).toBeInTheDocument();
  });

  it("exposes the advanced panel state on its toggle", async () => {
    const { user } = setup();
    const toggle = screen.getByRole("button", { name: /filters/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("groups each radio set under a legend with a shared name", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /filters/i }));

    for (const groupName of [/availability/i, /format/i]) {
      const group = screen.getByRole("group", { name: groupName });
      const radios = within(group).getAllByRole("radio");
      expect(radios.length).toBeGreaterThan(1);
      const names = new Set(radios.map((r) => r.getAttribute("name")));
      expect(names.size).toBe(1);
      expect([...names][0]).toBeTruthy();
    }
  });

  it("labels the fee range inputs", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByLabelText(/minimum fee/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maximum fee/i)).toBeInTheDocument();
  });

  it("marks expertise chips as toggle buttons with aria-pressed", async () => {
    const { user } = setup({ expertise: ["Leadership"] });
    await user.click(screen.getByRole("button", { name: /filters/i }));
    expect(screen.getByRole("button", { name: "Leadership" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Strategy" })).toHaveAttribute("aria-pressed", "false");
  });

  it("offers the shared expertise vocabulary", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /filters/i }));
    for (const tag of EXPERTISE_OPTIONS) {
      expect(screen.getByRole("button", { name: tag })).toBeInTheDocument();
    }
  });
});
