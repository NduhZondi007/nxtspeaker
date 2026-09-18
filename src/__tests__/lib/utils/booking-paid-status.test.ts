import { describe, it, expect } from "vitest";
import {
  BOOKING_STATUSES,
  canChat,
  canClientCancel,
  canSpeakerTransition,
  getBookingStatusColor,
  getBookingStatusLabel,
  isBookingStatus,
} from "@/lib/utils/booking";

/**
 * The escrow gateway introduces PAID: "the client's money is in NxtSpeaker's
 * account". These assertions mirror the SQL state machine in
 * 20260918120200_booking-paid-status.sql — the two are one machine written
 * twice, and drift between them is the bug class this file exists to catch.
 */
describe("PAID booking status", () => {
  it("is a recognised status", () => {
    expect(BOOKING_STATUSES).toContain("PAID");
    expect(isBookingStatus("PAID")).toBe(true);
  });

  it("has a label and a colour", () => {
    expect(getBookingStatusLabel("PAID")).toBe("Paid");
    expect(getBookingStatusColor("PAID")).toBe("#6B9E78");
  });

  it("allows chat — the money is in, the parties need to plan", () => {
    expect(canChat("PAID")).toBe(true);
  });
});

describe("canSpeakerTransition under escrow", () => {
  it("lets a speaker accept or decline a pending request", () => {
    expect(canSpeakerTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canSpeakerTransition("PENDING", "DECLINED")).toBe(true);
  });

  it("lets a speaker close out a paid booking", () => {
    expect(canSpeakerTransition("PAID", "COMPLETED")).toBe(true);
  });

  // The regression this feature introduces deliberately. Previously a speaker
  // could mark a CONFIRMED (unpaid) booking COMPLETED, after which the
  // platform would owe them 85% of money it had never collected.
  it("does not let a speaker complete a booking that has not been paid", () => {
    expect(canSpeakerTransition("CONFIRMED", "COMPLETED")).toBe(false);
  });

  it("does not let a speaker self-declare payment", () => {
    expect(canSpeakerTransition("CONFIRMED", "PAID")).toBe(false);
    expect(canSpeakerTransition("CONFIRMED", "DEPOSIT_PAID")).toBe(false);
  });

  it("treats DEPOSIT_PAID as a dead-end legacy value", () => {
    expect(canSpeakerTransition("DEPOSIT_PAID", "COMPLETED")).toBe(false);
  });

  it("never moves a booking out of a terminal state", () => {
    for (const terminal of ["COMPLETED", "CANCELLED", "DECLINED"] as const) {
      for (const target of BOOKING_STATUSES) {
        expect(canSpeakerTransition(terminal, target)).toBe(false);
      }
    }
  });
});

describe("canClientCancel under escrow", () => {
  it("lets a client withdraw before the money moves", () => {
    expect(canClientCancel("PENDING")).toBe(true);
    expect(canClientCancel("CONFIRMED")).toBe(true);
  });

  // Cancelling a paid booking means refunding it, which is an admin action
  // with a Yoco API call behind it — not a one-click self-service transition.
  it("does not let a client cancel a paid booking", () => {
    expect(canClientCancel("PAID")).toBe(false);
  });

  it("does not let a client cancel a finished booking", () => {
    expect(canClientCancel("COMPLETED")).toBe(false);
    expect(canClientCancel("CANCELLED")).toBe(false);
    expect(canClientCancel("DECLINED")).toBe(false);
  });
});
