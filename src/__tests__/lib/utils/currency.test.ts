import { describe, it, expect } from "vitest";
import { formatZAR } from "@/lib/utils/currency";

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
