import { describe, it, expect, vi } from "vitest";
import { toUserError } from "@/lib/errors";

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}));

describe("toUserError", () => {
  it("never returns the raw database message", () => {
    const raw = { code: "XX000", message: 'relation "public.secret_table" does not exist' };
    expect(toUserError(raw, "Could not save")).toBe("Could not save");
  });

  it("maps a unique violation to a duplicate message", () => {
    expect(toUserError({ code: "23505", message: "duplicate key value violates unique constraint \"x\"" }, "Could not save"))
      .toBe("That already exists.");
  });

  it("maps RLS / privilege errors to a permission message", () => {
    expect(toUserError({ code: "42501", message: "new row violates row-level security policy" }, "Could not save"))
      .toBe("You don't have permission to do that.");
  });

  it("maps a check violation to an invalid-change message", () => {
    expect(toUserError({ code: "23514", message: "Invalid booking status transition" }, "Could not save"))
      .toBe("That change isn't allowed.");
  });

  it("uses the fallback for non-database errors", () => {
    expect(toUserError(new Error("socket hang up"), "Could not save")).toBe("Could not save");
  });
});
