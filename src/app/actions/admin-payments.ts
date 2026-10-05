"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { getPaymentProvider } from "@/lib/payments";
import { createLogger } from "@/lib/logger";

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

/**
 * Records a payout that an admin has already paid by EFT.
 *
 * This moves no money. Yoco settles only to NxtSpeaker's own bank account and
 * exposes no transfer API, so the actual payment happens in the business's
 * banking app and this action records that it happened.
 */
export async function markPayoutPaid(payoutId: string, eftReference: string, notes?: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  const parsed = MarkPaidSchema.safeParse({ payoutId, eftReference, notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid payout details" };
  }

  const service = createServiceClient();

  const { data: payout } = await service
    .from("payouts")
    .select("id, status")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();

  if (!payout) return { error: "Payout not found" };
  if (payout.status === "PAID") return { error: "This payout is already marked as paid" };
  if (payout.status === "CANCELLED") return { error: "A cancelled payout cannot be paid" };

  const { data, error } = await service
    .from("payouts")
    .update({
      status: "PAID",
      eft_reference: parsed.data.eftReference,
      notes: parsed.data.notes || null,
      marked_paid_by: user.id,
      marked_paid_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.payoutId)
    .select()
    .single();

  if (error) return { error: error.message };

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

  const { data: payout } = await service
    .from("payouts")
    .select("id, status")
    .eq("id", parsed.data.payoutId)
    .maybeSingle();

  if (!payout) return { error: "Payout not found" };
  if (payout.status === "PAID") return { error: "A paid payout cannot be put on hold" };

  const { data, error } = await service
    .from("payouts")
    .update({ status: "ON_HOLD", notes: parsed.data.reason })
    .eq("id", parsed.data.payoutId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/payouts");
  revalidatePath("/speaker/earnings");

  return { data };
}

const RefundSchema = z.object({
  paymentId: UuidSchema,
  reason: z.string().trim().min(1, "A reason is required").max(1000),
});

/**
 * Refunds a payment in full and closes the corresponding payout obligation.
 *
 * Full refunds only, which is the platform's stated policy — the provider's
 * amount field is omitted rather than passed. A `pending` refund is recorded
 * as such and left for the webhook to resolve; it is never assumed successful.
 */
export async function adminRefundPayment(paymentId: string, reason: string) {
  const { error: authError, user } = await assertAdmin();
  if (authError) return { error: authError };

  const parsed = RefundSchema.safeParse({ paymentId, reason });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }

  const service = createServiceClient();

  const { data: payment } = await service
    .from("payments")
    .select("id, booking_id, status, provider_checkout_id, gross_amount_cents")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();

  if (!payment) return { error: "Payment not found" };
  if (payment.status === "REFUNDED") return { error: "This payment has already been refunded" };
  if (payment.status !== "SUCCEEDED") {
    return { error: "Only a captured payment can be refunded" };
  }
  if (!payment.provider_checkout_id) {
    return { error: "This payment has no provider reference and cannot be refunded automatically" };
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

  if (updateError) return { error: updateError.message };

  if (succeeded) {
    // The platform no longer owes the speaker anything for this booking.
    await service
      .from("payouts")
      .update({ status: "CANCELLED", notes: parsed.data.reason })
      .eq("payment_id", payment.id);

    await service
      .from("bookings")
      .update({ status: "CANCELLED", cancelled_reason: parsed.data.reason })
      .eq("id", payment.booking_id);
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/payouts");
  revalidatePath(`/admin/bookings/${payment.booking_id}`);
  revalidatePath("/speaker/earnings");

  return { data: { status: refund.data.status } };
}
