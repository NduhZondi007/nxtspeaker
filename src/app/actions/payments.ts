"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/env";
import { getPaymentProvider } from "@/lib/payments";
import { DEFAULT_COMMISSION_BPS, splitCommission, toCents } from "@/lib/payments/commission";
import type { SpeakerPayoutDetailsFormData } from "@/lib/types/database";

const BookingIdSchema = z.string().uuid("Invalid booking");

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
export async function initiateBookingPayment(bookingId: string) {
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
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, booking_number, client_id, status, quoted_fee_zar")
    .eq("id", parsedId.data)
    .eq("client_id", user.id)
    .maybeSingle();

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

  const { data: existing } = await service
    .from("payments")
    .select("id, status, redirect_url")
    .eq("booking_id", booking.id)
    .in("status", ["CREATED", "PENDING", "SUCCEEDED", "REFUNDED"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.status === "SUCCEEDED" || existing?.status === "REFUNDED") {
    return { error: "This booking has already been paid" };
  }

  // A checkout is already open. Resume it rather than opening a second one —
  // two live checkouts for one booking is how a booking gets paid twice.
  if (existing?.status === "PENDING" && existing.redirect_url) {
    return { data: { redirectUrl: existing.redirect_url as string } };
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
    const { data: open } = await service
      .from("payments")
      .select("redirect_url")
      .eq("booking_id", booking.id)
      .in("status", ["CREATED", "PENDING"])
      .maybeSingle();

    if (open?.redirect_url) {
      return { data: { redirectUrl: open.redirect_url as string } };
    }
    return { error: "Could not start this payment. Please try again." };
  }

  const returnBase = `${getBaseUrl()}/client/bookings/${booking.id}/payment`;

  let checkout;
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
    console.error("[payments] provider threw while creating a checkout", cause);
    checkout = { error: "The payment provider is unavailable right now." };
  }

  if ("error" in checkout) {
    // Free the partial unique index so the client can retry.
    await service
      .from("payments")
      .update({
        status: "FAILED",
        failed_at: new Date().toISOString(),
        failure_reason: checkout.error,
      })
      .eq("id", paymentId);

    return { error: checkout.error };
  }

  await service
    .from("payments")
    .update({
      status: "PENDING",
      provider_checkout_id: checkout.data.id,
      redirect_url: checkout.data.redirectUrl,
      processing_mode: checkout.data.processingMode,
    })
    .eq("id", paymentId);

  revalidatePath(`/client/bookings/${booking.id}`);

  return { data: { redirectUrl: checkout.data.redirectUrl } };
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

  const { data: speakerProfile } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

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
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/speaker/payouts");
  revalidatePath("/speaker/earnings");

  return { data };
}
