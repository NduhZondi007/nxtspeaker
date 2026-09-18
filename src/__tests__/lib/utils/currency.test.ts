import { describe, it, expect } from "vitest";
import { formatZAR, formatZARCents } from "@/lib/utils/currency";

describe("formatZAR", () => {
  it("formats a whole number with R prefix and thousand separator", () => {
    expect(formatZAR(85000)).toBe("R 85,000");
  });

  it("formats zero", () => {
    expect(formatZAR(0)).toBe("R 0");
  });

  it("formats a number below one thousand without separator", () => {
    expect(formatZAR(500)).toBe("R 500");
  });

  it("rounds down fractional amounts — no cents displayed", () => {
    expect(formatZAR(1500.99)).toBe("R 1,501");
  });

  it("formats large values correctly", () => {
    expect(formatZAR(1000000)).toBe("R 1,000,000");
  });
});

describe("formatZARCents", () => {
  it("renders exact cents for a ledger amount", () => {
    expect(formatZARCents(8_500_000)).toBe("R 85,000.00");
  });

  it("never drops a cent", () => {
    expect(formatZARCents(1)).toBe("R 0.01");
    expect(formatZARCents(99)).toBe("R 0.99");
    expect(formatZARCents(123_456)).toBe("R 1,234.56");
  });

  it("formats zero", () => {
    expect(formatZARCents(0)).toBe("R 0.00");
  });

  it("formats a reversal with the sign before the amount", () => {
    expect(formatZARCents(-123_456)).toBe("R -1,234.56");
  });

  // Postgres BIGINT can arrive as a string from PostgREST, exactly like NUMERIC.
  it("accepts a numeric string", () => {
    expect(formatZARCents("8500000")).toBe("R 85,000.00");
  });

  it("falls back to zero for absent or unusable values", () => {
    expect(formatZARCents(null)).toBe("R 0.00");
    expect(formatZARCents(undefined)).toBe("R 0.00");
    expect(formatZARCents(NaN)).toBe("R 0.00");
    expect(formatZARCents("abc")).toBe("R 0.00");
  });

  it("groups large amounts", () => {
    expect(formatZARCents(100_000_000_00)).toBe("R 100,000,000.00");
  });
});

// formatZAR is the fee-display formatter and deliberately rounds. Changing it
// would break the documented "R 85,000" contract and reintroduce the hydration
// mismatch its comment describes, so pin the distinction.
describe("formatZAR vs formatZARCents", () => {
  it("keeps formatZAR rounding to whole rand", () => {
    expect(formatZAR(1234.56)).toBe("R 1,235");
    expect(formatZARCents(123_456)).toBe("R 1,234.56");
  });
});
