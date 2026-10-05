import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";
import { formatZARCents } from "@/lib/utils/currency";

const createServiceClient = vi.fn(() => makeFakeClient());
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeFakeClient(),
  createServiceClient: () => createServiceClient(),
}));

const requireRole = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireRole: (role: string) => requireRole(role) }));

vi.mock("@/components/layout/TopBar", () => ({
  TopBar: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/app/actions/admin-payments", () => ({ markPayoutPaid: vi.fn() }));

import AdminPayoutsPage from "@/app/admin/payouts/page";

const TOTALS = {
  collected: 10_000_000,
  commission: 1_500_000,
  owed: 7_654_321,
  refunded: 0,
  payouts_open: 7_654_321,
  payouts_paid: 1_234_567,
};

const BANK = {
  account_holder: "T Speaker",
  bank_name: "FNB",
  account_number: "62000000001",
  branch_code: "250655",
  account_type: "CHEQUE",
};

function payable(overrides: Record<string, unknown> = {}) {
  return {
    id: "po-1",
    status: "DUE",
    speaker_id: "sp-1",
    amount_cents: 850_000,
    available_at: "2026-01-01T00:00:00Z",
    eft_reference: null,
    bank_snapshot: BANK,
    notes: null,
    marked_paid_at: null,
    bookings: { event_name: "Summit", booking_number: "NXT-1" },
    speaker_profiles: { profiles: { full_name: "Thandi" } },
    ...overrides,
  };
}

/** The payable queue is the query filtered on available_at <= now. */
function stubPayouts(queue: unknown[], error: unknown = null) {
  supabaseState.responders.payouts = (state: QueryState) => {
    if (error) return { data: null, error };
    if (state.filters["available_at:lte"]) return { data: queue, error: null };
    return { data: [], error: null };
  };
}

async function renderPage() {
  const ui = await AdminPayoutsPage({ searchParams: Promise.resolve({}) });
  return render(ui);
}

beforeEach(() => {
  resetSupabaseState();
  createServiceClient.mockClear();
  requireRole.mockReset();
  requireRole.mockResolvedValue({ id: "admin", role: "ADMIN" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  supabaseState.rpcResponders.admin_money_totals = () => ({ data: [TOTALS], error: null });
});

describe("AdminPayoutsPage", () => {
  it("gates on the ADMIN role before touching the service client", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("renders owed and paid-out tiles from admin_money_totals", async () => {
    stubPayouts([]);

    await renderPage();

    expect(screen.getByText(formatZARCents(TOTALS.owed))).toBeInTheDocument();
    expect(screen.getByText(formatZARCents(TOTALS.payouts_paid))).toBeInTheDocument();
  });

  it("shows an error state when the totals RPC fails", async () => {
    stubPayouts([]);
    supabaseState.rpcResponders.admin_money_totals = () => ({
      data: null,
      error: { code: "42883", message: "missing" },
    });

    await renderPage();

    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("shows an error state instead of 'nothing due' when the queue fails to load", async () => {
    stubPayouts([], { code: "57014", message: "timeout" });

    await renderPage();

    expect(screen.queryByText(/nothing due for payout/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  // A payout created before the speaker added bank details can now be paid —
  // markPayoutPaid snapshots the current details — so it must be offered.
  it("offers a payout with no snapshot using the speaker's current bank details", async () => {
    stubPayouts([payable({ bank_snapshot: null })]);
    supabaseState.responders.speaker_payout_details = () => ({
      data: [{ speaker_id: "sp-1", ...BANK }],
      error: null,
    });

    await renderPage();

    expect(screen.getByRole("button", { name: /record as paid/i })).toBeEnabled();
  });
});
