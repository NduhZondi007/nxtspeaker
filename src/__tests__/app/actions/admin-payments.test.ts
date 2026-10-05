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

const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";

const BANK = {
  speaker_id: "sp-1",
  account_holder: "T Speaker",
  bank_name: "FNB",
  account_number: "62000000001",
  branch_code: "250655",
  account_type: "CHEQUE",
  tax_number: null,
  is_vat_registered: false,
  verified_at: null,
  verified_by: null,
  created_at: PAST,
  updated_at: PAST,
};

function duePayout(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYOUT_ID,
    status: "DUE",
    speaker_id: "sp-1",
    available_at: PAST,
    bank_snapshot: BANK,
    ...overrides,
  };
}

/**
 * `updated` controls what a conditional UPDATE … RETURNING sees: a row (it
 * matched) or null (0 rows — someone else changed the payout first).
 */
function stubPayout(
  payout: Record<string, unknown> | null,
  updated: "match" | "no-match" | "error" = "match"
) {
  supabaseState.responders.payouts = (state: QueryState) => {
    if (state.op === "update") {
      if (updated === "error") return { data: null, error: { code: "08006", message: "conn" } };
      if (updated === "no-match") return { data: null, error: null };
      return { data: { id: PAYOUT_ID, ...(state.payload ?? {}) }, error: null };
    }
    return { data: payout, error: null };
  };
}

function stubPayment(payment: Record<string, unknown> | null) {
  supabaseState.responders.payments = (state: QueryState) => {
    if (state.op === "update") return { data: { id: PAYMENT_ID }, error: null };
    return { data: payment, error: null };
  };
}

function payoutUpdate() {
  return supabaseState.writes.find((w) => w.table === "payouts" && w.op === "update");
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
    stubPayout(duePayout());

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891", "paid in the Friday run");

    expect(result).toHaveProperty("data");
    const update = payoutUpdate();
    expect(update?.payload).toMatchObject({
      status: "PAID",
      eft_reference: "FNB-8891",
      notes: "paid in the Friday run",
      marked_paid_by: ADMIN_ID,
    });
    expect(update?.payload.marked_paid_at).toBeTruthy();
  });

  // Read-check-write let two admins both "pay" one payout. The status and
  // the hold window are re-asserted in the UPDATE itself.
  it("only updates a payout that is still DUE and past its hold window", async () => {
    stubPayout(duePayout());

    await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(payoutUpdate()?.filters).toMatchObject({ id: PAYOUT_ID, status: "DUE" });
    expect(payoutUpdate()?.filters["available_at:lte"]).toBeTruthy();
  });

  it("reports a conflict when the payout changed underneath it", async () => {
    stubPayout(duePayout(), "no-match");

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).toMatch(/changed — refresh and try again/i);
  });

  it("never returns a raw database error", async () => {
    stubPayout(duePayout(), "error");

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).toBeTruthy();
    expect("error" in result && result.error).not.toMatch(/conn/);
  });

  it("refuses a payout still inside its hold window", async () => {
    stubPayout(duePayout({ available_at: FUTURE }));

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a payout that is not yet DUE", async () => {
    stubPayout(duePayout({ status: "PENDING" }));

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  // A payout created before the speaker added bank details had a null
  // snapshot and could never be paid. The current details are frozen onto it
  // at the moment it is paid, in the same conditional update.
  it("snapshots the speaker's current bank details when the payout has none", async () => {
    stubPayout(duePayout({ bank_snapshot: null }));
    supabaseState.responders.speaker_payout_details = () => ({ data: BANK, error: null });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(result).toHaveProperty("data");
    expect(payoutUpdate()?.payload.bank_snapshot).toMatchObject({ account_number: "62000000001" });
    expect(payoutUpdate()?.filters["bank_snapshot:is"]).toBeNull();
  });

  it("keeps an existing snapshot rather than overwriting it", async () => {
    stubPayout(duePayout());

    await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(payoutUpdate()?.payload).not.toHaveProperty("bank_snapshot");
  });

  it("refuses when the speaker has no bank details at all", async () => {
    stubPayout(duePayout({ bank_snapshot: null }));
    supabaseState.responders.speaker_payout_details = () => ({ data: null, error: null });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).toMatch(/bank details/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  // The database CHECK constraint refuses this too; validating here turns a
  // constraint violation into a message an admin can act on.
  it.each(["", "   "])("refuses an empty EFT reference: %s", async (reference) => {
    stubPayout(duePayout());

    const result = await markPayoutPaid(PAYOUT_ID, reference);

    expect("error" in result && result.error).toMatch(/reference is required/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a payout that is already paid", async () => {
    stubPayout(duePayout({ status: "PAID" }));

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).toMatch(/already marked as paid/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a cancelled payout", async () => {
    stubPayout(duePayout({ status: "CANCELLED" }));

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses an unknown payout", async () => {
    stubPayout(null);
    expect(await markPayoutPaid(PAYOUT_ID, "FNB-8891")).toEqual({ error: "Payout not found" });
  });

  it("reports a failed payout read instead of 'not found'", async () => {
    supabaseState.responders.payouts = () => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });

    const result = await markPayoutPaid(PAYOUT_ID, "FNB-8891");

    expect("error" in result && result.error).not.toMatch(/not found/i);
  });
});

describe("holdPayout", () => {
  it("freezes a payout with a reason", async () => {
    stubPayout(duePayout());

    await holdPayout(PAYOUT_ID, "speaker did not attend");

    expect(payoutUpdate()?.payload).toMatchObject({
      status: "ON_HOLD",
      notes: "speaker did not attend",
    });
  });

  it("only holds a payout that is still PENDING or DUE", async () => {
    stubPayout(duePayout());

    await holdPayout(PAYOUT_ID, "disputed");

    expect(payoutUpdate()?.filters["status:in"]).toEqual(["PENDING", "DUE"]);
  });

  it("reports a conflict when the payout was paid in the meantime", async () => {
    stubPayout(duePayout(), "no-match");

    const result = await holdPayout(PAYOUT_ID, "disputed");

    expect("error" in result && result.error).toMatch(/changed — refresh and try again/i);
  });

  it("will not freeze money that has already left", async () => {
    stubPayout(duePayout({ status: "PAID" }));

    const result = await holdPayout(PAYOUT_ID, "too late");

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("requires a reason", async () => {
    stubPayout(duePayout());
    expect(await holdPayout(PAYOUT_ID, "  ")).toHaveProperty("error");
  });
});

describe("adminRefundPayment", () => {
  function stubBookings() {
    supabaseState.responders.bookings = () => ({ data: { id: BOOKING_ID }, error: null });
  }

  it("refunds in full and closes the payout obligation", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    stubBookings();
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

    expect(payoutUpdate()?.payload).toMatchObject({ status: "CANCELLED" });
    expect(payoutUpdate()?.filters["status:in"]).toEqual(["PENDING", "DUE", "ON_HOLD"]);

    const booking = supabaseState.writes.find((w) => w.table === "bookings" && w.op === "update");
    expect(booking?.payload).toMatchObject({ status: "CANCELLED" });
  });

  // Refunding the client after the speaker was paid means the platform pays
  // the fee twice. That has to be resolved by a human first.
  it("refuses to refund when the speaker has already been paid", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PAID" });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect("error" in result && result.error).toMatch(/speaker has already been paid/i);
    expect(refundCheckout).not.toHaveBeenCalled();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("puts the payout on hold while a refund is pending", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "DUE" });
    refundCheckout.mockResolvedValue({ data: { id: "ch_1", refundId: null, status: "pending" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toEqual({ data: { status: "pending" } });
    expect(payoutUpdate()?.payload).toMatchObject({ status: "ON_HOLD" });
  });

  it("reports a failed payout write instead of claiming success", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" }, "error");
    stubBookings();
    refundCheckout.mockResolvedValue({ data: { id: "ch_1", refundId: "rf_1", status: "succeeded" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toHaveProperty("error");
  });

  it("reports a failed booking write instead of claiming success", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    supabaseState.responders.bookings = () => ({ data: null, error: { code: "08006", message: "x" } });
    refundCheckout.mockResolvedValue({ data: { id: "ch_1", refundId: "rf_1", status: "succeeded" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toHaveProperty("error");
  });

  // If the money has not moved, neither should the ledger.
  it("writes nothing when the provider refuses", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    refundCheckout.mockResolvedValue({ error: "Refund declined" });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toEqual({ error: "Refund declined" });
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("does not throw when the provider is unreachable", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    refundCheckout.mockRejectedValue(new Error("ECONNRESET"));

    await expect(adminRefundPayment(PAYMENT_ID, "client cancelled")).resolves.toHaveProperty(
      "error"
    );
    expect(supabaseState.writes).toHaveLength(0);
  });

  // A pending refund has not happened yet — the webhook resolves it.
  it("does not mark a pending refund as refunded", async () => {
    stubPayment(capturedPayment());
    stubPayout({ id: PAYOUT_ID, status: "PENDING" });
    refundCheckout.mockResolvedValue({ data: { id: "ch_1", refundId: null, status: "pending" } });

    const result = await adminRefundPayment(PAYMENT_ID, "client cancelled");

    expect(result).toEqual({ data: { status: "pending" } });
    const payment = supabaseState.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(payment?.payload).toMatchObject({ status: "SUCCEEDED", refunded_amount_cents: 0 });
    // The booking is still live.
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
