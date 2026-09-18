import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeFakeClient(),
  createServiceClient: () => makeFakeClient(),
}));

const refundCheckout = vi.fn();

vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({ name: "yoco", refundCheckout }),
}));

import { markPayoutPaid, holdPayout, adminRefundPayment } from "@/app/actions/admin-payments";

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PAYOUT_ID = "55555555-5555-4555-8555-555555555555";
const PAYMENT_ID = "44444444-4444-4444-8444-444444444444";
const BOOKING_ID = "33333333-3333-4333-8333-333333333333";

function signInAs(role: "ADMIN" | "CLIENT" | "SPEAKER" | null) {
  supabaseState.user = role ? { id: ADMIN_ID } : null;
  supabaseState.responders.profiles = () => ({ data: role ? { role } : null, error: null });
}

function stubPayout(payout: Record<string, unknown> | null) {
  supabaseState.responders.payouts = (state: QueryState) => {
    if (state.op === "update") return { data: { id: PAYOUT_ID, ...(state.payload ?? {}) }, error: null };
    return { data: payout, error: null };
  };
}

function stubPayment(payment: Record<string, unknown> | null) {
  supabaseState.responders.payments = (state: QueryState) => {
    if (state.op === "update") return { data: { id: PAYMENT_ID }, error: null };
    return { data: payment, error: null };
  };
}

function capturedPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_ID,
    booking_id: BOOKING_ID,
    status: "SUCCEEDED",
    provider_checkout_id: "ch_test_1",
    gross_amount_cents: 8_500_000,
    ...overrides,
  };
}

beforeEach(() => {
  resetSupabaseState();
  refundCheckout.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  signInAs("ADMIN");
});

describe("admin money actions refuse non-admins", () => {
  const cases: [string, () => Promise<{ error?: string }>][] = [
    ["markPayoutPaid", () => markPayoutPaid(PAYOUT_ID, "EFT-1")],
    ["holdPayout", () => holdPayout(PAYOUT_ID, "disputed")],
    ["adminRefundPayment", () => adminRefundPayment(PAYMENT_ID, "client cancelled")],
  ];

  it.each(cases)("%s refuses an unauthenticated caller", async (_name, call) => {
    signInAs(null);
    expect(await call()).toEqual({ error: "Not authenticated" });
  });

  it.each(cases)("%s refuses a client", async (_name, call) => {
    signInAs("CLIENT");
    expect(await call()).toEqual({ error: "Admin access required" });
  });

  it.each(cases)("%s refuses a speaker", async (_name, call) => {
    signInAs("SPEAKER");
    expect(await call()).toEqual({ error: "Admin access required" });
  });
});

describe("markPayoutPaid", () => {
  it("records who paid it, when, and the reference", async () => {
    stubPayout({ id: PAYOUT_ID, status: "DUE" });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891", "paid in the Friday run");

    expect(result).toHaveProperty("data");
    const update = supabaseState.writes.find((w) => w.table === "payouts" && w.op === "update");
    expect(update?.payload).toMatchObject({
      status: "PAID",
      eft_reference: "FNB-8891",
      notes: "paid in the Friday run",
      marked_paid_by: ADMIN_ID,
    });
    expect(update?.payload.marked_paid_at).toBeTruthy();
  });

  // The database CHECK constraint refuses this too; validating here turns a
  // constraint violation into a message an admin can act on.
  it.each(["", "   "])("refuses an empty EFT reference: %s", async (reference) => {
    stubPayout({ id: PAYOUT_ID, status: "DUE" });

    const result = await markPayoutPaid(PAYOUT_ID, reference);

    expect("error" in result && result.error).toMatch(/reference is required/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a payout that is already paid", async () => {
    stubPayout({ id: PAYOUT_ID, status: "PAID" });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).toMatch(/already marked as paid/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a cancelled payout", async () => {
    stubPayout({ id: PAYOUT_ID, status: "CANCELLED" });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses an unknown payout", async () => {
    stubPayout(null);
    expect(await markPayoutPaid(PAYOUT_ID, "FNB-8891")).toEqual({ error: "Payout not found" });
  });
});

describe("holdPayout", () => {
  it("freezes a payout with a reason", async () => {
    stubPayout({ id: PAYOUT_ID, status: "DUE" });

    await holdPayout(PAYOUT_ID, "speaker did not attend");

    const update = supabaseState.writes.find((w) => w.table === "payouts" && w.op === "update");
    expect(update?.payload).toMatchObject({ status: "ON_HOLD", notes: "speaker did not attend" });
  });

  it("will not freeze money that has already left", async () => {
    stubPayout({ id: PAYOUT_ID, status: "PAID" });

    const result = await holdPayout(PAYOUT_ID, "too late");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("requires a reason", async () => {
    stubPayout({ id: PAYOUT_ID, status: "DUE" });
    expect(await holdPayout(PAYOUT_ID, "  ")).toHaveProperty("error");
  });
});

describe("adminRefundPayment", () => {
  it("refunds in full and closes the payout obligation", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    supabaseState.responders.bookings = () => ({ data: { id: BOOKING_ID }, error: null });
    refundCheckout.mockResolvedValue({ data: { id: "ch_test_1", refundId: "rf_1", status: "succeeded" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled the event");

    expect(result).toEqual({ data: { status: "succeeded" } });

    // Full refund: no amount is sent to the provider.
    expect(refundCheckout).toHaveBeenCalledWith("ch_test_1", `nxts_refund_${PAYMENT_ID}`);

    const payment = supabaseState.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(payment?.payload).toMatchObject({
      status: "REFUNDED",
      refunded_amount_cents: 8_500_000,
    });

    const payout = supabaseState.writes.find((w) => w.table === "payouts" && w.op === "update");
    expect(payout?.payload).toMatchObject({ status: "CANCELLED" });

    const booking = supabaseState.writes.find((w) => w.table === "bookings" && w.op === "update");
    expect(booking?.payload).toMatchObject({ status: "CANCELLED" });
  });

  // If the money has not moved, neither should the ledger.
  it("writes nothing when the provider refuses", async () => {
    stubPayment(capturedPayment());
    refundCheckout.mockResolvedValue({ error: "Refund declined" });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toEqual({ error: "Refund declined" });
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("does not throw when the provider is unreachable", async () => {
    stubPayment(capturedPayment());
    refundCheckout.mockRejectedValue(new Error("ECONNRESET"));

    await expect(adminRefundPayment(PAYMENT_ID, "client cancelled")).resolves.toHaveProperty(
      "error"
    );
    expect(supabaseState.writes).toHaveLength(0);
  });

  // A pending refund has not happened yet — the webhook resolves it.
  it("does not mark a pending refund as refunded", async () => {
    stubPayment(capturedPayment());
    refundCheckout.mockResolvedValue({ data: { id: "ch_1", refundId: null, status: "pending" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toEqual({ data: { status: "pending" } });
    const payment = supabaseState.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(payment?.payload).toMatchObject({ status: "SUCCEEDED", refunded_amount_cents: 0 });
    // The booking is still live and the speaker is still owed.
    expect(supabaseState.writes.some((w) => w.table === "bookings")).toBe(false);
  });

  it.each(["PENDING", "FAILED", "CREATED", "NEEDS_REVIEW"])(
    "refuses to refund a %s payment",
    async (status) => {
      stubPayment(capturedPayment({ status }));

      const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

      expect("error" in result && result.error).toMatch(/captured payment/i);
      expect(refundCheckout).not.toHaveBeenCalled();
    }
  );

  it("refuses to refund twice", async () => {
    stubPayment(capturedPayment({ status: "REFUNDED" }));

    const result = await adminRefundPayment(PAYMENT_ID, "again");

    expect("error" in result && result.error).toMatch(/already been refunded/i);
    expect(refundCheckout).not.toHaveBeenCalled();
  });

  it("refuses a payment with no provider reference", async () => {
    stubPayment(capturedPayment({ provider_checkout_id: null }));

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toHaveProperty("error");
    expect(refundCheckout).not.toHaveBeenCalled();
  });

  it("requires a reason", async () => {
    stubPayment(capturedPayment());
    expect(await adminRefundPayment(PAYMENT_ID, "")).toHaveProperty("error");
    expect(refundCheckout).not.toHaveBeenCalled();
  });
});
