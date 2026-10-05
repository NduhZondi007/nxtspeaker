import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeFakeClient(),
  createServiceClient: () => makeFakeClient(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: async () => ({ id: "client-1" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/components/layout/TopBar", () => ({
  TopBar: ({ title, children }: { title: string; children?: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

import PaymentResultPage from "@/app/client/bookings/[id]/payment/page";

const BOOKING_ID = "33333333-3333-4333-8333-333333333333";

function stub(paymentStatus: string | null, bookingStatus = "CONFIRMED") {
  supabaseState.responders.bookings = () => ({
    data: {
      id: BOOKING_ID,
      booking_number: "NXT-1",
      event_name: "Summit",
      status: bookingStatus,
    },
    error: null,
  });
  supabaseState.responders.payments = (_state: QueryState) => ({
    data: paymentStatus ? { status: paymentStatus, gross_amount_cents: 8_500_000 } : null,
    error: null,
  });
}

async function renderPage(state?: string) {
  const ui = await PaymentResultPage({
    params: Promise.resolve({ id: BOOKING_ID }),
    searchParams: Promise.resolve({ state }),
  });
  return render(ui);
}

beforeEach(() => {
  resetSupabaseState();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("PaymentResultPage", () => {
  it("tells the client their payment is under review rather than still confirming", async () => {
    stub("NEEDS_REVIEW");

    await renderPage("success");

    expect(screen.getByText(/being reviewed/i)).toBeInTheDocument();
    expect(screen.queryByText(/confirming your payment/i)).not.toBeInTheDocument();
  });

  it("shows an error, not a 404, when the booking query fails", async () => {
    supabaseState.responders.bookings = () => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });
    supabaseState.responders.payments = () => ({ data: null, error: null });

    await renderPage();

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the back link as a single link, not a button inside a link", async () => {
    stub("PENDING");

    await renderPage("success");

    const back = screen.getAllByRole("link", { name: /back to booking/i })[0];
    expect(back.querySelector("button")).toBeNull();
  });
});
