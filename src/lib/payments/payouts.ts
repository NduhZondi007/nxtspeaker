/**
 * Pure payout classification, shared by the admin queue and the speaker's
 * earnings page so both agree on what "available" means.
 *
 * A DUE payout is only payable once its hold window (available_at) has
 * passed. markPayoutPaid enforces the same rule in its conditional UPDATE, so
 * anything these helpers call payable is something an admin can actually pay.
 */

import type { PayoutStatus } from "@/lib/types/database";

export interface PayoutTiming {
  status: PayoutStatus;
  available_at: string | null;
}

export interface PayoutAmount extends PayoutTiming {
  /** bigint over PostgREST may arrive as a string. */
  amount_cents: number | string;
}

export interface SpeakerPayoutSummary {
  paidOut: number;
  /** DUE and past the hold window — what the speaker will be paid next. */
  available: number;
  /** Not yet releasable: PENDING, or DUE but still inside the hold window. */
  inEscrow: number;
  onHold: number;
}

export function isPayoutPayable(payout: PayoutTiming, nowMs: number): boolean {
  if (payout.status !== "DUE" || !payout.available_at) return false;
  return new Date(payout.available_at).getTime() <= nowMs;
}

export function isInHoldWindow(payout: PayoutTiming, nowMs: number): boolean {
  return payout.status === "DUE" && !isPayoutPayable(payout, nowMs);
}

export function summariseSpeakerPayouts(
  payouts: PayoutAmount[],
  nowMs: number
): SpeakerPayoutSummary {
  const summary: SpeakerPayoutSummary = { paidOut: 0, available: 0, inEscrow: 0, onHold: 0 };

  for (const payout of payouts) {
    const cents = Number(payout.amount_cents);
    if (payout.status === "PAID") summary.paidOut += cents;
    else if (payout.status === "ON_HOLD") summary.onHold += cents;
    else if (isPayoutPayable(payout, nowMs)) summary.available += cents;
    else if (payout.status === "PENDING" || payout.status === "DUE") summary.inEscrow += cents;
  }

  return summary;
}
