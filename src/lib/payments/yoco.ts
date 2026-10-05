/**
 * Yoco Online Payments client.
 *
 * No SDK and no new runtime dependency — `fetch` and `node:crypto` only.
 * Responses are Zod-parsed rather than trusted, because everything here
 * crosses a trust boundary.
 *
 * Yoco collects; it does not pay out. There is no transfer, split or
 * sub-merchant endpoint — Yoco settles only to the merchant's own bank
 * account. The speaker's 85% leaves the business as an EFT an admin performs,
 * which is why there is no payout function in this file and why one cannot be
 * added.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getYocoSecretKey } from "./config";
import type {
  CreateCheckoutParams,
  PaymentProvider,
  ProviderCheckout,
  ProviderRefund,
  ProviderResult,
  VerifySignatureInput,
  VerifySignatureResult,
} from "./provider";
import { createLogger } from "@/lib/logger";

const log = createLogger("yoco");

const YOCO_CHECKOUTS_URL = "https://payments.yoco.com/api/checkouts";
const REQUEST_TIMEOUT_MS = 15_000;
const WEBHOOK_SECRET_PREFIX = "whsec_";
const DEFAULT_TOLERANCE_SECONDS = 180;

/** `.loose()` so a field Yoco adds later does not break every checkout. */
const CheckoutResponse = z
  .object({
    id: z.string(),
    status: z.enum(["created", "started", "processing", "completed"]),
    redirectUrl: z.string().url(),
    paymentId: z.string().nullish(),
    merchantId: z.string(),
    processingMode: z.enum(["live", "test"]),
  })
  .loose();

const RefundResponse = z
  .object({
    id: z.string(),
    refundId: z.string().nullish(),
    status: z.enum(["succeeded", "pending"]),
  })
  .loose();

/**
 * Turns a Yoco HTTP failure into a message a caller can surface.
 *
 * 403 means the key is wrong, which is a deployment fault rather than
 * anything the client did — it is logged loudly and reported generically.
 * 409/422 are idempotency outcomes and mean the caller should re-read state
 * rather than retry blindly.
 */
function describeFailure(status: number, body: string): string {
  switch (status) {
    case 403:
      log.error("request rejected — check YOCO_SECRET_KEY");
      return "Payment provider configuration error. Please contact support.";
    case 409:
      return "This payment is already being set up. Give it a moment and try again.";
    case 422:
      log.error("idempotency key reused with a different payload");
      return "This payment could not be started again. Please refresh and retry.";
    default:
      log.error("unexpected response", { status, body: body.slice(0, 500) });
      return "The payment provider is unavailable right now. Please try again shortly.";
  }
}

async function postToYoco(
  url: string,
  body: unknown,
  idempotencyKey: string
): Promise<ProviderResult<unknown>> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getYocoSecretKey()}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (cause) {
    log.error("request failed", { cause });
    return { error: "Could not reach the payment provider. Please try again." };
  }

  const text = await response.text();

  if (!response.ok) {
    return { error: describeFailure(response.status, text) };
  }

  try {
    return { data: JSON.parse(text) };
  } catch {
    log.error("unparseable success response", { body: text.slice(0, 500) });
    return { error: "The payment provider returned an unreadable response." };
  }
}

async function createCheckout(
  params: CreateCheckoutParams
): Promise<ProviderResult<ProviderCheckout>> {
  if (!Number.isInteger(params.amountCents) || params.amountCents <= 0) {
    return { error: "Payment amount must be a positive whole number of cents" };
  }

  const result = await postToYoco(
    YOCO_CHECKOUTS_URL,
    {
      amount: params.amountCents,
      currency: params.currency,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      failureUrl: params.failureUrl,
      metadata: params.metadata,
      externalId: params.externalId,
    },
    params.idempotencyKey
  );

  if ("error" in result) return result;

  const parsed = CheckoutResponse.safeParse(result.data);
  if (!parsed.success) {
    log.error("checkout response failed validation", { issues: parsed.error.issues });
    return { error: "The payment provider returned an unexpected response." };
  }

  return {
    data: {
      id: parsed.data.id,
      status: parsed.data.status,
      redirectUrl: parsed.data.redirectUrl,
      paymentId: parsed.data.paymentId ?? null,
      merchantId: parsed.data.merchantId,
      processingMode: parsed.data.processingMode,
    },
  };
}

async function refundCheckout(
  checkoutId: string,
  idempotencyKey: string,
  amountCents?: number
): Promise<ProviderResult<ProviderRefund>> {
  // Omitting `amount` refunds the full amount, which is the platform's policy.
  const body = amountCents === undefined ? {} : { amount: amountCents };

  const result = await postToYoco(
    `${YOCO_CHECKOUTS_URL}/${encodeURIComponent(checkoutId)}/refund`,
    body,
    idempotencyKey
  );

  if ("error" in result) return result;

  const parsed = RefundResponse.safeParse(result.data);
  if (!parsed.success) {
    log.error("refund response failed validation", { issues: parsed.error.issues });
    return { error: "The payment provider returned an unexpected refund response." };
  }

  return {
    data: {
      id: parsed.data.id,
      refundId: parsed.data.refundId ?? null,
      status: parsed.data.status,
    },
  };
}

/**
 * Verifies a Yoco webhook signature.
 *
 * Signed content is `${webhook-id}.${webhook-timestamp}.${rawBody}`, HMAC'd
 * with SHA-256 and base64-encoded. The secret is `whsec_<base64>`: the key is
 * the *decoded bytes* of the part after the prefix, not the string itself.
 *
 * `nowMs` and `toleranceSeconds` are injectable purely so replay and expiry
 * are deterministically testable — the same discipline as the `today`
 * parameter on `validateBookingDates`.
 */
export function verifyWebhookSignature({
  id,
  timestamp,
  signature,
  rawBody,
  secret,
  nowMs = Date.now(),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: VerifySignatureInput): VerifySignatureResult {
  if (!id || !timestamp || !signature) {
    return { ok: false, reason: "missing_headers" };
  }

  // Replay window, checked in both directions: a future-dated timestamp is as
  // much a forgery signal as a stale one.
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) {
    return { ok: false, reason: "timestamp_out_of_window" };
  }
  if (Math.abs(nowMs / 1000 - seconds) > toleranceSeconds) {
    return { ok: false, reason: "timestamp_out_of_window" };
  }

  if (!secret.startsWith(WEBHOOK_SECRET_PREFIX)) {
    return { ok: false, reason: "bad_secret" };
  }
  const key = Buffer.from(secret.slice(WEBHOOK_SECRET_PREFIX.length), "base64");
  if (key.length === 0) {
    return { ok: false, reason: "bad_secret" };
  }

  const expected = Buffer.from(
    createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest("base64"),
    "utf8"
  );

  // The header is a space-separated list of `v<n>,<sig>` pairs so a secret can
  // be rotated without dropping in-flight deliveries. Any valid v1 wins.
  let sawCandidate = false;

  for (const part of signature.split(" ")) {
    const separator = part.indexOf(",");
    if (separator === -1) continue;

    const version = part.slice(0, separator);
    const candidateValue = part.slice(separator + 1);
    if (version !== "v1" || candidateValue.length === 0) continue;

    sawCandidate = true;
    const candidate = Buffer.from(candidateValue, "utf8");

    // timingSafeEqual throws when lengths differ. Length is not secret, so
    // comparing it first is safe and keeps a short signature from crashing
    // the route.
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: sawCandidate ? "mismatch" : "malformed_signature" };
}

export const yocoProvider: PaymentProvider = {
  name: "yoco",
  createCheckout,
  refundCheckout,
  verifyWebhookSignature,
};
