import { describe, it, expect } from "vitest";
import { parseAdminMoneyTotals } from "@/lib/payments/admin-totals";

const ROW = {
  collected: 1000,
  commission: 150,
  owed: 850,
  refunded: 0,
  payouts_open: 850,
  payouts_paid: 0,
};

describe("parseAdminMoneyTotals", () => {
  it("reads a single-row table result", () => {
    expect(parseAdminMoneyTotals([ROW])).toEqual(ROW);
  });

  it("reads a bare object result", () => {
    expect(parseAdminMoneyTotals(ROW)).toEqual(ROW);
  });

  // Postgres bigint is serialised as a string by PostgREST.
  it("converts bigint strings to numbers", () => {
    const parsed = parseAdminMoneyTotals([{ ...ROW, collected: "123456789" }]);
    expect(parsed?.collected).toBe(123_456_789);
  });

  it("returns null for a missing row rather than inventing zeros", () => {
    expect(parseAdminMoneyTotals([])).toBeNull();
    expect(parseAdminMoneyTotals(null)).toBeNull();
  });

  it("returns null when a figure is not a number", () => {
    expect(parseAdminMoneyTotals([{ ...ROW, owed: "abc" }])).toBeNull();
    expect(parseAdminMoneyTotals([{ ...ROW, owed: undefined }])).toBeNull();
  });
});
