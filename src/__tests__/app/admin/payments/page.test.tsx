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

import AdminPaymentsPage from "@/app/admin/payments/page";

const TOTALS = {
  collected: 10_000_000,
  commission: 1_500_000,
  owed: 8_500_000,
  refunded: 250_000,
  payouts_open: 8_500_000,
  payouts_paid: 0,
};

function stubHealthy() {
  supabaseState.rpcResponders.admin_money_totals = () => ({ data: [TOTALS], error: null });
  supabaseState.responders.payments = () => ({ data: [], error: null });
}

async function renderPage(page?: string) {
  const ui = await AdminPaymentsPage({ searchParams: Promise.resolve({ page }) });
  return render(ui);
}

beforeEach(() => {
  resetSupabaseState();
  createServiceClient.mockClear();
  requireRole.mockReset();
  requireRole.mockResolvedValue({ id: "admin", role: "ADMIN" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("AdminPaymentsPage", () => {
  // The page reads every payment with the service-role key. A layout-only
  // role check does not protect it under partial rendering.
  it("gates on the ADMIN role before touching the service client", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(renderPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(createServiceClient).not.toHaveBeenCalled();
  });

  it("renders the money tiles from admin_money_totals", async () => {
    stubHealthy();

    await renderPage();

    expect(supabaseState.rpcCalls.map((c) => c.name)).toContain("admin_money_totals");
    expect(screen.getByText(formatZARCents(TOTALS.collected))).toBeInTheDocument();
    expect(screen.getByText(formatZARCents(TOTALS.commission))).toBeInTheDocument();
    expect(screen.getByText(formatZARCents(TOTALS.refunded))).toBeInTheDocument();
    expect(screen.getByText(/everything reconciles/i)).toBeInTheDocument();
  });

  it("shows an error instead of tiles when the totals RPC fails", async () => {
    stubHealthy();
    supabaseState.rpcResponders.admin_money_totals = () => ({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    });

    await renderPage();

    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(screen.queryByText(formatZARCents(0))).not.toBeInTheDocument();
  });

  it("never claims everything reconciles when a payments query fails", async () => {
    stubHealthy();
    supabaseState.responders.payments = (_state: QueryState) => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });

    await renderPage();

    expect(screen.queryByText(/everything reconciles/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });

  it("links to the next page when more rows exist", async () => {
    stubHealthy();
    const row = (i: number) => ({
      id: `p-${i}`,
      status: "SUCCEEDED",
      created_at: "2026-10-01T00:00:00Z",
      processing_mode: "live",
      provider_checkout_id: null,
      failure_reason: null,
      gross_amount_cents: 100,
      commission_rate_bps: 1500,
      commission_amount_cents: 15,
      speaker_amount_cents: 85,
      bookings: null,
    });
    supabaseState.responders.payments = (state: QueryState) =>
      state.filters[":or"] || state.filters.status
        ? { data: [], error: null }
        : { data: Array.from({ length: 51 }, (_, i) => row(i)), error: null };

    await renderPage();

    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/admin/payments?page=2"
    );
  });
});
