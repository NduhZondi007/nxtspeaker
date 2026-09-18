import type { BookingStatus } from "@/lib/types/database";

export function getBookingStatusColor(status: BookingStatus): string {
  const colors: Record<BookingStatus, string> = {
    PENDING: "#A88C7C",
    CONFIRMED: "#6B9E78",
    PAID: "#6B9E78",
    DEPOSIT_PAID: "#8BA888",
    COMPLETED: "#8C7CA8",
    CANCELLED: "#C47A6A",
    DECLINED: "#9A9590",
  };
  return colors[status] ?? "#9A9590";
}

export function getBookingStatusLabel(status: BookingStatus): string {
  const labels: Record<BookingStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PAID: "Paid",
    DEPOSIT_PAID: "Deposit Paid",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    DECLINED: "Declined",
  };
  return labels[status] ?? status;
}

export function canChat(status: BookingStatus): boolean {
  return status !== "PENDING" && status !== "DECLINED" && status !== "CANCELLED";
}

/** Every value allowed by the `bookings.status` CHECK constraint. */
export const BOOKING_STATUSES: readonly BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PAID",
  "DEPOSIT_PAID",
  "COMPLETED",
  "CANCELLED",
  "DECLINED",
] as const;

/**
 * Runtime guard for a value arriving from a client. Server Action arguments
 * are just deserialised JSON — the `BookingStatus` annotation on the
 * parameter is erased at build time and enforces nothing at the boundary.
 */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && (BOOKING_STATUSES as readonly string[]).includes(value);
}

/**
 * Status changes a speaker is allowed to make on their own booking.
 * A speaker accepts, declines, or closes out a delivered event — they never
 * cancel (that is the client's action) and never move a booking backwards or
 * out of a terminal state.
 *
 * Under escrow a speaker cannot declare that money arrived, and cannot close
 * out a booking that has not been paid. `CONFIRMED -> PAID` belongs to the
 * verified Yoco webhook alone; `CONFIRMED -> COMPLETED` is gone because it
 * would have left the platform owing 85% of money it never collected.
 *
 * Mirrors the SQL state machine in
 * supabase/migrations/20260918120200_booking-paid-status.sql. The two are one
 * machine written twice — change them together.
 */
const SPEAKER_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED"],
  CONFIRMED: [],
  PAID: ["COMPLETED"],
  // Legacy dead end: predates the payment gateway, retained so existing rows
  // still render. Only an admin (service role) can move these on.
  DEPOSIT_PAID: [],
  COMPLETED: [],
  CANCELLED: [],
  DECLINED: [],
};

export function canSpeakerTransition(from: BookingStatus, to: BookingStatus): boolean {
  return SPEAKER_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * A client may withdraw a booking only before their money has moved.
 * Cancelling a PAID booking means refunding it, which is an admin action with
 * a Yoco API call behind it — not a one-click self-service transition.
 */
export function canClientCancel(from: BookingStatus): boolean {
  return from === "PENDING" || from === "CONFIRMED";
}

/**
 * Validates the date pair on a booking request.
 *
 * Dates arrive as `YYYY-MM-DD` from an `<input type="date">`. Comparing them
 * as calendar strings keeps the check deterministic: parsing them into
 * `Date` objects and comparing against `new Date()` made the result depend
 * on the server's clock time-of-day and UTC offset, so the same date could
 * be accepted or rejected depending on when the form was submitted.
 */
export function validateBookingDates(
  eventDate: string,
  eventEndDate?: string | null,
  today: string = new Date().toISOString().slice(0, 10)
): string | null {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  if (!eventDate) return "Event date is required";
  if (!DATE_RE.test(eventDate)) return "Event date is invalid";
  if (eventDate <= today) return "Event date must be in the future";

  if (eventEndDate) {
    if (!DATE_RE.test(eventEndDate)) return "End date is invalid";
    if (eventEndDate < eventDate) return "End date cannot be before the event date";
  }

  return null;
}
