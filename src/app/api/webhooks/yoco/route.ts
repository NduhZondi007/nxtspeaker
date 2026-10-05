import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { getPaymentProvider } from "@/lib/payments";
import { getYocoWebhookSecret, getWebhookToleranceSeconds } from "@/lib/payments/config";
import { createLogger } from "@/lib/logger";

const log = createLogger("yoco-webhook");

/**
 * Yoco payment webhook.
 *
 * This is the only thing that tells NxtSpeaker money arrived, and it is
 * reachable by anyone on the internet. The redirect back from Yoco proves
 * nothing and writes nothing — Yoco's own documentation says not to trust
 * `successUrl` — so every state change in the payment flow originates here.
 *
 * Order matters and is deliberate:
 *   1. read the RAW body,
 *   2. verify the signature,
 *   3. only then touch the database.
 *
 * Verifying before the dedupe insert is what stops an attacker POSTing a
 * forged `webhook-id` to poison the dedupe table and suppress the genuine
 * event when it arrives.
 */

// node:crypto.timingSafeEqual is unavailable on the Edge runtime, and Fluid
// Compute makes Node the right default anyway.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Event types that mean "the client's money has arrived". */
const SUCCESS_EVENT_TYPES = new Set([
  "payment.succeeded",
  "payment.created",
  "checkout.completed",
]);

interface ResolvedEvent {
  type: string;
  paymentId: string | null;
  checkoutId: string | null;
  providerPaymentId: string | null;
  amountCents: number | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Reads the fields we need out of a Yoco event.
 *
 * Deliberately permissive rather than strictly schema-validated: Yoco's
 * documented payload shape has changed between API generations (a flat
 * `event_type`/`payment_id` form and a nested `type`/`payload` form both
 * appear in their docs), and an event we fail to parse is a payment we fail
 * to record. Anything unrecognised is still stored for audit and acknowledged.
 */
function resolveEvent(body: unknown): ResolvedEvent {
  const event = asRecord(body);
  const payload = asRecord(event.payload);
  const metadata = { ...asRecord(event.metadata), ...asRecord(payload.metadata) };

  const rawAmount = payload.amount ?? event.amount;
  const amountCents =
    typeof rawAmount === "number" && Number.isFinite(rawAmount) ? Math.round(rawAmount) : null;

  return {
    type: asString(event.type) ?? asString(event.event_type) ?? "unknown",
    paymentId: asString(metadata.payment_id),
    checkoutId:
      asString(payload.checkoutId) ??
      asString(payload.checkout_id) ??
      asString(event.checkoutId) ??
      asString(event.order_id),
    providerPaymentId:
      asString(payload.id) ?? asString(event.payment_id) ?? asString(payload.paymentId),
    amountCents,
  };
}

export async function POST(request: Request): Promise<Response> {
  // The signature covers the exact bytes Yoco sent. `request.json()` consumes
  // the stream, and `JSON.stringify(parsed)` is not byte-identical — key
  // order, whitespace and number formatting all differ — so the raw text must
  // be read first, and the body can only be read once.
  const rawBody = await request.text();

  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const webhookSignature = request.headers.get("webhook-signature");

  const verdict = getPaymentProvider().verifyWebhookSignature({
    id: webhookId,
    timestamp: webhookTimestamp,
    signature: webhookSignature,
    rawBody,
    secret: getYocoWebhookSecret(),
    toleranceSeconds: getWebhookToleranceSeconds(),
  });

  if (!verdict.ok) {
    // Never log the body or the secret — only why it was refused.
    log.warn("rejected", { reason: verdict.reason });
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    log.warn("signed request carried an unparseable body");
    return Response.json({ error: "Malformed payload" }, { status: 400 });
  }

  const event = resolveEvent(parsedBody);

  try {
    const service = createServiceClient();

    // Dedupe is a database constraint, not an in-memory set: a serverless
    // function has no memory shared across invocations, and Yoco retries a
    // failed delivery eight times.
    const { data: inserted, error: insertError } = await service
      .from("webhook_events")
      .insert({
        provider: "yoco",
        provider_event_id: webhookId,
        event_type: event.type,
        payload: parsedBody,
        signature_verified: true,
      })
      .select("id")
      .single();

    let eventRowId = inserted?.id as string | undefined;

    if (insertError) {
      const { data: existing } = await service
        .from("webhook_events")
        .select("id, processed_at")
        .eq("provider", "yoco")
        .eq("provider_event_id", webhookId)
        .maybeSingle();

      // Already applied — acknowledge and stop. This is the path most
      // redeliveries take.
      if (existing?.processed_at) {
        return Response.json({ status: "duplicate" }, { status: 200 });
      }

      // Seen but never finished: a previous attempt crashed mid-processing.
      // The ledger RPC is itself idempotent, so re-applying is safe.
      eventRowId = existing?.id as string | undefined;
    }

    if (!SUCCESS_EVENT_TYPES.has(event.type)) {
      // Stored for audit, applied to nothing. An event type we do not handle
      // is not an error — acknowledging it stops pointless retries.
      await markProcessed(service, eventRowId, null);
      return Response.json({ status: "ignored" }, { status: 200 });
    }

    // Resolve our payment row: metadata first, then the checkout id.
    const lookup = service.from("payments").select("id, booking_id, status");
    const { data: payment } = event.paymentId
      ? await lookup.eq("id", event.paymentId).maybeSingle()
      : await lookup.eq("provider_checkout_id", event.checkoutId ?? "").maybeSingle();

    if (!payment) {
      log.error("could not resolve a payment for event", { webhookId });
      await markProcessed(service, eventRowId, "payment_not_found");
      return Response.json({ status: "unmatched" }, { status: 200 });
    }

    // The amount is re-verified inside the RPC, against the figure we priced
    // from the booking, in the same locked transaction that would advance it.
    const { data: outcome } = await service.rpc("record_successful_payment", {
      p_payment_id: payment.id,
      p_provider_payment_id: event.providerPaymentId,
      p_event_id: eventRowId ?? null,
      p_amount_cents: event.amountCents,
    });

    const reason = asString(asRecord(outcome).reason);
    await markProcessed(service, eventRowId, reason);

    if (payment.booking_id) {
      revalidatePath(`/client/bookings/${payment.booking_id}`);
      revalidatePath(`/speaker/bookings/${payment.booking_id}`);
      revalidatePath("/speaker/earnings");
      revalidatePath("/admin/payments");
    }

    // 200 even for amount_mismatch or payment_not_found: retrying will never
    // change the outcome, and the RPC has parked the row for human review.
    return Response.json({ status: reason ?? "applied" }, { status: 200 });
  } catch (cause) {
    // A transient internal failure is the one case where Yoco's retries help,
    // so this is the only path that returns 500.
    log.error("failed to process event", { cause });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function markProcessed(
  service: ReturnType<typeof createServiceClient>,
  eventRowId: string | undefined,
  processingError: string | null
): Promise<void> {
  if (!eventRowId) return;

  await service
    .from("webhook_events")
    .update({
      processed_at: new Date().toISOString(),
      processing_error: processingError,
    })
    .eq("id", eventRowId);
}

export async function GET(): Promise<Response> {
  return Response.json({ error: "Method not allowed" }, { status: 405 });
}
