import { describe, it, expect } from "vitest";
import {
  BOOKING_STATUSES,
  adminTransitionsFrom,
  canAdminTransition,
  canMarkDelivered,
  formatDateSAST,
  formatTimeSAST,
  todayInSAST,
  addDaysISO,
  validateBookingDates,
} from "@/lib/utils/booking";

describe("todayInSAST", () => {
  it("returns the Johannesburg calendar date, not the UTC one", () => {
    // 23:30 UTC on 4 Oct is already 01:30 on 5 Oct in SAST (UTC+2).
    expect(todayInSAST(new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-05");
  });

  it("matches UTC when both zones are on the same day", () => {
    expect(todayInSAST(new Date("2026-10-05T10:00:00Z"))).toBe("2026-10-05");
  });
});

describe("addDaysISO", () => {
  it("adds calendar days to a YYYY-MM-DD string", () => {
    expect(addDaysISO("2026-10-05", 1)).toBe("2026-10-06");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("validateBookingDates default 'today'", () => {
  it("is computed in SAST so a late-evening UTC clock cannot accept 'today'", () => {
    const today = todayInSAST();
    expect(validateBookingDates(today)).toBe("Event date must be in the future");
  });
});

describe("canAdminTransition", () => {
  it("never moves a booking to PAID — only the verified webhook does that", () => {
    for (const from of BOOKING_STATUSES) {
      expect(canAdminTransition(from, "PAID")).toBe(false);
    }
  });

  it("does not cancel a PAID booking — that is a refund", () => {
    expect(canAdminTransition("PAID", "CANCELLED")).toBe(false);
  });

  it("does not complete an unpaid booking", () => {
    expect(canAdminTransition("CONFIRMED", "COMPLETED")).toBe(false);
    expect(canAdminTransition("PENDING", "COMPLETED")).toBe(false);
  });

  it("completes a paid booking, and a legacy DEPOSIT_PAID one", () => {
    expect(canAdminTransition("PAID", "COMPLETED")).toBe(true);
    expect(canAdminTransition("DEPOSIT_PAID", "COMPLETED")).toBe(true);
  });

  it("confirms or cancels a pending request, and cancels an unpaid confirmed one", () => {
    expect(canAdminTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canAdminTransition("PENDING", "CANCELLED")).toBe(true);
    expect(canAdminTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("never moves a booking out of a terminal state", () => {
    for (const terminal of ["COMPLETED", "CANCELLED", "DECLINED"] as const) {
      expect(adminTransitionsFrom(terminal)).toEqual([]);
    }
  });
});

describe("canMarkDelivered", () => {
  it("is offered for a PAID booking on or after the event date", () => {
    expect(canMarkDelivered("PAID", "2026-10-05", "2026-10-05")).toBe(true);
    expect(canMarkDelivered("PAID", "2026-10-01", "2026-10-05")).toBe(true);
  });

  it("is not offered before the event has happened", () => {
    expect(canMarkDelivered("PAID", "2026-10-06", "2026-10-05")).toBe(false);
  });

  it("is not offered for an unpaid or already finished booking", () => {
    expect(canMarkDelivered("CONFIRMED", "2026-10-01", "2026-10-05")).toBe(false);
    expect(canMarkDelivered("COMPLETED", "2026-10-01", "2026-10-05")).toBe(false);
  });
});

describe("formatDateSAST / formatTimeSAST", () => {
  it("formats a timestamp in Johannesburg time with a 24-hour clock", () => {
    // 22:05 UTC is 00:05 the next day in SAST.
    expect(formatTimeSAST("2026-10-04T22:05:00Z")).toBe("00:05");
  });

  it("formats a calendar date without drifting a day", () => {
    expect(formatDateSAST("2026-10-05", { year: "numeric", month: "2-digit", day: "2-digit" })).toMatch(
      /2026.10.05|05.10.2026/
    );
  });
});
