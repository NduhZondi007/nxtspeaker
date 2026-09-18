import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "@/lib/payments/yoco";

/**
 * The webhook is the only thing that tells NxtSpeaker money arrived, and the
 * route is reachable by anyone on the internet. Signature verification is the
 * whole of the trust boundary, so it is tested as an adversary would probe it.
 *
 * Fixtures are signed in-test with the same primitives Yoco uses, so they are
 * self-consistent rather than copied from a doc that may drift.
 */

const SECRET_BYTES = Buffer.from("a-test-signing-key-32-bytes-long!", "utf8");
const SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

const WEBHOOK_ID = "msg_2abc123";
const NOW_MS = 1_760_000_000_000;
const TIMESTAMP = String(Math.floor(NOW_MS / 1000));
const RAW_BODY = JSON.stringify({ type: "payment.succeeded", payload: { amount: 1_000_000 } });

function sign(
  body: string,
  id: string = WEBHOOK_ID,
  timestamp: string = TIMESTAMP,
  key: Buffer = SECRET_BYTES
): string {
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

function verify(overrides: Partial<Parameters<typeof verifyWebhookSignature>[0]> = {}) {
  return verifyWebhookSignature({
    id: WEBHOOK_ID,
    timestamp: TIMESTAMP,
    signature: `v1,${sign(RAW_BODY)}`,
    rawBody: RAW_BODY,
    secret: SECRET,
    nowMs: NOW_MS,
    ...overrides,
  });
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed event", () => {
    expect(verify()).toEqual({ ok: true });
  });

  it("accepts a signature signed moments ago", () => {
    expect(verify({ nowMs: NOW_MS + 60_000 })).toEqual({ ok: true });
  });

  describe("forgery", () => {
    it("rejects a tampered body", () => {
      const tampered = JSON.stringify({ type: "payment.succeeded", payload: { amount: 1 } });
      expect(verify({ rawBody: tampered })).toEqual({ ok: false, reason: "mismatch" });
    });

    // If the id were not covered by the signature, an attacker could replay a
    // genuine event under a fresh webhook-id and slip past the dedupe table.
    it("rejects a tampered webhook id", () => {
      expect(verify({ id: "msg_attacker" })).toEqual({ ok: false, reason: "mismatch" });
    });

    it("rejects a tampered timestamp", () => {
      const shifted = String(Math.floor(NOW_MS / 1000) - 30);
      expect(verify({ timestamp: shifted })).toEqual({ ok: false, reason: "mismatch" });
    });

    it("rejects a signature made with the wrong key", () => {
      const other = Buffer.from("a-different-key-of-the-same-size!", "utf8");
      expect(verify({ signature: `v1,${sign(RAW_BODY, WEBHOOK_ID, TIMESTAMP, other)}` }))
        .toEqual({ ok: false, reason: "mismatch" });
    });

    it("rejects an empty signature value", () => {
      expect(verify({ signature: "v1," })).toEqual({ ok: false, reason: "malformed_signature" });
    });
  });

  describe("replay protection", () => {
    it("rejects an event signed outside the tolerance window", () => {
      expect(verify({ nowMs: NOW_MS + 200_000 })).toEqual({
        ok: false,
        reason: "timestamp_out_of_window",
      });
    });

    // A future-dated timestamp is just as much a forgery signal as a stale one.
    it("rejects a future-dated event", () => {
      expect(verify({ nowMs: NOW_MS - 200_000 })).toEqual({
        ok: false,
        reason: "timestamp_out_of_window",
      });
    });

    it("honours a widened tolerance", () => {
      expect(verify({ nowMs: NOW_MS + 200_000, toleranceSeconds: 600 })).toEqual({ ok: true });
    });

    it.each(["", "not-a-number", "NaN"])("rejects %s as a timestamp", (timestamp) => {
      expect(verify({ timestamp })).toEqual({
        ok: false,
        reason: timestamp === "" ? "missing_headers" : "timestamp_out_of_window",
      });
    });
  });

  describe("headers", () => {
    it.each(["id", "timestamp", "signature"] as const)("rejects a missing %s", (header) => {
      expect(verify({ [header]: null })).toEqual({ ok: false, reason: "missing_headers" });
    });
  });

  describe("signature header format", () => {
    // Yoco sends a space-separated list of versioned signatures so a secret
    // can be rotated without dropping in-flight deliveries.
    it("accepts a valid v1 among several candidates", () => {
      const header = `v1,${sign(RAW_BODY, WEBHOOK_ID, TIMESTAMP, Buffer.from("stale-key-aaaaaaaaaaaaaaaaaaaaaa!", "utf8"))} v1,${sign(RAW_BODY)}`;
      expect(verify({ signature: header })).toEqual({ ok: true });
    });

    it("ignores versions it does not understand", () => {
      expect(verify({ signature: `v2,${sign(RAW_BODY)}` })).toEqual({
        ok: false,
        reason: "malformed_signature",
      });
    });

    it("rejects a header with no version prefix", () => {
      expect(verify({ signature: sign(RAW_BODY) })).toEqual({
        ok: false,
        reason: "malformed_signature",
      });
    });

    // timingSafeEqual throws when buffer lengths differ. Length is not secret,
    // so it is checked first — but a short signature must not crash the route.
    it("does not throw on a signature of the wrong length", () => {
      expect(() => verify({ signature: "v1,c2hvcnQ=" })).not.toThrow();
      expect(verify({ signature: "v1,c2hvcnQ=" })).toEqual({ ok: false, reason: "mismatch" });
    });
  });

  describe("secret handling", () => {
    it("rejects a secret without the whsec_ prefix", () => {
      expect(verify({ secret: SECRET_BYTES.toString("base64") })).toEqual({
        ok: false,
        reason: "bad_secret",
      });
    });

    it("rejects an empty secret", () => {
      expect(verify({ secret: "" })).toEqual({ ok: false, reason: "bad_secret" });
    });
  });

  it("verifies an empty body", () => {
    expect(
      verify({ rawBody: "", signature: `v1,${sign("")}` })
    ).toEqual({ ok: true });
  });

  // The signature covers the exact bytes Yoco sent. Re-serialising the parsed
  // JSON changes key order and whitespace and would never verify — this pins
  // the requirement that the route reads the raw body.
  it("is sensitive to byte-level differences that JSON.parse would erase", () => {
    const reserialised = JSON.stringify(JSON.parse(RAW_BODY.replace(/"amount"/, ' "amount" ')));
    expect(verify({ rawBody: `${reserialised} ` })).toEqual({ ok: false, reason: "mismatch" });
  });
});
