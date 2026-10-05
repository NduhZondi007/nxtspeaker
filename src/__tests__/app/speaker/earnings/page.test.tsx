import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
} from "@/__tests__/helpers/supabase-mock";
import { formatZARCents } from "@/lib/utils/currency";

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

import SpeakerEarningsPage from "@/app/speaker/earnings/page";

const PAST = "2020-01-01T00:00:00Z";
const FUTURE = "2999-01-01T00:00:00Z";

function payout(id: string, status: string, amount: number, availableAt: string | null) {
  return {
    id,
    status,
    amount_cents: amount,
    available_at: availableAt,
    eft_reference: null,
    bookings: { event_name: `Event ${id}`, booking_number: id, event_date: null, profiles: null },
    payments: { gross_amount_cents: 0, commission_amount_cents: 0, commission_rate_bps: 1500 },
  };
}

function tile(label: string) {
  return screen.getByText(label, { selector: "p" }).parentElement as HTMLElement;
}

beforeEach(() => {
  resetSupabaseState();
  vi.spyOn(console, "error").mockImplementation(() => {});
  supabaseState.responders.speaker_payout_details = () => ({
    data: { speaker_id: "sp-1" },
    error: null,
  });
});

describe("SpeakerEarningsPage", () => {
  // A DUE payout still inside its 7-day hold window cannot be paid yet, so
  // calling it "Available" tells the speaker money is ready when it is not.
  it("does not count a DUE payout inside its hold window as available", async () => {
    supabaseState.responders.payouts = () => ({
      data: [payout("a", "DUE", 111_100, PAST), payout("b", "DUE", 222_200, FUTURE)],
      error: null,
    });

    render(await SpeakerEarningsPage());

    expect(within(tile("Available")).getByText(formatZARCents(111_100))).toBeInTheDocument();
    expect(within(tile("In Escrow")).getByText(formatZARCents(222_200))).toBeInTheDocument();
  });

  // Speaker figures are net payouts. The gross profile fee is not what the
  // speaker receives and is not shown as an earnings figure.
  it("shows no gross standard-fee tile", async () => {
    supabaseState.responders.payouts = () => ({ data: [], error: null });

    render(await SpeakerEarningsPage());

    expect(screen.queryByText(/standard fee/i)).not.toBeInTheDocument();
  });

  it("shows an error state rather than R 0 when payouts fail to load", async () => {
    supabaseState.responders.payouts = () => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });

    render(await SpeakerEarningsPage());

    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.queryByText(/no earnings yet/i)).not.toBeInTheDocument();
  });
});
