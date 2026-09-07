import { describe, it, expect } from "vitest";
import {
  BOOKING_STATUSES,
  canClientCancel,
  canSpeakerTransition,
  isBookingStatus,
  validateBookingDates,
} from "@/lib/utils/booking";

describe("isBookingStatus", () => {
  it("accepts every status the DB CHECK constraint allows", () => {
    for (const status of BOOKING_STATUSES) {
      expect(isBookingStatus(status)).toBe(true);
    }
  });

  it("rejects arbitrary strings supplied by a client", () => {
    expect(isBookingStatus("ADMIN")).toBe(false);
    expect(isBookingStatus("completed")).toBe(false);
    expect(isBookingStatus("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isBookingStatus(null)).toBe(false);
    expect(isBookingStatus(undefined)).toBe(false);
    expect(isBookingStatus(3)).toBe(false);
    expect(isBookingStatus({ status: "PENDING" })).toBe(false);
  });
});

describe("canSpeakerTransition", () => {
  it("lets a speaker accept or decline a pending request", () => {
    expect(canSpeakerTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canSpeakerTransition("PENDING", "DECLINED")).toBe(true);
  });

  it("lets a speaker record a deposit and complete a confirmed booking", () => {
    expect(canSpeakerTransition("CONFIRMED", "DEPOSIT_PAID")).toBe(true);
    expect(canSpeakerTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canSpeakerTransition("DEPOSIT_PAID", "COMPLETED")).toBe(true);
  });

  it("does not let a speaker cancel — that is the client's action", () => {
    expect(canSpeakerTransition("PENDING", "CANCELLED")).toBe(false);
    expect(canSpeakerTransition("CONFIRMED", "CANCELLED")).toBe(false);
  });

  it("does not let a speaker skip straight from pending to completed", () => {
    expect(canSpeakerTransition("PENDING", "COMPLETED")).toBe(false);
    expect(canSpeakerTransition("PENDING", "DEPOSIT_PAID")).toBe(false);
  });

  it("does not let a speaker move a booking backwards", () => {
    expect(canSpeakerTransition("CONFIRMED", "PENDING")).toBe(false);
    expect(canSpeakerTransition("COMPLETED", "CONFIRMED")).toBe(false);
  });

  it("treats declined, cancelled and completed as terminal", () => {
    for (const terminal of ["COMPLETED", "CANCELLED", "DECLINED"] as const) {
      for (const target of BOOKING_STATUSES) {
        expect(canSpeakerTransition(terminal, target)).toBe(false);
      }
    }
  });
});

describe("canClientCancel", () => {
  it("allows cancelling a live booking", () => {
    expect(canClientCancel("PENDING")).toBe(true);
    expect(canClientCancel("CONFIRMED")).toBe(true);
    expect(canClientCancel("DEPOSIT_PAID")).toBe(true);
  });

  it("refuses to cancel a booking that already ended", () => {
    expect(canClientCancel("COMPLETED")).toBe(false);
    expect(canClientCancel("CANCELLED")).toBe(false);
    expect(canClientCancel("DECLINED")).toBe(false);
  });
});

describe("validateBookingDates", () => {
  const today = "2026-09-07";

  it("accepts a date after today", () => {
    expect(validateBookingDates("2026-09-08", undefined, today)).toBeNull();
  });

  it("rejects today and any past date, regardless of time of day", () => {
    expect(validateBookingDates("2026-09-07", undefined, today)).toBe("Event date must be in the future");
    expect(validateBookingDates("2026-09-06", undefined, today)).toBe("Event date must be in the future");
    expect(validateBookingDates("2020-01-01", undefined, today)).toBe("Event date must be in the future");
  });

  it("requires an event date", () => {
    expect(validateBookingDates("", undefined, today)).toBe("Event date is required");
  });

  it("rejects a malformed date instead of coercing it", () => {
    expect(validateBookingDates("next tuesday", undefined, today)).toBe("Event date is invalid");
    expect(validateBookingDates("2026-9-8", undefined, today)).toBe("Event date is invalid");
  });

  it("accepts a multi-day event whose end date is on or after the start", () => {
    expect(validateBookingDates("2026-09-08", "2026-09-08", today)).toBeNull();
    expect(validateBookingDates("2026-09-08", "2026-09-10", today)).toBeNull();
  });

  it("rejects an end date before the start date", () => {
    expect(validateBookingDates("2026-09-10", "2026-09-08", today)).toBe(
      "End date cannot be before the event date"
    );
  });

  it("ignores an empty end date", () => {
    expect(validateBookingDates("2026-09-08", "", today)).toBeNull();
    expect(validateBookingDates("2026-09-08", null, today)).toBeNull();
  });
});
