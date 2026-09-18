// @vitest-environment node

// The Yoco client is server-only: config.ts throws if `window` is defined, so
// this file must not run under the default jsdom environment. That guard
// firing here is the guard working.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { yocoProvider } from "@/lib/payments/yoco";

/**
 * The Yoco client crosses a trust boundary in both directions: we must send
 * exactly what Yoco expects (cents, ZAR, an idempotency key) and must not
 * trust what comes back.
 */

const VALID_CHECKOUT = {
  id: "ch_test_abc123",
  status: "created",
  redirectUrl: "https://payments.yoco.com/checkout/ch_test_abc123",
  paymentId: null,
  merchantId: "merch_test_1",
  processingMode: "test",
};

function params(overrides: Record<string, unknown> = {}) {
  return {
    amountCents: 8_500_000,
    currency: "ZAR" as const,
    successUrl: "https://nxtspeaker.com/client/bookings/b1/payment?state=success",
    cancelUrl: "https://nxtspeaker.com/client/bookings/b1/payment?state=cancelled",
    failureUrl: "https://nxtspeaker.com/client/bookings/b1/payment?state=failed",
    metadata: { booking_id: "b1", payment_id: "p1" },
    externalId: "p1",
    idempotencyKey: "nxts_p1",
    ...overrides,
  };
}

function respond(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status })
  );
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.YOCO_SECRET_KEY = "sk_test_key";
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function stubFetch(status: number, body: unknown) {
  fetchSpy = respond(status, body);
  vi.stubGlobal("fetch", fetchSpy);
}

describe("yocoProvider.createCheckout", () => {
  it("returns the parsed checkout on success", async () => {
    stubFetch(200, VALID_CHECKOUT);

    const result = await yocoProvider.createCheckout(params());

    expect(result).toEqual({
      data: {
        id: "ch_test_abc123",
        status: "created",
        redirectUrl: "https://payments.yoco.com/checkout/ch_test_abc123",
        paymentId: null,
        merchantId: "merch_test_1",
        processingMode: "test",
      },
    });
  });

  it("posts the amount in cents, in ZAR, to the checkouts endpoint", async () => {
    stubFetch(200, VALID_CHECKOUT);

    await yocoProvider.createCheckout(params());

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://payments.yoco.com/api/checkouts");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body);
    expect(body.amount).toBe(8_500_000);
    expect(body.currency).toBe("ZAR");
    expect(body.metadata).toEqual({ booking_id: "b1", payment_id: "p1" });
    expect(body.externalId).toBe("p1");
  });

  it("sends the bearer token and the idempotency key", async () => {
    stubFetch(200, VALID_CHECKOUT);

    await yocoProvider.createCheckout(params());

    const { headers } = fetchSpy.mock.calls[0][1];
    expect(headers.Authorization).toBe("Bearer sk_test_key");
    expect(headers["Idempotency-Key"]).toBe("nxts_p1");
  });

  // Yoco rejects a non-integer amount, and a fractional cent here would mean
  // the commission split upstream was wrong.
  it.each([0, -1, 1.5, NaN])("refuses to send %s as an amount", async (amountCents) => {
    stubFetch(200, VALID_CHECKOUT);

    const result = await yocoProvider.createCheckout(params({ amountCents }));

    expect(result).toHaveProperty("error");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  describe("provider failures return an error rather than throwing", () => {
    it.each([
      [403, /configuration/i],
      [409, /already being set up/i],
      [422, /could not be started again/i],
      [500, /unavailable/i],
    ])("maps %s to a caller-safe message", async (status, pattern) => {
      stubFetch(status, { message: "nope" });

      const result = await yocoProvider.createCheckout(params());

      expect("error" in result && result.error).toMatch(pattern);
    });
  });

  it("returns an error when the response is not JSON", async () => {
    stubFetch(200, "<html>gateway timeout</html>");

    const result = await yocoProvider.createCheckout(params());

    expect(result).toHaveProperty("error");
  });

  // Never trust the shape coming back: a missing redirectUrl would otherwise
  // send the client to `undefined`.
  it("returns an error when the response fails validation", async () => {
    stubFetch(200, { id: "ch_1", status: "created" });

    const result = await yocoProvider.createCheckout(params());

    expect(result).toHaveProperty("error");
  });

  it("tolerates unknown fields Yoco may add later", async () => {
    stubFetch(200, { ...VALID_CHECKOUT, someNewField: "surprise" });

    const result = await yocoProvider.createCheckout(params());

    expect(result).toHaveProperty("data");
  });

  it("returns an error when the network call fails", async () => {
    fetchSpy = vi.fn(async () => {
      throw new Error("ECONNRESET");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await yocoProvider.createCheckout(params());

    expect("error" in result && result.error).toMatch(/could not reach/i);
  });
});

describe("yocoProvider.refundCheckout", () => {
  it("omits the amount for a full refund, which is the platform policy", async () => {
    stubFetch(200, { id: "ch_1", refundId: "rf_1", status: "succeeded" });

    await yocoProvider.refundCheckout("ch_1", "nxts_refund_1");

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://payments.yoco.com/api/checkouts/ch_1/refund");
    expect(JSON.parse(init.body)).toEqual({});
    expect(init.headers["Idempotency-Key"]).toBe("nxts_refund_1");
  });

  it("sends an amount for a partial refund", async () => {
    stubFetch(200, { id: "ch_1", refundId: "rf_1", status: "succeeded" });

    await yocoProvider.refundCheckout("ch_1", "nxts_refund_1", 500_000);

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({ amount: 500_000 });
  });

  // A pending refund has not happened yet and must be resolved by webhook.
  it("surfaces a pending status rather than reporting success", async () => {
    stubFetch(200, { id: "ch_1", refundId: null, status: "pending" });

    const result = await yocoProvider.refundCheckout("ch_1", "nxts_refund_1");

    expect(result).toEqual({ data: { id: "ch_1", refundId: null, status: "pending" } });
  });

  it("escapes the checkout id in the path", async () => {
    stubFetch(200, { id: "ch/1", refundId: null, status: "succeeded" });

    await yocoProvider.refundCheckout("ch/1", "nxts_refund_1");

    expect(fetchSpy.mock.calls[0][0]).toBe("https://payments.yoco.com/api/checkouts/ch%2F1/refund");
  });

  it("returns an error on a provider failure", async () => {
    stubFetch(403, { message: "bad key" });

    const result = await yocoProvider.refundCheckout("ch_1", "nxts_refund_1");

    expect(result).toHaveProperty("error");
  });
});

describe("the provider surface", () => {
  it("is named yoco and exposes no payout capability", () => {
    expect(yocoProvider.name).toBe("yoco");
    // Yoco settles only to the merchant's own bank account. If a payout method
    // ever appears here, the escrow design has been misunderstood.
    expect(yocoProvider).not.toHaveProperty("createPayout");
    expect(yocoProvider).not.toHaveProperty("createTransfer");
  });
});
