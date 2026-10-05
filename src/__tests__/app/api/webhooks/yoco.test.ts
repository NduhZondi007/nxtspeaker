// @vitest-environment node

// The route reads server-only config, so it must not run under jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
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

import { POST, GET } from "@/app/api/webhooks/yoco/route";

const SECRET_BYTES = Buffer.from("webhook-test-key-thirty-two-byte!", "utf8");
const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

const PAYMENT_ID = "44444444-4444-4444-8444-444444444444";
const BOOKING_ID = "33333333-3333-4333-8333-333333333333";

function succeededEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_1",
    type: "payment.succeeded",
    createdDate: "2026-09-18T10:00:00Z",
    payload: {
      id: "p_yoco_1",
      status: "succeeded",
      amount: 8_500_000,
      currency: "ZAR",
      metadata: { booking_id: BOOKING_ID, payment_id: PAYMENT_ID },
      ...(overrides.payload as Record<string, unknown> | undefined),
    },
    ...overrides,
  };
}

function request(body: unknown, headerOverrides: Record<string, string | null> = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const webhookId = "msg_1";
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `v1,${createHmac("sha256", SECRET_BYTES)
    .update(`${webhookId}.${timestamp}.${raw}`)
    .digest("base64")}`;

  const headers = new Headers({
    "content-type": "application/json",
    "webhook-id": webhookId,
    "webhook-timestamp": timestamp,
    "webhook-signature": signature,
  });

  for (const [key, value] of Object.entries(headerOverrides)) {
    if (value === null) headers.delete(key);
    else headers.set(key, value);
  }

  return new Request("https://nxtspeaker.co.za/api/webhooks/yoco", {
    method: "POST",
    headers,
    body: raw,
  });
}

/** A fresh event: the dedupe insert succeeds. */
function stubFreshEvent() {
  supabaseState.responders.webhook_events = (state: QueryState) => {
    if (state.op === "insert") return { data: { id: "we_1" }, error: null };
    if (state.op === "update") return { data: { id: "we_1" }, error: null };
    return { data: null, error: null };
  };
}

/** A redelivery: the unique index rejects the insert. */
function stubDuplicateEvent(processed: boolean) {
  supabaseState.responders.webhook_events = (state: QueryState) => {
    if (state.op === "insert") {
      return { data: null, error: { code: "23505", message: "duplicate key" } };
    }
    if (state.op === "update") return { data: { id: "we_1" }, error: null };
    return {
      data: { id: "we_1", processed_at: processed ? "2026-09-18T10:00:01Z" : null },
      error: null,
    };
  };
}

function stubPaymentLookup(payment: Record<string, unknown> | null) {
  supabaseState.responders.payments = () => ({ data: payment, error: null });
}

function stubRpc(result: Record<string, unknown>) {
  supabaseState.rpcResponders.record_successful_payment = () => ({ data: result, error: null });
}

beforeEach(() => {
  resetSupabaseState();
  process.env.YOCO_WEBHOOK_SECRET = SECRET;
  delete process.env.YOCO_SECRET_KEY;
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/webhooks/yoco — signature", () => {
  it("accepts a correctly signed payment.succeeded event", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(200);
  });

  it("rejects a tampered body", async () => {
    stubFreshEvent();
    const req = request(succeededEvent());
    const tampered = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(succeededEvent({ payload: { amount: 1 } })),
    });

    const response = await POST(tampered);

    expect(response.status).toBe(400);
  });

  // Verifying before touching the database is what stops an attacker POSTing
  // a forged webhook-id to poison the dedupe table and suppress the real
  // event when it arrives.
  it("writes nothing when the signature is invalid", async () => {
    stubFreshEvent();

    await POST(request(succeededEvent(), { "webhook-signature": "v1,bm90LWEtc2ln" }));

    expect(supabaseState.writes).toHaveLength(0);
    expect(supabaseState.rpcCalls).toHaveLength(0);
  });

  it.each(["webhook-id", "webhook-timestamp", "webhook-signature"])(
    "rejects a request missing %s",
    async (header) => {
      stubFreshEvent();

      const response = await POST(request(succeededEvent(), { [header]: null }));

      expect(response.status).toBe(400);
      expect(supabaseState.writes).toHaveLength(0);
    }
  );

  it("rejects a replayed event outside the timestamp window", async () => {
    stubFreshEvent();
    const stale = String(Math.floor(Date.now() / 1000) - 3600);

    const response = await POST(request(succeededEvent(), { "webhook-timestamp": stale }));

    expect(response.status).toBe(400);
  });
});

describe("POST /api/webhooks/yoco — idempotency", () => {
  it("acknowledges a redelivery of an already-processed event without reapplying it", async () => {
    stubDuplicateEvent(true);
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "SUCCEEDED" });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(0);
  });

  // A row stuck with processed_at NULL means a previous attempt crashed
  // mid-flight; the RPC is itself idempotent, so re-applying is safe.
  it("re-applies an event whose previous attempt never completed", async () => {
    stubDuplicateEvent(false);
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(1);
  });

  it("calls the ledger RPC exactly once for one delivery", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    await POST(request(succeededEvent()));

    expect(supabaseState.rpcCalls).toHaveLength(1);
    expect(supabaseState.rpcCalls[0].name).toBe("record_successful_payment");
  });
});

describe("POST /api/webhooks/yoco — recording the payment", () => {
  it("passes the provider amount to the RPC for server-side re-verification", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    await POST(request(succeededEvent()));

    expect(supabaseState.rpcCalls[0].args).toMatchObject({
      p_payment_id: PAYMENT_ID,
      p_amount_cents: 8_500_000,
    });
  });

  // A mismatch will never succeed on retry, so it is acknowledged rather than
  // left to consume Yoco's 8 attempts. The RPC parks it for human review.
  it("acknowledges an amount mismatch instead of asking for a retry", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: false, reason: "amount_mismatch" });

    const response = await POST(request(succeededEvent({ payload: { amount: 1 } })));

    expect(response.status).toBe(200);
  });

  it("records the raw payload for audit", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    await POST(request(succeededEvent()));

    const insert = supabaseState.writes.find((w) => w.table === "webhook_events");
    expect(insert?.payload).toMatchObject({
      provider: "yoco",
      provider_event_id: "msg_1",
      event_type: "payment.succeeded",
      signature_verified: true,
    });
  });

  it("falls back to the checkout id when metadata carries no payment id", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const event = succeededEvent({
      payload: { metadata: {}, checkoutId: "ch_test_1", amount: 8_500_000 },
    });

    const response = await POST(request(event));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(1);
  });

  it("acknowledges an event for a payment it cannot resolve", async () => {
    stubFreshEvent();
    stubPaymentLookup(null);

    const event = succeededEvent({ payload: { metadata: {}, amount: 8_500_000 } });
    const response = await POST(request(event));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(0);
  });
});

describe("POST /api/webhooks/yoco — other events", () => {
  it("stores an unknown event type without applying anything", async () => {
    stubFreshEvent();

    const response = await POST(request({ id: "evt_2", type: "payment.something_new" }));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(0);
    expect(supabaseState.writes.some((w) => w.table === "webhook_events")).toBe(true);
  });

  it("rejects a body that is not JSON", async () => {
    stubFreshEvent();

    const response = await POST(request("not json at all"));

    expect(response.status).toBe(400);
  });
});

describe("POST /api/webhooks/yoco — transient failure", () => {
  // Yoco retries 8 times with backoff. A 500 is how the route asks for that;
  // returning 200 here would silently drop a real payment.
  it("returns 500 so the provider retries when the database is unavailable", async () => {
    supabaseState.responders.webhook_events = () => {
      throw new Error("connection reset");
    };

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
  });
});

describe("POST /api/webhooks/yoco — returned Supabase errors", () => {
  // supabase-js reports failures by RETURNING { error }, not by throwing. A
  // route that only catches throws treats every returned error as success.

  function webhookUpdates() {
    return supabaseState.writes.filter((w) => w.table === "webhook_events" && w.op === "update");
  }

  it("returns 500 and does not mark processed when the payment lookup errors", async () => {
    stubFreshEvent();
    supabaseState.responders.payments = () => ({
      data: null,
      error: { code: "57014", message: "statement timeout" },
    });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
    expect(supabaseState.rpcCalls).toHaveLength(0);
    expect(webhookUpdates()).toHaveLength(0);
  });

  it("returns 500 and does not mark processed when the ledger RPC returns an error", async () => {
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    supabaseState.rpcResponders.record_successful_payment = () => ({
      data: null,
      error: { code: "40001", message: "could not serialize access" },
    });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
    expect(webhookUpdates()).toHaveLength(0);
  });

  it("returns 500 when marking the event processed fails", async () => {
    supabaseState.responders.webhook_events = (state: QueryState) => {
      if (state.op === "insert") return { data: { id: "we_1" }, error: null };
      if (state.op === "update") return { data: null, error: { code: "08006", message: "gone" } };
      return { data: null, error: null };
    };
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
  });

  it("treats a dedupe insert failure other than a unique violation as transient", async () => {
    supabaseState.responders.webhook_events = (state: QueryState) => {
      if (state.op === "insert") {
        return { data: null, error: { code: "08006", message: "connection failure" } };
      }
      return { data: null, error: null };
    };
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
    expect(supabaseState.rpcCalls).toHaveLength(0);
  });

  it("returns 500 when reading back a duplicate event errors", async () => {
    supabaseState.responders.webhook_events = (state: QueryState) => {
      if (state.op === "insert") {
        return { data: null, error: { code: "23505", message: "duplicate key" } };
      }
      return { data: null, error: { code: "57014", message: "statement timeout" } };
    };
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent()));

    expect(response.status).toBe(500);
    expect(supabaseState.rpcCalls).toHaveLength(0);
  });
});

describe("POST /api/webhooks/yoco — which events record money", () => {
  // Only payment.succeeded means money arrived. payment.created and
  // checkout.completed fire before (or without) a captured payment.
  it.each(["payment.created", "checkout.completed"])(
    "does not record a payment for %s",
    async (type) => {
      stubFreshEvent();
      stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
      stubRpc({ applied: true });

      const response = await POST(request(succeededEvent({ type })));

      expect(response.status).toBe(200);
      expect(supabaseState.rpcCalls).toHaveLength(0);
    }
  );

  it("refuses to record a test-mode payment against a live secret key", async () => {
    process.env.YOCO_SECRET_KEY = "sk_live_abc";
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent({ payload: { mode: "test" } })));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(0);
    const update = supabaseState.writes.find(
      (w) => w.table === "webhook_events" && w.op === "update"
    );
    expect(update?.payload.processing_error).toBe("test_mode_on_live_key");
    expect(update?.payload.processed_at).toBeTruthy();
  });

  it("records a test-mode payment when the configured key is a test key", async () => {
    process.env.YOCO_SECRET_KEY = "sk_test_abc";
    stubFreshEvent();
    stubPaymentLookup({ id: PAYMENT_ID, booking_id: BOOKING_ID, status: "PENDING" });
    stubRpc({ applied: true });

    const response = await POST(request(succeededEvent({ payload: { mode: "test" } })));

    expect(response.status).toBe(200);
    expect(supabaseState.rpcCalls).toHaveLength(1);
  });
});

describe("GET /api/webhooks/yoco", () => {
  it("is not allowed", async () => {
    const response = await GET();
    expect(response.status).toBe(405);
  });
});
