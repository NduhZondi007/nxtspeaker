/**
 * Status badge styles for the payment surfaces — one definition, previously
 * copied between speaker/earnings and admin/payouts.
 *
 * Tinted `bg/15` + `text` + `border/30` of the semantic token, per
 * docs/DESIGN.md → Financial surfaces → Status badges.
 */

import type { PaymentStatus, PayoutStatus } from "@/lib/types/database";
import { isInHoldWindow, type PayoutTiming } from "@/lib/payments/payouts";

export const PAYOUT_STYLES: Record<PayoutStatus, string> = {
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  DUE: "bg-primary/10 text-primary border border-primary/20",
  PAID: "bg-success/15 text-success border border-success/30",
  ON_HOLD: "bg-danger/15 text-danger border border-danger/30",
  CANCELLED: "bg-muted/15 text-muted border border-muted/30",
};

export const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  CREATED: "bg-muted/15 text-muted border border-muted/30",
  PENDING: "bg-secondary/15 text-secondary border border-secondary/30",
  SUCCEEDED: "bg-success/15 text-success border border-success/30",
  FAILED: "bg-danger/15 text-danger border border-danger/30",
  CANCELLED: "bg-muted/15 text-muted border border-muted/30",
  REFUNDED: "bg-primary/10 text-primary border border-primary/20",
  NEEDS_REVIEW: "bg-danger/15 text-danger border border-danger/30",
};

/** How a speaker sees each payout state. */
const SPEAKER_PAYOUT_LABELS: Record<PayoutStatus, string> = {
  PENDING: "In escrow",
  DUE: "Available",
  PAID: "Paid out",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

/**
 * The speaker-facing badge. A DUE payout still inside its hold window is NOT
 * "Available" — it shows as in escrow until it is released.
 */
export function speakerPayoutBadge(
  payout: PayoutTiming,
  nowMs: number
): { label: string; className: string } {
  if (isInHoldWindow(payout, nowMs)) {
    return { label: "In escrow", className: PAYOUT_STYLES.PENDING };
  }
  return { label: SPEAKER_PAYOUT_LABELS[payout.status], className: PAYOUT_STYLES[payout.status] };
}
