import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { supabaseState, resetSupabaseState, supabaseServerMock } from "../../../helpers/supabase-mock";
import { ToastProvider } from "@/components/ui/Toast";

const { session, updateRiderMock } = vi.hoisted(() => ({
  session: { speakerId: "sp-1" as string | null, error: null as Error | null },
  updateRiderMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => supabaseServerMock());
vi.mock("@/lib/auth/session", () => ({
  getMySpeakerProfileId: async () => {
    if (session.error) throw session.error;
    return session.speakerId;
  },
}));
vi.mock("@/app/actions/speakers", () => ({ updateRider: (...a: unknown[]) => updateRiderMock(...a) }));
vi.mock("@/components/layout/SidebarContext", () => ({ useSidebar: () => ({ open: vi.fn() }) }));

import SpeakerRiderPage from "@/app/speaker/rider/page";

async function renderPage() {
  const ui = await SpeakerRiderPage();
  return render(<ToastProvider>{ui}</ToastProvider>);
}

beforeEach(() => {
  resetSupabaseState();
  session.speakerId = "sp-1";
  session.error = null;
  updateRiderMock.mockReset().mockResolvedValue({ success: true });
});

describe("speaker/rider page", () => {
  it("renders an editable form with defaults when the speaker has no rider row yet (no endless skeleton)", async () => {
    supabaseState.responders.hospitality_riders = () => ({ data: null, error: null });

    await renderPage();

    expect(screen.getByLabelText("Still water")).toBeChecked();
    expect(screen.getByText(/haven.t set up your rider/i)).toBeInTheDocument();
  });

  it("renders the saved rider", async () => {
    supabaseState.responders.hospitality_riders = () => ({
      data: { speaker_id: "sp-1", water_still: false, water_sparkling: true, accommodation_required: false },
      error: null,
    });

    await renderPage();

    expect(screen.getByLabelText("Still water")).not.toBeChecked();
    expect(screen.getByLabelText("Sparkling water")).toBeChecked();
  });

  it("throws to the error boundary when the rider read fails", async () => {
    supabaseState.responders.hospitality_riders = () => ({ data: null, error: { code: "57014" } });
    await expect(SpeakerRiderPage()).rejects.toThrow(/could not load/i);
  });

  it("explains itself when the account has no speaker profile", async () => {
    session.speakerId = null;
    await renderPage();
    expect(screen.getByText(/no speaker profile/i)).toBeInTheDocument();
  });

  it("saves the form through updateRider without sending row metadata", async () => {
    supabaseState.responders.hospitality_riders = () => ({ data: null, error: null });
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByLabelText("Sparkling water"));
    await user.click(screen.getAllByRole("button", { name: /save/i })[0]);

    const sent = updateRiderMock.mock.calls[0][0];
    expect(sent.water_sparkling).toBe(true);
    expect(sent).not.toHaveProperty("id");
    expect(sent).not.toHaveProperty("speaker_id");
  });
});
