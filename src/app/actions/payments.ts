"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { DEFAULT_COMMISSION_BPS, splitCommission, toCents } from "@/lib/payments/commission";
import type { SpeakerPayoutDetailsFormData } from "@/lib/types/database";
import { createLogger } from "@/lib/logger";
import { toUserError } from "@/lib/errors";

const log = createLogger("payments");

const BookingIdSchema = z.string().uuid("Invalid booking");

type InitiatePaymentResult = { data: { redirectUrl: string } } | { error: string };

/**
 * Statuses that block opening a new checkout. NEEDS_REVIEW is here because it
 * usually means money DID arrive but did not reconcile (an amount mismatch);
 * a new checkout would let the client pay a second time.
 */
const BLOCKING_STATUSES = ["CREATED", "PENDING", "SUCCEEDED", "REFUNDED", "NEEDS_REVIEW"];

/**
 * A CREATED row normally lives for the length of one provider call. One older
 * than this, with no checkout attached, is the remains of a crashed attempt
 * and would otherwise hold the one-open-payment index forever.
 */
const DEAD_CREATED_AFTER_MS = 10 * 60_000;

const GENERIC_START_FAILURE = "Could not start this payment. Please try again.";

/**
 * Starts a Yoco checkout for a booking the speaker has accepted.
 *
 * The client never supplies an amount: the action takes only a booking id and
 * reads the fee from the database, exactly as createBooking reads the
 * speaker's fee server-side rather than trusting the form. CLAUDE.md states
 * the rule — "never trust quoted fees from the client".
 *
 * Returns `{ data: { redirectUrl } }` or `{ error }`, never throws.
 */
export async function initiateBookingPayment(bookingId: string): Promise<InitiatePaymentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsedId = BookingIdSchema.safeParse(bookingId);
  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Invalid booking" };
  }

  // Scoped to the caller: another client's booking is simply not found, which
  // leaks nothing a probe could use.
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, booking_number, client_id, status, quoted_fee_zar")
    .eq("id", parsedId.data)
    .eq("client_id", user.id)
    .maybeSingle();

  if (bookingError) {
    return { error: toUserError(bookingError, "Could not load this booking. Please try again.") };
  }
  if (!booking) return { error: "Booking not found" };

  // CONFIRMED means the speaker accepted and the client owes money. Anything
  // else is either too early, already paid, or over.
  if (booking.status !== "CONFIRMED") {
    return { error: "This booking is not awaiting payment" };
  }

  let grossCents: number;
  try {
    grossCents = toCents(booking.quoted_fee_zar);
  } catch {
    return { error: "This booking has no valid fee. Please contact support." };
  }

  if (grossCents <= 0) {
    return { error: "This booking has no fee to pay. Please contact support." };
  }

  const split = splitCommission(grossCents, DEFAULT_COMMISSION_BPS);

  // Writes to payments are service-role only — the table has read policies but
  // deliberately no write policies for any human role.
  const service = createServiceClient();

  const { data: existing, error: existingError } = await service
    .from("payments")
    .select("id, status, redirect_url, created_at")
    .eq("booking_id", booking.id)
    .in("status", BLOCKING_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: toUserError(existingError, GENERIC_START_FAILURE) };
  }

  if (existing?.status === "SUCCEEDED" || existing?.status === "REFUNDED") {
    return { error: "This booking has already been paid" };
  }

  if (existing?.status === "NEEDS_REVIEW") {
    return {
      error:
        "Your payment is being reviewed. NxtSpeaker will contact you shortly — please do not pay again.",
    };
  }

  // A checkout is already open. Resume it rather than opening a second one —
  // two live checkouts for one booking is how a booking gets paid twice.
  if (existing?.status === "PENDING" && existing.redirect_url) {
    return { data: { redirectUrl: existing.redirect_url as string } };
  }

  if (existing?.status === "CREATED" && !existing.redirect_url) {
    const ageMs = Date.now() - new Date(existing.created_at as string).getTime();

    if (!(ageMs > DEAD_CREATED_AFTER_MS)) {
      // Another tab is mid-way through opening a checkout.
      return { error: "This payment is already being set up. Give it a moment and try again." };
    }

    // Conditional on still being an empty CREATED row, so a row that moved on
    // since we read it is left alone.
    const { error: retireError } = await service
      .from("payments")
      .update({
        status: "FAILED",
        failed_at: new Date().toISOString(),
        failure_reason: "Abandoned before a checkout was opened",
      })
      .eq("id", existing.id)
      .eq("status", "CREATED")
      .is("redirect_url", null);

    if (retireError) return { error: toUserError(retireError, GENERIC_START_FAILURE) };
  }

  // Resolved BEFORE the row exists: a missing base URL used to throw after
  // the insert and strand a CREATED row that blocked every later attempt.
  let returnBase: string;
  try {
    returnBase = `${getBaseUrl()}/client/bookings/${booking.id}/payment`;
  } catch (cause) {
    log.error("could not resolve the return url", { cause });
    return { error: "Payments are temporarily unavailable. Please try again later." };
  }

  // The payment row's own identity is the idempotency key. Deriving it from
  // the booking would be wrong: after a genuinely failed payment the client
  // must retry, and reusing the key returns 409/422 from Yoco forever. The
  // "one open attempt per booking" guarantee comes from the partial unique
  // index instead, so both properties hold without conflicting.
  const paymentId = crypto.randomUUID();
  const idempotencyKey = `nxts_${paymentId}`;

  const { error: insertError } = await service.from("payments").insert({
    id: paymentId,
    booking_id: booking.id,
    provider: "yoco",
    idempotency_key: idempotencyKey,
    currency: "ZAR",
    gross_amount_cents: split.grossCents,
    commission_rate_bps: split.commissionRateBps,
    commission_amount_cents: split.commissionCents,
    speaker_amount_cents: split.speakerCents,
    status: "CREATED",
  });

  if (insertError) {
    // 23505 on payments_one_open_per_booking means another tab opened a
    // checkout a moment ago. Point the client at it rather than erroring.
    const { data: open, error: openError } = await service
      .from("payments")
      .select("redirect_url")
      .eq("booking_id", booking.id)
      .in("status", ["CREATED", "PENDING"])
      .maybeSingle();

    if (!openError && open?.redirect_url) {
      return { data: { redirectUrl: open.redirect_url as string } };
    }
    return { error: toUserError(openError ?? insertError, GENERIC_START_FAILURE) };
  }

  // From here on a row exists. Any failure must release it (FAILED), or the
  // partial unique index blocks the client from ever paying.
  try {
    let checkout: Awaited<ReturnType<ReturnType<typeof getPaymentProvider>["createCheckout"]>>;
    try {
      checkout = await getPaymentProvider().createCheckout({
        amountCents: split.grossCents,
        currency: "ZAR",
        successUrl: `${returnBase}?state=success`,
        cancelUrl: `${returnBase}?state=cancelled`,
        failureUrl: `${returnBase}?state=failed`,
        metadata: {
          booking_id: booking.id,
          payment_id: paymentId,
          booking_number: String(booking.booking_number ?? ""),
        },
        externalId: paymentId,
        idempotencyKey,
      });
    } catch (cause) {
      log.error("provider threw while creating a checkout", { cause });
      checkout = { error: "The payment provider is unavailable right now." };
    }

    if ("error" in checkout) {
      await markAttemptFailed(service, paymentId, checkout.error);
      return { error: checkout.error };
    }

    const { error: pendingError } = await service
      .from("payments")
      .update({
        status: "PENDING",
        provider_checkout_id: checkout.data.id,
        redirect_url: checkout.data.redirectUrl,
        processing_mode: checkout.data.processingMode,
      })
      .eq("id", paymentId);

    if (pendingError) throw pendingError;

    revalidatePath(`/client/bookings/${booking.id}`);

    return { data: { redirectUrl: checkout.data.redirectUrl } };
  } catch (cause) {
    log.error("payment attempt failed after its row was created", { cause, paymentId });
    await markAttemptFailed(service, paymentId, "Checkout could not be recorded");
    return { error: GENERIC_START_FAILURE };
  }
}

/** Releases an attempt's slot in the one-open-payment index. Never throws. */
async function markAttemptFailed(
  service: ReturnType<typeof createServiceClient>,
  paymentId: string,
  reason: string
): Promise<void> {
  try {
    const { error } = await service
      .from("payments")
      .update({ status: "FAILED", failed_at: new Date().toISOString(), failure_reason: reason })
      .eq("id", paymentId)
      .in("status", ["CREATED", "PENDING"]);

    if (error) log.error("could not mark a payment attempt failed", { paymentId, cause: error });
  } catch (cause) {
    log.error("could not mark a payment attempt failed", { paymentId, cause });
  }
}

const PayoutDetailsSchema = z.object({
  account_holder: z.string().trim().min(1, "Account holder name is required").max(120),
  bank_name: z.string().trim().min(1, "Bank is required").max(80),
  // Kept as a string: SA account numbers can carry leading zeros, which a
  // numeric type would silently eat.
  account_number: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/, "Account number must be 6–20 digits"),
  branch_code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Branch code must be 6 digits"),
  account_type: z.enum(["CHEQUE", "SAVINGS", "TRANSMISSION"]),
  tax_number: z.string().trim().max(20).optional().nullable(),
  is_vat_registered: z.boolean(),
});

/**
 * Saves the bank details NxtSpeaker pays a speaker into.
 *
 * These live on their own table with no client-readable policy — see the
 * migration for why they are not columns on speaker_profiles.
 */
export async function saveSpeakerPayoutDetails(input: SpeakerPayoutDetailsFormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: speakerProfile, error: profileError } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: toUserError(profileError, "Could not load your speaker profile. Please try again.") };
  }
  if (!speakerProfile) return { error: "Only speakers can set payout details" };

  const parsed = PayoutDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout details" };
  }

  const { data, error } = await supabase
    .from("speaker_payout_details")
    .upsert(
      {
        speaker_id: speakerProfile.id,
        ...parsed.data,
        tax_number: parsed.data.tax_number || null,
        // Any change re-opens verification — an admin confirmed the previous
        // account, not this one.
        verified_at: null,
        verified_by: null,
      },
      { onConflict: "speaker_id" }
    )
    .select(
      "speaker_id, account_holder, bank_name, account_number, branch_code, account_type, tax_number, is_vat_registered, verified_at"
    )
    .single();

  if (error) return { error: toUserError(error, "Could not save your payout details. Please try again.") };

  revalidatePath("/speaker/payouts");
  revalidatePath("/speaker/earnings");

  return { data };
}
