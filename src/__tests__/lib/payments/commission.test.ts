import { describe, it, expect } from "vitest";
import {
  DEFAULT_COMMISSION_BPS,
  splitCommission,
  toCents,
} from "@/lib/payments/commission";

const R10_000 = 1_000_000; // cents

describe("DEFAULT_COMMISSION_BPS", () => {
  it("is 15.00% expressed in basis points", () => {
    expect(DEFAULT_COMMISSION_BPS).toBe(1500);
  });
});

describe("splitCommission", () => {
  it("takes 15% of a R10,000 booking", () => {
    const split = splitCommission(R10_000);

    expect(split.grossCents).toBe(1_000_000);
    expect(split.commissionCents).toBe(150_000);
    expect(split.speakerCents).toBe(850_000);
    expect(split.commissionRateBps).toBe(1500);
  });

  it("snapshots the rate that was applied", () => {
    expect(splitCommission(R10_000, 1000).commissionRateBps).toBe(1000);
  });

  // The whole point of deriving the speaker's share by subtraction rather than
  // by a second rounded multiplication: the two parts must reconstitute the
  // gross exactly, or the platform slowly leaks (or invents) cents.
  it("always reconstitutes the gross exactly", () => {
    for (let gross = 0; gross <= 5_000; gross += 1) {
      const { commissionCents, speakerCents } = splitCommission(gross);
      expect(commissionCents + speakerCents).toBe(gross);
    }
  });

  it("reconstitutes the gross exactly at arbitrary rates", () => {
    const rates = [0, 1, 250, 1500, 3333, 9999, 10_000];
    const amounts = [0, 1, 7, 99, 333, 12_345, 987_654_321];

    for (const rateBps of rates) {
      for (const gross of amounts) {
        const split = splitCommission(gross, rateBps);
        expect(split.commissionCents + split.speakerCents).toBe(gross);
        expect(split.commissionCents).toBeGreaterThanOrEqual(0);
        expect(split.speakerCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("rounds a half-cent commission to the nearest cent", () => {
    // 15% of 7c = 1.05c -> 1c
    expect(splitCommission(7)).toMatchObject({ commissionCents: 1, speakerCents: 6 });
    // 15% of 333c = 49.95c -> 50c
    expect(splitCommission(333)).toMatchObject({ commissionCents: 50, speakerCents: 283 });
  });

  it("handles a zero-value booking", () => {
    expect(splitCommission(0)).toMatchObject({ commissionCents: 0, speakerCents: 0 });
  });

  it("takes nothing at a 0% rate and everything at 100%", () => {
    expect(splitCommission(R10_000, 0)).toMatchObject({
      commissionCents: 0,
      speakerCents: 1_000_000,
    });
    expect(splitCommission(R10_000, 10_000)).toMatchObject({
      commissionCents: 1_000_000,
      speakerCents: 0,
    });
  });

  it("stays exact for amounts far beyond any realistic speaking fee", () => {
    const gross = 9_999_999_999; // ~R100m, still well inside Number.MAX_SAFE_INTEGER
    const split = splitCommission(gross);
    expect(split.commissionCents + split.speakerCents).toBe(gross);
  });

  it.each([-1, 1.5, NaN, Infinity, -Infinity])(
    "rejects %s as a gross amount",
    (gross) => {
      expect(() => splitCommission(gross)).toThrow(/gross/i);
    }
  );

  it.each([-1, 10_001, 1.5, NaN])("rejects %s as a rate", (rate) => {
    expect(() => splitCommission(R10_000, rate)).toThrow(/rate/i);
  });
});

describe("toCents", () => {
  it("converts a rand number to cents", () => {
    expect(toCents(85_000)).toBe(8_500_000);
  });

  // Postgres NUMERIC(12,2) arrives over PostgREST as a string.
  it("converts a numeric string to cents", () => {
    expect(toCents("85000.00")).toBe(8_500_000);
    expect(toCents("0.01")).toBe(1);
    expect(toCents("1000000")).toBe(100_000_000);
  });

  // 85000.55 * 100 is 8500054.999999999 in IEEE-754 — truncating would lose a cent.
  it("does not lose a cent to floating point", () => {
    expect(toCents(85_000.55)).toBe(8_500_055);
    expect(toCents("1234.35")).toBe(123_435);
    expect(toCents(0.29)).toBe(29);
  });

  it.each([null, undefined, "", "   ", "abc", NaN, Infinity, -1, "-1"])(
    "rejects %s",
    (value) => {
      expect(() => toCents(value as number)).toThrow(/amount/i);
    }
  );

  it("rejects fractions of a cent", () => {
    expect(() => toCents("1.005")).toThrow(/amount/i);
  });
});
