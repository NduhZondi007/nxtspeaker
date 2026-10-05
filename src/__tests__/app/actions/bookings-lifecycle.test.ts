import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabaseState,
  resetSupabaseState,
  supabaseServerMock,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => supabaseServerMock());

import { cancelBooking, createBooking, updateBookingStatus } from "@/app/actions/bookings";
import { sendMessage } from "@/app/actions/messages";
import { submitReview } from "@/app/actions/reviews";
import { todayInSAST, addDaysISO } from "@/lib/utils/booking";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const SPEAKER_USER_ID = "22222222-2222-4222-8222-222222222222";
const SPEAKER_PROFILE_ID = "33333333-3333-4333-8333-333333333333";
const BOOKING_ID = "55555555-5555-4555-8555-555555555555";

const ok = (data: unknown) => ({ data, error: null });
const RAW_PG = { code: "XX000", message: 'relation "bookings" violates policy "secret_policy_name"' };

beforeEach(() => {
  resetSupabaseState();
});

describe("updateBookingStatus — mark event delivered", () => {
  beforeEach(() => {
    supabaseState.user = { id: SPEAKER_USER_ID };
    supabaseState.responders.speaker_profiles = () => ok({ id: SPEAKER_PROFILE_ID });
  });

  it("completes a PAID booking whose event date has passed", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select"
        ? ok({ status: "PAID", event_date: todayInSAST() })
        : ok({ id: BOOKING_ID, status: "COMPLETED" });

    const result = await updateBookingStatus(BOOKING_ID, "COMPLETED");
    expect(result.error).toBeUndefined();
    const write = supabaseState.writes.find((w) => w.table === "bookings");
    // Conditional on the status that was read, so a concurrent change loses.
    expect(write?.filters.status).toBe("PAID");
  });

  it("refuses to complete a PAID booking before the event date", async () => {
    supabaseState.responders.bookings = () =>
      ok({ status: "PAID", event_date: addDaysISO(todayInSAST(), 3) });

    const result = await updateBookingStatus(BOOKING_ID, "COMPLETED");
    expect(result.error).toMatch(/before the event/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("reports a conflict when the booking changed underneath (0 rows updated)", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select" ? ok({ status: "PENDING", event_date: "2030-01-01" }) : ok(null);

    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toMatch(/changed/i);
  });

  it("never returns a raw database error message", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select"
        ? ok({ status: "PENDING", event_date: "2030-01-01" })
        : { data: null, error: RAW_PG };

    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret_policy_name");
  });

  it("surfaces a failed speaker-profile lookup instead of 'not a speaker'", async () => {
    supabaseState.responders.speaker_profiles = () => ({ data: null, error: RAW_PG });
    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).not.toBe("Only speakers can update booking status");
    expect(result.error).not.toContain("secret_policy_name");
  });
});

describe("cancelBooking — open checkouts", () => {
  beforeEach(() => {
    supabaseState.user = { id: CLIENT_ID };
  });

  it("cancels the booking's CREATED/PENDING payments so a stale checkout cannot capture money", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select" ? ok({ status: "CONFIRMED" }) : ok({ id: BOOKING_ID, status: "CANCELLED" });
    supabaseState.responders.payments = () => ok([]);

    const result = await cancelBooking(BOOKING_ID);
    expect(result.error).toBeUndefined();

    const paymentWrite = supabaseState.writes.find((w) => w.table === "payments");
    expect(paymentWrite?.payload).toEqual({ status: "CANCELLED" });
    expect(paymentWrite?.filters.booking_id).toBe(BOOKING_ID);
    expect(paymentWrite?.filters["status:in"]).toEqual(["CREATED", "PENDING"]);
  });

  it("only cancels from the status it read", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select" ? ok({ status: "PENDING" }) : ok(null);
    supabaseState.responders.payments = () => ok([]);

    const result = await cancelBooking(BOOKING_ID);
    expect(result.error).toMatch(/changed/i);
    const write = supabaseState.writes.find((w) => w.table === "bookings");
    expect(write?.filters.status).toBe("PENDING");
    expect(supabaseState.writes.find((w) => w.table === "payments")).toBeUndefined();
  });
});

describe("createBooking — error handling", () => {
  beforeEach(() => {
    supabaseState.user = { id: CLIENT_ID };
  });

  const input = () => ({
    speaker_id: SPEAKER_PROFILE_ID,
    event_name: "Summit",
    audience_demographics: "Execs",
    exact_location: "Sandton",
    event_organiser: "Thandi",
    associated_company: "Acme",
    event_date: addDaysISO(todayInSAST(), 30),
    duration_minutes: 60,
    event_format: "in-person" as const,
    hospitality_rider_agreed: true,
  });

  it("does not leak the insert error text", async () => {
    supabaseState.responders.profiles = () => ok({ role: "CLIENT" });
    supabaseState.responders.speaker_profiles = () =>
      ok({
        speaking_fee_zar: 1000, status: "ACTIVE", bio: "b", expertise: ["x"], languages: ["en"],
        location: "JHB", photo_urls: ["p"], profiles: { avatar_url: "a" },
      });
    supabaseState.responders.bookings = () => ({ data: null, error: RAW_PG });

    const result = await createBooking(input());
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret_policy_name");
  });

  it("reports a failed profile lookup rather than 'only clients'", async () => {
    supabaseState.responders.profiles = () => ({ data: null, error: RAW_PG });
    supabaseState.responders.speaker_profiles = () => ok(null);
    const result = await createBooking(input());
    expect(result.error).not.toBe("Only clients can create bookings");
  });
});

describe("sendMessage / submitReview — error handling", () => {
  beforeEach(() => {
    supabaseState.user = { id: CLIENT_ID };
  });

  it("sendMessage hides the raw insert error", async () => {
    supabaseState.responders.bookings = () => ok({ status: "PAID" });
    supabaseState.responders.messages = () => ({ data: null, error: RAW_PG });
    const result = await sendMessage(BOOKING_ID, "hello");
    expect(result.error).not.toContain("secret_policy_name");
  });

  it("sendMessage distinguishes a failed booking read from a missing booking", async () => {
    supabaseState.responders.bookings = () => ({ data: null, error: RAW_PG });
    const result = await sendMessage(BOOKING_ID, "hello");
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("secret_policy_name");
  });

  it("submitReview hides the raw insert error", async () => {
    supabaseState.responders.bookings = () =>
      ok({ status: "COMPLETED", client_id: CLIENT_ID, speaker_id: SPEAKER_PROFILE_ID });
    supabaseState.responders.reviews = () => ({ data: null, error: { code: "23505", message: "reviews_booking_id_key" } });
    const result = await submitReview({ bookingId: BOOKING_ID, rating: 5 });
    expect(result.error).toBe("That already exists.");
  });
});
