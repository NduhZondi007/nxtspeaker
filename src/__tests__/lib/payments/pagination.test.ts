import { describe, it, expect } from "vitest";
import { parsePage, pageRange, PAGE_SIZE } from "@/lib/payments/pagination";

describe("parsePage", () => {
  it("defaults to page 1", () => {
    expect(parsePage(undefined)).toBe(1);
  });

  it.each(["0", "-3", "abc", "1.5", ""])("falls back to 1 for %s", (raw) => {
    expect(parsePage(raw)).toBe(1);
  });

  it("reads a positive integer", () => {
    expect(parsePage("4")).toBe(4);
  });

  it("uses the first value of a repeated parameter", () => {
    expect(parsePage(["3", "9"])).toBe(3);
  });

  it("caps absurd pages", () => {
    expect(parsePage("99999999")).toBe(10_000);
  });
});

describe("pageRange", () => {
  // One extra row is requested so the page can tell whether a next page exists
  // without a separate count query.
  it("returns an inclusive range one row longer than a page", () => {
    expect(pageRange(1)).toEqual({ from: 0, to: PAGE_SIZE });
    expect(pageRange(3)).toEqual({ from: 2 * PAGE_SIZE, to: 3 * PAGE_SIZE });
  });
});
