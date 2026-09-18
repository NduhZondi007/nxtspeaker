/**
 * The payment provider seam.
 *
 * Nothing outside `src/lib/payments/` imports the Yoco client directly —
 * Server Actions and route handlers depend on these types and on
 * `getPaymentProvider()` from `./index`. That containment is deliberate: Yoco
 * has no payout API, and if NxtSpeaker ever needs automated speaker payouts
 * the gateway has to change. When it does, this directory is the blast radius.
 *
 * Methods return `{ data }` or `{ error }` and never throw, matching the
 * Server Action contract in CLAUDE.md so callers compose without try/catch.
 */

export type PaymentProviderName = "yoco";

export interface CreateCheckoutParams {
  /** Amount in whole cents. Yoco rejects anything else. */
  amountCents: number;
  currency: "ZAR";
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  /** Echoed back on the webhook — carries booking_id and payment_id. */
  metadata: Record<string, string>;
  /** Our payment row id, for provider-side reconciliation. */
  externalId: string;
  idempotencyKey: string;
}

export interface ProviderCheckout {
  id: string;
  status: "created" | "started" | "processing" | "completed";
  redirectUrl: string;
  paymentId: string | null;
  merchantId: string;
  /** Never reconcile a `test` payment against live money. */
  processingMode: "live" | "test";
}

export interface ProviderRefund {
  id: string;
  refundId: string | null;
  /** `pending` must be resolved by webhook, never assumed successful. */
  status: "succeeded" | "pending";
}

export type SignatureFailure =
  | "missing_headers"
  | "bad_secret"
  | "timestamp_out_of_window"
  | "malformed_signature"
  | "mismatch";

export interface VerifySignatureInput {
  /** `webhook-id` header. */
  id: string | null;
  /** `webhook-timestamp` header, Unix seconds as a string. */
  timestamp: string | null;
  /** `webhook-signature` header, e.g. `v1,<base64>` (space-separated list). */
  signature: string | null;
  /** The exact bytes received. Re-serialised JSON will never verify. */
  rawBody: string;
  /** `whsec_<base64>`. */
  secret: string;
  nowMs?: number;
  toleranceSeconds?: number;
}

export type VerifySignatureResult = { ok: true } | { ok: false; reason: SignatureFailure };

export type ProviderResult<T> = { data: T } | { error: string };

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  createCheckout(params: CreateCheckoutParams): Promise<ProviderResult<ProviderCheckout>>;
  /** Omit `amountCents` for a full refund, which is the platform's policy. */
  refundCheckout(
    checkoutId: string,
    idempotencyKey: string,
    amountCents?: number
  ): Promise<ProviderResult<ProviderRefund>>;
  verifyWebhookSignature(input: VerifySignatureInput): VerifySignatureResult;
}
