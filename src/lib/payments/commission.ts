/**
 * Platform commission arithmetic.
 *
 * Every amount here is an integer number of **cents**. Yoco's API speaks cents,
 * and `bookings.quoted_fee_zar` is a Postgres `NUMERIC(12,2)` that arrives over
 * PostgREST as a *string* — running that through float arithmetic is precisely
 * how a split ends up a cent short of the gross. Convert once at the boundary
 * with `toCents`, then stay in integers.
 *
 * This module is pure: no I/O, no Supabase, no environment. It is the single
 * definition of what NxtSpeaker earns on a booking.
 */

/** The platform's standard take: 15.00%, in basis points. */
export const DEFAULT_COMMISSION_BPS = 1500;

const BPS_DENOMINATOR = 10_000;

export interface CommissionSplit {
  /** Full amount the client pays, in cents. */
  grossCents: number;
  /** NxtSpeaker's share, in cents. */
  commissionCents: number;
  /** The speaker's share, in cents. */
  speakerCents: number;
  /**
   * The rate actually applied, in basis points. Snapshotted onto the payment
   * row so that changing the platform rate later never restates history.
   */
  commissionRateBps: number;
}

function assertWholeCents(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number of cents`);
  }
}

/**
 * Splits a gross booking amount into the platform's commission and the
 * speaker's payout.
 *
 * The speaker's share is derived by **subtraction**, never by a second rounded
 * multiplication. Rounding both halves independently lets them sum to one cent
 * more or less than the gross, which over enough bookings is money the platform
 * either invents or quietly eats. Subtraction makes
 * `commissionCents + speakerCents === grossCents` true for every input.
 */
export function splitCommission(
  grossCents: number,
  rateBps: number = DEFAULT_COMMISSION_BPS
): CommissionSplit {
  assertWholeCents(grossCents, "gross amount");

  if (
    typeof rateBps !== "number" ||
    !Number.isFinite(rateBps) ||
    !Number.isInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > BPS_DENOMINATOR
  ) {
    throw new Error("Commission rate must be a whole number of basis points between 0 and 10000");
  }

  const commissionCents = Math.round((grossCents * rateBps) / BPS_DENOMINATOR);

  return {
    grossCents,
    commissionCents,
    speakerCents: grossCents - commissionCents,
    commissionRateBps: rateBps,
  };
}

/**
 * Converts a rand amount — a number, or the string Postgres `NUMERIC` gives us —
 * into whole cents.
 *
 * Rounds rather than truncates: `85000.55 * 100` is `8500054.999999999` in
 * IEEE-754, and truncating that loses a cent on a perfectly ordinary fee.
 * Amounts with sub-cent precision are rejected rather than silently rounded,
 * because a fee that precise means something upstream is wrong.
 */
export function toCents(amount: number | string): number {
  if (amount === null || amount === undefined) {
    throw new Error("Amount is required");
  }

  const value = typeof amount === "string" ? Number(amount.trim()) : amount;

  if (typeof amount === "string" && amount.trim() === "") {
    throw new Error("Amount is required");
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Amount must be a non-negative finite number, received: ${String(amount)}`);
  }

  const cents = value * 100;
  const rounded = Math.round(cents);

  // Anything further than a floating-point whisker from a whole cent was
  // genuinely sub-cent in the source data, not a representation artefact.
  if (Math.abs(cents - rounded) > 1e-6) {
    throw new Error(`Amount cannot be more precise than one cent, received: ${String(amount)}`);
  }

  return rounded;
}

/** Inverse of `toCents`, for the rare case a rand figure is needed. */
export function centsToRand(cents: number): number {
  assertWholeCents(cents, "amount");
  return cents / 100;
}
