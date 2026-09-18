import { describe, it, expect } from "vitest";
import { maskAccountNumber } from "@/lib/utils/banking";

describe("maskAccountNumber", () => {
  it("shows only the last four digits", () => {
    expect(maskAccountNumber("1234567890")).toBe("•••• 7890");
  });

  it("strips formatting before masking", () => {
    expect(maskAccountNumber("1234 5678 90")).toBe("•••• 7890");
    expect(maskAccountNumber("1234-5678-90")).toBe("•••• 7890");
  });

  // Revealing "most of" a short number is worse than revealing none of it.
  it.each(["1234", "123", "1", ""])("hides a number too short to mask: %s", (value) => {
    expect(maskAccountNumber(value)).toBe("••••");
  });

  it("handles absent values", () => {
    expect(maskAccountNumber(null)).toBe("••••");
    expect(maskAccountNumber(undefined)).toBe("••••");
  });

  it("never returns the full number", () => {
    const account = "62841739205";
    expect(maskAccountNumber(account)).not.toContain("6284173");
  });
});
