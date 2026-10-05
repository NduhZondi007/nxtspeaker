"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getPaymentProvider } from "@/lib/payments";
import { createLogger } from "@/lib/logger";
import { toUserError } from "@/lib/errors";

const log = createLogger("admin-payments");

/**
 * Admin-only money operations.
 *
 * Two of these — marking a payout paid and approving a refund — are the points
 * at which real money has moved or is about to. Both are gated by assertAdmin
 * and both write an audit trail the database itself insists on.
 */

const UuidSchema = z.string().uuid("Invalid identifier");

const MarkPaidSchema = z.object({
  payoutId: UuidSchema,
  // The database CHECK constraint refuses a PAID payout without a reference.
  // Validating here too gives the admin a usable message instead of a
  // constraint violation.
  eftReference: z
    .string()
    .trim()
    .min(1, "An EFT reference is required")
    .max(140, "EFT reference is too long"),
  notes: z.string().trim().max(1000).optional(),
});

const PAYOUT_CONFLICT = "This payout changed — refresh and try again.";

const PAYOUT_RETURNING =
  "id, status, amount_cents, eft_reference, notes, marked_paid_by, marked_paid_at, available_at";

const BANK_SNAPSHOT_COLUMNS =
  "speaker_id, account_holder, bank_name, account_number, branch_code, account_type, tax_number, is_vat_registered, verified_at, verified_by, created_at, updated_at";

/**
 * Records a payout that an admin has already paid by EFT.
 *
 * This moves no money. Yoco settles only to NxtSpeaker's own bank account and
 * exposes no transfer API, so the actual payment happens in the business's
 * banking app and this action records that it happened.
 *
 * The read below exists only to give a specific message. What actually
 * guards the write is the conditional UPDATE: it matches only a payout that is
 * still DUE and past its hold window, so two admins recording the same payout
 * cannot both succeed — the second sees 0 rows and is told to refresh.
 */
export async function markPayoutPaid(payoutId: string, eftReference: string, notes?: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  const parsed = MarkPaidSchema.safeParse({ payoutId, eftReference, notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout details" };
  }

  const service = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: payout, error: readError } = await service
    .from("payouts")
    .select("id, status, speaker_id, available_at, bank_snapshot")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();

  if (readError) return { error: toUserError(readError, "Could not load this payout.") };
  if (!payout) return { error: "Payout not found" };
  if (payout.status === "PAID") return { error: "This payout is already marked as paid" };
  if (payout.status === "CANCELLED") return { error: "A cancelled payout cannot be paid" };
  if (payout.status !== "DUE") {
    return { error: "This payout is not due yet — the event must be completed first" };
  }
  if (!payout.available_at || new Date(payout.available_at as string).getTime() > Date.now()) {
    return { error: "This payout is still inside its hold window and cannot be paid yet" };
  }

  // A payout created before the speaker added bank details has no snapshot
  // and was previously unpayable forever. Freeze the CURRENT details onto it
  // now, in the same conditional update that marks it paid.
  let snapshot: Record<string, unknown> | null = null;
  if (!payout.bank_snapshot) {
    const { data: details, error: detailsError } = await service
      .from("speaker_payout_details")
      .select(BANK_SNAPSHOT_COLUMNS)
      .eq("speaker_id", payout.speaker_id)
      .maybeSingle();

    if (detailsError) {
      return { error: toUserError(detailsError, "Could not load the speaker's bank details.") };
    }
    if (!details) {
      return {
        error: "This speaker has no bank details on file. They must add them before they can be paid.",
      };
    }
    snapshot = details as Record<string, unknown>;
  }

  let update = service
    .from("payouts")
    .update({
      status: "PAID",
      eft_reference: parsed.data.eftReference,
      notes: parsed.data.notes || null,
      marked_paid_by: user.id,
      marked_paid_at: nowIso,
      ...(snapshot ? { bank_snapshot: snapshot } : {}),
    })
    .eq("id", parsed.data.payoutId)
    .eq("status", "DUE")
    .lte("available_at", nowIso);

  if (snapshot) update = update.is("bank_snapshot", null);

  const { data, error } = await update.select(PAYOUT_RETURNING).maybeSingle();

  if (error) return { error: toUserError(error, "Could not record this payout.") };
  if (!data) return { error: PAYOUT_CONFLICT };

  revalidatePath("/admin/payouts");
  revalidatePath("/speaker/earnings");

  return { data };
}

const HoldSchema = z.object({
  payoutId: UuidSchema,
  reason: z.string().trim().min(1, "A reason is required").max(1000),
});

/** Freezes a payout — a dispute, a no-show, or unverified bank details. */
export async function holdPayout(payoutId: string, reason: string) {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };

  const parsed = HoldSchema.safeParse({ payoutId, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const service = createServiceClient();

  const { data: payout, error: readError } = await service
    .from("payouts")
    .select("id, status")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();

  if (readError) return { error: toUserError(readError, "Could not load this payout.") };
  if (!payout) return { error: "Payout not found" };
  if (payout.status === "PAID") return { error: "A paid payout cannot be put on hold" };
  if (payout.status === "ON_HOLD") return { error: "This payout is already on hold" };
  if (payout.status === "CANCELLED") return { error: "A cancelled payout cannot be put on hold" };

  // Conditional: a payout paid between the read and this write is not held.
  const { data, error } = await service
    .from("payouts")
    .update({ status: "ON_HOLD", notes: parsed.data.reason })
    .eq("id", parsed.data.payoutId)
    .in("status", ["PENDING", "DUE"])
    .select(PAYOUT_RETURNING)
    .maybeSingle();

  if (error) return { error: toUserError(error, "Could not put this payout on hold.") };
  if (!data) return { error: PAYOUT_CONFLICT };

  revalidatePath("/admin/payouts");
  revalidatePath("/speaker/earnings");

  return { data };
}

const RefundSchema = z.object({
  paymentId: UuidSchema,
  reason: z.string().trim().min(1, "A reason is required").max(1000),
});

/** Payout statuses a refund may still close. PAID is deliberately absent. */
const REFUNDABLE_PAYOUT_STATUSES = ["PENDING", "DUE", "ON_HOLD"];

/**
 * Refunds a payment in full and closes the corresponding payout obligation.
 *
 * Full refunds only, which is the platform's stated policy — the provider's
 * amount field is omitted rather than passed. A `pending` refund is recorded
 * as such and its payout is put ON_HOLD, so the speaker cannot be paid while
 * the client's money may be on its way back; the webhook resolves it.
 *
 * Refused outright once the speaker has been paid: refunding then would mean
 * the platform pays the fee twice, which a human has to untangle first.
 */
export async function adminRefundPayment(paymentId: string, reason: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  const parsed = RefundSchema.safeParse({ paymentId, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const service = createServiceClient();

  const { data: payment, error: paymentError } = await service
    .from("payments")
    .select("id, booking_id, status, provider_checkout_id, gross_amount_cents")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();

  if (paymentError) return { error: toUserError(paymentError, "Could not load this payment.") };
  if (!payment) return { error: "Payment not found" };
  if (payment.status === "REFUNDED") return { error: "This payment has already been refunded" };
  if (payment.status !== "SUCCEEDED") {
    return { error: "Only a captured payment can be refunded" };
  }
  if (!payment.provider_checkout_id) {
    return { error: "This payment has no provider reference and cannot be refunded automatically" };
  }

  const { data: payout, error: payoutError } = await service
    .from("payouts")
    .select("id, status")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (payoutError) return { error: toUserError(payoutError, "Could not load this payment's payout.") };
  if (payout?.status === "PAID") {
    return {
      error:
        "The speaker has already been paid for this booking, so it cannot be refunded here. Recover the payout from the speaker first, then refund the client manually.",
    };
  }

  let refund;
  try {
    refund = await getPaymentProvider().refundCheckout(
      payment.provider_checkout_id as string,
      `nxts_refund_${payment.id}`
    );
  } catch (cause) {
    log.error("provider threw while refunding", { cause });
    return { error: "The payment provider is unavailable right now." };
  }

  // Nothing is written if the provider refused — the money has not moved.
  if ("error" in refund) return { error: refund.error };

  const succeeded = refund.data.status === "succeeded";

  // From here the provider has accepted the refund. Every failure below is
  // logged loudly: money has moved and the ledger must be made to match.
  const recorded = (message: string, cause?: unknown) => {
    log.error("refund accepted by provider but not fully recorded", {
      paymentId: payment.id,
      refundStatus: refund.data.status,
      step: message,
      cause,
    });
    return {
      error: `The refund was sent to Yoco, but ${message}. Refresh and check this payment before retrying.`,
    };
  };

  const { error: updateError } = await service
    .from("payments")
    .update({
      status: succeeded ? "REFUNDED" : "SUCCEEDED",
      refunded_amount_cents: succeeded ? payment.gross_amount_cents : 0,
      refunded_at: succeeded ? new Date().toISOString() : null,
      failure_reason: succeeded
        ? `Refunded by admin ${user.id}: ${parsed.data.reason}`
        : `Refund pending at provider: ${parsed.data.reason}`,
    })
    .eq("id", payment.id);

  if (updateError) return recorded("the payment record could not be updated", updateError);

  if (payout) {
    // Succeeded: nothing is owed any more. Pending: freeze it, so the
    // speaker is not paid while the client's money may be going back.
    const { data: closed, error: closeError } = await service
      .from("payouts")
      .update(
        succeeded
          ? { status: "CANCELLED", notes: parsed.data.reason }
          : { status: "ON_HOLD", notes: `Refund pending at provider: ${parsed.data.reason}` }
      )
      .eq("id", payout.id)
      .in("status", REFUNDABLE_PAYOUT_STATUSES)
      .select("id")
      .maybeSingle();

    if (closeError) return recorded("the speaker's payout could not be updated", closeError);
    if (!closed) return recorded("the speaker's payout changed in the meantime");
  }

  if (succeeded) {
    const { error: bookingError } = await service
      .from("bookings")
      .update({ status: "CANCELLED", cancelled_reason: parsed.data.reason })
      .eq("id", payment.booking_id);

    if (bookingError) return recorded("the booking could not be cancelled", bookingError);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/bookings/${payment.booking_id}`);
  revalidatePath("/speaker/earnings");

  return { data: { status: refund.data.status } };
}
