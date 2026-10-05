import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
} from "@/__tests__/helpers/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeFakeClient(),
  createServiceClient: () => makeFakeClient(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () => ({ id: "user-1" }),
  getMySpeakerProfileId: async () => "sp-1",
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

vi.mock("@/components/layout/TopBar", () => ({
  TopBar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/app/actions/payments", () => ({ saveSpeakerPayoutDetails: vi.fn() }));

import SpeakerPayoutsPage from "@/app/speaker/payouts/page";

beforeEach(() => {
  resetSupabaseState();
  vi.spyOn(console, "error").mockImplementation(() => {});
  supabaseState.responders.payouts = () => ({ data: [{ amount_cents: 850_000 }], error: null });
});

describe("SpeakerPayoutsPage", () => {
  // Showing an empty form on a failed read invites the speaker to think their
  // details were lost.
  it("shows an error instead of an empty form when bank details fail to load", async () => {
    supabaseState.responders.speaker_payout_details = () => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });

    render(await SpeakerPayoutsPage());

    expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/i);
    expect(screen.queryByRole("button", { name: /save payout details/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/add your bank details/i)).not.toBeInTheDocument();
  });

  it("asks for bank details when money is owed and none are on file", async () => {
    supabaseState.responders.speaker_payout_details = () => ({ data: null, error: null });

    render(await SpeakerPayoutsPage());

    expect(screen.getByText(/add your bank details/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Bank")).toBeInTheDocument();
  });
});
