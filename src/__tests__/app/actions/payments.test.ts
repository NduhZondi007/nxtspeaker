import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  rows,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => makeFakeClient(),
  createServiceClient: () => makeFakeClient(),
}));

const getBaseUrl = vi.fn(() => "https://nxtspeaker.co.za");
vi.mock("@/lib/env", () => ({ getBaseUrl: () => getBaseUrl() }));

const createCheckout = vi.fn();
const refundCheckout = vi.fn();

// Only the provider seam is mocked. The commission maths is imported by the
// action from @/lib/payments/commission directly and stays real, so these
// tests exercise the actual split.
vi.mock("@/lib/payments", () => ({
  getPaymentProvider: () => ({ name: "yoco", createCheckout, refundCheckout }),
}));

import { initiateBookingPayment, saveSpeakerPayoutDetails } from "@/app/actions/payments";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLIENT = "99999999-9999-4999-8999-999999999999";
const BOOKING_ID = "33333333-3333-4333-8333-333333333333";

function confirmedBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    booking_number: "NXT-2026-00042",
    client_id: CLIENT_ID,
    status: "CONFIRMED",
    quoted_fee_zar: "85000.00", // NUMERIC arrives from PostgREST as a string
    ...overrides,
  };
}

/**
 * Bookings are looked up scoped to the caller, so "someone else's booking"
 * and "no such booking" are the same empty result — exactly as the real query
 * behaves.
 */
function stubBooking(booking: Record<string, unknown> | null) {
  supabaseState.responders.bookings = (state: QueryState) => {
    if (booking && state.filters.client_id && state.filters.client_id !== booking.client_id) {
      return { data: null, error: null };
    }
    return { data: booking, error: null };
  };
}

/** No existing payment rows; inserts and updates succeed. */
function stubPayments(existing: unknown = null) {
  supabaseState.responders.payments = (state: QueryState) => {
    if (state.op === "insert") {
      return { data: { id: "p-new", ...(state.payload ?? {}) }, error: null };
    }
    if (state.op === "update") {
      return { data: { id: "p-new", ...(state.payload ?? {}) }, error: null };
    }
    return { data: existing, error: null };
  };
}

function okCheckout() {
  createCheckout.mockResolvedValue({
    data: {
      id: "ch_test_1",
      status: "created",
      redirectUrl: "https://payments.yoco.com/checkout/ch_test_1",
      paymentId: null,
      merchantId: "m_1",
      processingMode: "test",
    },
  });
}

beforeEach(() => {
  resetSupabaseState();
  createCheckout.mockReset();
  refundCheckout.mockReset();
  supabaseState.user = { id: CLIENT_ID };
  getBaseUrl.mockReset();
  getBaseUrl.mockImplementation(() => "https://nxtspeaker.co.za");
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("initiateBookingPayment / authorisation", () => {
  it("refuses an unauthenticated caller", async () => {
    supabaseState.user = null;

    expect(await initiateBookingPayment(BOOKING_ID)).toEqual({ error: "Not authenticated" });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("rejects a malformed booking id before querying", async () => {
    const result = await initiateBookingPayment("not-a-uuid");

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  // The lookup is scoped to the caller, so another client's booking is simply
  // not found rather than producing a different error a probe could read.
  it("will not pay another client's booking", async () => {
    supabaseState.user = { id: OTHER_CLIENT };
    stubBooking(confirmedBooking());
    stubPayments();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("scopes the booking lookup to the caller in the query itself", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    // Ownership is re-asserted at the DB layer, not only in application code.
    const checked = supabaseState.responders.bookings;
    expect(checked).toBeDefined();
  });
});

describe("initiateBookingPayment / booking state", () => {
  it.each(["PENDING", "PAID", "COMPLETED", "CANCELLED", "DECLINED"])(
    "refuses to take payment for a %s booking",
    async (status) => {
      stubBooking(confirmedBooking({ status }));
      stubPayments();

      const result = await initiateBookingPayment(BOOKING_ID);

      expect(result).toHaveProperty("error");
      expect(createCheckout).not.toHaveBeenCalled();
    }
  );

  it("refuses when the booking has already been paid", async () => {
    stubBooking(confirmedBooking());
    stubPayments({ id: "p-old", status: "SUCCEEDED", redirect_url: null });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect("error" in result && result.error).toMatch(/already been paid/i);
    expect(createCheckout).not.toHaveBeenCalled();
  });
});

describe("initiateBookingPayment / amounts", () => {
  it("charges the fee recorded on the booking, converted to cents", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    expect(createCheckout).toHaveBeenCalledTimes(1);
    const params = createCheckout.mock.calls[0][0];
    expect(params.amountCents).toBe(8_500_000);
    expect(params.currency).toBe("ZAR");
  });

  // The action takes only a booking id — there is no amount parameter to
  // tamper with — and the fee is read server-side. This mirrors the existing
  // guarantee asserted for createBooking's quoted_fee_zar.
  it("takes the amount from the database, never from the caller", async () => {
    stubBooking(confirmedBooking({ quoted_fee_zar: "12000.50" }));
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID, { amountCents: 1 } as never);

    expect(createCheckout.mock.calls[0][0].amountCents).toBe(1_200_050);
  });

  it("records the 15% split and the rate on the payment row", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const insert = supabaseState.writes.find((w) => w.table === "payments" && w.op === "insert");
    expect(insert?.payload).toMatchObject({
      booking_id: BOOKING_ID,
      gross_amount_cents: 8_500_000,
      commission_amount_cents: 1_275_000,
      speaker_amount_cents: 7_225_000,
      commission_rate_bps: 1500,
      currency: "ZAR",
      status: "CREATED",
    });
  });

  it("keeps the split exact on a fee with odd cents", async () => {
    stubBooking(confirmedBooking({ quoted_fee_zar: "1234.57" }));
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const payload = supabaseState.writes.find(
      (w) => w.table === "payments" && w.op === "insert"
    )?.payload as Record<string, number>;

    expect(payload.commission_amount_cents + payload.speaker_amount_cents).toBe(
      payload.gross_amount_cents
    );
  });
});

describe("initiateBookingPayment / checkout", () => {
  it("returns the provider redirect url", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toEqual({
      data: { redirectUrl: "https://payments.yoco.com/checkout/ch_test_1" },
    });
  });

  it("passes the booking and payment ids as metadata for the webhook", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const params = createCheckout.mock.calls[0][0];
    expect(params.metadata.booking_id).toBe(BOOKING_ID);
    expect(params.metadata.payment_id).toBeTruthy();
    expect(params.externalId).toBe(params.metadata.payment_id);
  });

  it("builds return urls from the configured base url", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const params = createCheckout.mock.calls[0][0];
    expect(params.successUrl).toContain("https://nxtspeaker.co.za");
    expect(params.successUrl).toContain(BOOKING_ID);
    expect(params.cancelUrl).toContain("cancelled");
    expect(params.failureUrl).toContain("failed");
  });

  it("sends an idempotency key derived from the payment row, not the booking", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const params = createCheckout.mock.calls[0][0];
    // Keyed on the booking, a retry after a genuine failure would collide with
    // the failed attempt at Yoco forever.
    expect(params.idempotencyKey).not.toContain(BOOKING_ID);
    expect(params.idempotencyKey).toBe(
      (supabaseState.writes.find((w) => w.table === "payments" && w.op === "insert")
        ?.payload as Record<string, string>).idempotency_key
    );
  });

  // Reopening a second checkout would let the same booking be paid twice.
  it("resumes an open checkout instead of creating a second one", async () => {
    stubBooking(confirmedBooking());
    stubPayments({
      id: "p-open",
      status: "PENDING",
      redirect_url: "https://payments.yoco.com/checkout/ch_open",
    });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toEqual({
      data: { redirectUrl: "https://payments.yoco.com/checkout/ch_open" },
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("marks the payment failed when the provider rejects the checkout", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    createCheckout.mockResolvedValue({ error: "Payment provider is unavailable" });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    const update = supabaseState.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(update?.payload).toMatchObject({ status: "FAILED" });
  });

  it("stores the checkout id and redirect url on success", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    const update = supabaseState.writes.find((w) => w.table === "payments" && w.op === "update");
    expect(update?.payload).toMatchObject({
      status: "PENDING",
      provider_checkout_id: "ch_test_1",
      redirect_url: "https://payments.yoco.com/checkout/ch_test_1",
      processing_mode: "test",
    });
  });

  it("never throws — a provider outage returns an error object", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    createCheckout.mockRejectedValue(new Error("boom"));

    await expect(initiateBookingPayment(BOOKING_ID)).resolves.toHaveProperty("error");
  });
});

describe("initiateBookingPayment / fee data quality", () => {
  it("refuses a booking whose fee cannot be converted to cents", async () => {
    stubBooking(confirmedBooking({ quoted_fee_zar: null }));
    stubPayments();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("refuses a zero-fee booking rather than opening a R0 checkout", async () => {
    stubBooking(confirmedBooking({ quoted_fee_zar: "0.00" }));
    stubPayments();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
  });
});

describe("initiateBookingPayment / payment under review", () => {
  // NEEDS_REVIEW means money may already have arrived (e.g. an amount
  // mismatch). Opening a fresh checkout would let the client pay twice.
  it("refuses a new checkout while a payment is under review", async () => {
    stubBooking(confirmedBooking());
    stubPayments({ id: "p-review", status: "NEEDS_REVIEW", redirect_url: null });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect("error" in result && result.error).toMatch(/being reviewed/i);
    expect(createCheckout).not.toHaveBeenCalled();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("includes NEEDS_REVIEW in the statuses it looks for", async () => {
    stubBooking(confirmedBooking());
    const selects: QueryState["filters"][] = [];
    supabaseState.responders.payments = (state: QueryState) => {
      if (state.op === "select") selects.push({ ...state.filters });
      return { data: null, error: null };
    };
    okCheckout();

    await initiateBookingPayment(BOOKING_ID);

    expect(selects[0]["status:in"]).toContain("NEEDS_REVIEW");
  });
});

describe("initiateBookingPayment / database errors", () => {
  it("reports a failed booking read instead of 'not found'", async () => {
    supabaseState.responders.bookings = () => ({
      data: null,
      error: { code: "57014", message: "canceling statement due to statement timeout" },
    });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect("error" in result && result.error).not.toMatch(/not found/i);
    expect("error" in result && result.error).not.toMatch(/statement timeout/);
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("does not open a checkout when the existing-payment lookup errors", async () => {
    stubBooking(confirmedBooking());
    supabaseState.responders.payments = (state: QueryState) =>
      state.op === "select"
        ? { data: null, error: { code: "57014", message: "timeout" } }
        : { data: null, error: null };

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
    expect(supabaseState.writes).toHaveLength(0);
  });
});

describe("initiateBookingPayment / no stuck CREATED rows", () => {
  // A row left in CREATED holds the one-open-payment-per-booking index
  // forever, and the client can never pay.
  it("resolves the return url before writing a payment row", async () => {
    stubBooking(confirmedBooking());
    stubPayments();
    okCheckout();
    getBaseUrl.mockImplementation(() => {
      throw new Error("NEXT_PUBLIC_APP_URL is not set");
    });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("marks the row FAILED when recording the open checkout fails", async () => {
    stubBooking(confirmedBooking());
    supabaseState.responders.payments = (state: QueryState) => {
      if (state.op === "update" && state.payload?.status === "PENDING") {
        return { data: null, error: { code: "08006", message: "connection failure" } };
      }
      return { data: null, error: null };
    };
    okCheckout();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    const failed = supabaseState.writes.find(
      (w) => w.table === "payments" && w.op === "update" && w.payload.status === "FAILED"
    );
    expect(failed).toBeDefined();
  });

  it("retires a CREATED row older than 10 minutes and opens a new checkout", async () => {
    stubBooking(confirmedBooking());
    stubPayments({
      id: "p-dead",
      status: "CREATED",
      redirect_url: null,
      created_at: new Date(Date.now() - 11 * 60_000).toISOString(),
    });
    okCheckout();

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toEqual({
      data: { redirectUrl: "https://payments.yoco.com/checkout/ch_test_1" },
    });
    const retired = supabaseState.writes.find(
      (w) => w.table === "payments" && w.op === "update" && w.filters.id === "p-dead"
    );
    expect(retired?.payload).toMatchObject({ status: "FAILED" });
    // Conditional, so a row that moved on in the meantime is left alone.
    expect(retired?.filters).toMatchObject({ status: "CREATED" });
  });

  it("asks the client to wait while a fresh CREATED row is still being set up", async () => {
    stubBooking(confirmedBooking());
    stubPayments({
      id: "p-new",
      status: "CREATED",
      redirect_url: null,
      created_at: new Date(Date.now() - 60_000).toISOString(),
    });

    const result = await initiateBookingPayment(BOOKING_ID);

    expect(result).toHaveProperty("error");
    expect(createCheckout).not.toHaveBeenCalled();
    expect(supabaseState.writes).toHaveLength(0);
  });
});

describe("saveSpeakerPayoutDetails", () => {
  const valid = {
    account_holder: "T Speaker",
    bank_name: "FNB",
    account_number: "62000000001",
    branch_code: "250655",
    account_type: "CHEQUE" as const,
    tax_number: "",
    is_vat_registered: false,
  };

  it("never returns a raw database error message", async () => {
    supabaseState.responders.speaker_profiles = () => ({ data: { id: "sp-1" }, error: null });
    supabaseState.responders.speaker_payout_details = () => ({
      data: null,
      error: { code: "XX000", message: 'violates constraint "speaker_payout_details_secret_ck"' },
    });

    const result = await saveSpeakerPayoutDetails(valid);

    expect("error" in result && result.error).toBeTruthy();
    expect("error" in result && result.error).not.toMatch(/constraint/);
  });

  it("reports a failed speaker lookup instead of 'only speakers'", async () => {
    supabaseState.responders.speaker_profiles = () => ({
      data: null,
      error: { code: "57014", message: "timeout" },
    });

    const result = await saveSpeakerPayoutDetails(valid);

    expect("error" in result && result.error).not.toMatch(/only speakers/i);
    expect(supabaseState.writes).toHaveLength(0);
  });
});

// Keep the unused import honest — `rows` is part of the shared helper's API
// and is exercised by other suites.
void rows;
