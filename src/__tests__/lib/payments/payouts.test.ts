import { describe, it, expect } from "vitest";
import {
  isPayoutPayable,
  isInHoldWindow,
  summariseSpeakerPayouts,
} from "@/lib/payments/payouts";

const NOW = Date.parse("2026-10-05T12:00:00Z");
const PAST = "2026-10-01T00:00:00Z";
const FUTURE = "2026-10-10T00:00:00Z";

describe("isPayoutPayable", () => {
  it("is true for a DUE payout whose hold window has passed", () => {
    expect(isPayoutPayable({ status: "DUE", available_at: PAST }, NOW)).toBe(true);
  });

  it("is false for a DUE payout still inside its hold window", () => {
    expect(isPayoutPayable({ status: "DUE", available_at: FUTURE }, NOW)).toBe(false);
  });

  // markPayoutPaid requires available_at <= now; a DUE row without a date
  // cannot be paid, so it must not be offered as payable.
  it("is false for a DUE payout with no release date", () => {
    expect(isPayoutPayable({ status: "DUE", available_at: null }, NOW)).toBe(false);
  });

  it.each(["PENDING", "PAID", "ON_HOLD", "CANCELLED"] as const)("is false for %s", (status) => {
    expect(isPayoutPayable({ status, available_at: PAST }, NOW)).toBe(false);
  });
});

describe("isInHoldWindow", () => {
  it("is true for a DUE payout not yet released", () => {
    expect(isInHoldWindow({ status: "DUE", available_at: FUTURE }, NOW)).toBe(true);
  });

  it("is false once released", () => {
    expect(isInHoldWindow({ status: "DUE", available_at: PAST }, NOW)).toBe(false);
  });
});

describe("summariseSpeakerPayouts", () => {
  const payouts = [
    { status: "PAID" as const, available_at: PAST, amount_cents: 100 },
    { status: "DUE" as const, available_at: PAST, amount_cents: 200 },
    { status: "DUE" as const, available_at: FUTURE, amount_cents: 400 },
    { status: "PENDING" as const, available_at: null, amount_cents: 800 },
    { status: "ON_HOLD" as const, available_at: PAST, amount_cents: 1600 },
    { status: "CANCELLED" as const, available_at: null, amount_cents: 3200 },
  ];

  it("counts only released DUE payouts as available", () => {
    expect(summariseSpeakerPayouts(payouts, NOW).available).toBe(200);
  });

  it("counts DUE payouts inside the hold window as still in escrow", () => {
    expect(summariseSpeakerPayouts(payouts, NOW).inEscrow).toBe(400 + 800);
  });

  it("totals paid and on-hold separately and ignores cancelled", () => {
    const summary = summariseSpeakerPayouts(payouts, NOW);
    expect(summary.paidOut).toBe(100);
    expect(summary.onHold).toBe(1600);
  });

  // bigint columns can arrive over PostgREST as strings.
  it("accepts string amounts", () => {
    const summary = summariseSpeakerPayouts(
      [{ status: "PAID", available_at: PAST, amount_cents: "250" }],
      NOW
    );
    expect(summary.paidOut).toBe(250);
  });
});
