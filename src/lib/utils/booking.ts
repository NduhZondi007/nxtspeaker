import type { BookingStatus } from "@/lib/types/database";

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
 * Status changes an administrator may make from the booking page.
 *
 * Admin writes run with the service role, which the SQL trigger exempts, so
 * this table is the only thing standing between an admin click and an
 * inconsistent ledger:
 *
 *   * nothing ever moves to PAID — that is the verified Yoco webhook's job;
 *   * PAID -> CANCELLED is absent because money has moved: it must go through
 *     adminRefundPayment, which calls Yoco and closes the payout;
 *   * CONFIRMED -> COMPLETED is absent for the same reason the speaker's is —
 *     completing an unpaid booking releases a payout for money never taken.
 */
const ADMIN_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  PAID: ["COMPLETED"],
  // Legacy: predates the gateway. Admin may close it out or cancel it.
  DEPOSIT_PAID: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  DECLINED: [],
};

export function canAdminTransition(from: BookingStatus, to: BookingStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

export function adminTransitionsFrom(from: BookingStatus): readonly BookingStatus[] {
  return ADMIN_TRANSITIONS[from] ?? [];
}

const SAST = "Africa/Johannesburg";

/**
 * Today's calendar date in South Africa as `YYYY-MM-DD`.
 *
 * `new Date().toISOString()` is the UTC date, which is still "yesterday"
 * between 00:00 and 02:00 SAST — the window in which a same-day booking was
 * wrongly accepted. `en-CA` formats as ISO `YYYY-MM-DD`.
 */
export function todayInSAST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Adds whole calendar days to a `YYYY-MM-DD` string. */
export function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether the speaker may mark the event delivered (PAID -> COMPLETED).
 * Completion starts the payout hold, so it must not happen before the event.
 */
export function canMarkDelivered(status: BookingStatus, eventDate: string, today: string = todayInSAST()): boolean {
  return status === "PAID" && eventDate <= today;
}

/**
 * Formats a date or timestamp in SAST. Without an explicit zone the server
 * renders in UTC and the browser in local time, so the same value could show
 * different dates (and a hydration mismatch on client components).
 */
export function formatDateSAST(
  value: string,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" }
): string {
  return new Intl.DateTimeFormat("en-ZA", { ...options, timeZone: SAST }).format(new Date(value));
}

/** `HH:mm` in SAST, 24-hour, identical on server and browser. */
export function formatTimeSAST(value: string): string {
  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: SAST,
  }).format(new Date(value));
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
  today: string = todayInSAST()
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

/**
 * Columns a booking detail page renders. Listed explicitly so new columns
 * (e.g. internal notes) are not shipped to the browser by default.
 */
export const BOOKING_DETAIL_COLUMNS =
  "id, booking_number, client_id, speaker_id, event_name, audience_demographics, exact_location, " +
  "event_organiser, associated_company, event_date, event_end_date, duration_minutes, event_format, " +
  "estimated_audience, quoted_fee_zar, status, hospitality_rider_agreed, hospitality_agreed_at, " +
  "client_notes, cancelled_reason, created_at, updated_at";

/** Columns a booking list row renders. */
export const BOOKING_LIST_COLUMNS =
  "id, booking_number, event_name, event_date, event_format, exact_location, duration_minutes, status, quoted_fee_zar, created_at";

/** Public fields of another user's profile — never email or phone. */
export const PUBLIC_PROFILE_COLUMNS = "id, full_name, avatar_url";
