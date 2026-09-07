import { describe, it, expect, vi, beforeEach } from "vitest";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    user: null as { id: string } | null,
    /** Terminal result per table, in the order the action queries them. */
    responders: {} as Record<string, (state: QueryState) => { data: unknown; error: unknown }>,
    writes: [] as { table: string; op: string; payload: Record<string, unknown> }[],
  },
}));

interface QueryState {
  table: string;
  op: "select" | "insert" | "update";
  payload?: Record<string, unknown>;
  filters: Record<string, unknown>;
}

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: supabaseState.user }, error: null }),
    },
    from(table: string) {
      const state: QueryState = { table, op: "select", filters: {} };

      const resolve = () => {
        const responder = supabaseState.responders[table];
        if (!responder) throw new Error(`No mock responder registered for table "${table}"`);
        return responder(state);
      };

      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          state.filters[column] = value;
          return builder;
        },
        in: () => builder,
        order: () => builder,
        limit: () => builder,
        insert: (payload: Record<string, unknown>) => {
          state.op = "insert";
          state.payload = payload;
          supabaseState.writes.push({ table, op: "insert", payload });
          return builder;
        },
        update: (payload: Record<string, unknown>) => {
          state.op = "update";
          state.payload = payload;
          supabaseState.writes.push({ table, op: "update", payload });
          return builder;
        },
        single: async () => resolve(),
        maybeSingle: async () => resolve(),
        then: (onFulfilled: (r: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled),
      };

      return builder;
    },
  }),
}));

import { cancelBooking, createBooking, updateBookingStatus } from "@/app/actions/bookings";
import { submitReview } from "@/app/actions/reviews";

const CLIENT_ID = "11111111-1111-4111-8111-111111111111";
const SPEAKER_USER_ID = "22222222-2222-4222-8222-222222222222";
const SPEAKER_PROFILE_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_SPEAKER_ID = "44444444-4444-4444-8444-444444444444";
const BOOKING_ID = "55555555-5555-4555-8555-555555555555";

/** A date guaranteed to be in the future, as `YYYY-MM-DD`. */
const futureDate = (daysAhead = 30) =>
  new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
const pastDate = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const validBookingInput = () => ({
  speaker_id: SPEAKER_PROFILE_ID,
  event_name: "Innovation Summit",
  audience_demographics: "C-suite executives",
  exact_location: "The Forum, Sandton",
  event_organiser: "Thandi M",
  associated_company: "Discovery",
  event_date: futureDate(),
  duration_minutes: 60,
  event_format: "in-person" as const,
  hospitality_rider_agreed: true,
});

/** Satisfies every field in PROFILE_COMPLETENESS_FIELDS. */
function completeSpeaker(overrides: Record<string, unknown> = {}) {
  return {
    speaking_fee_zar: 85000,
    status: "ACTIVE",
    bio: "Twenty years on stage.",
    expertise: ["Leadership"],
    languages: ["English"],
    location: "Johannesburg",
    photo_urls: ["https://cdn.example/p1.png"],
    profiles: { avatar_url: "https://cdn.example/a.png" },
    ...overrides,
  };
}

function ok(data: unknown) {
  return { data, error: null };
}

beforeEach(() => {
  supabaseState.user = { id: CLIENT_ID };
  supabaseState.responders = {};
  supabaseState.writes = [];
});

describe("createBooking", () => {
  beforeEach(() => {
    supabaseState.responders.profiles = () => ok({ role: "CLIENT" });
    // A fully complete, listable speaker — createBooking now refuses to book a
    // speaker whose profile is not 100% complete.
    supabaseState.responders.speaker_profiles = () => ok(completeSpeaker());
    supabaseState.responders.bookings = (state) =>
      ok({ id: BOOKING_ID, ...(state.payload ?? {}) });
  });

  it("creates a booking for a valid request", async () => {
    const result = await createBooking(validBookingInput());
    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ id: BOOKING_ID });
  });

  it("writes the speaker's listed fee, never a client-supplied one", async () => {
    await createBooking({
      ...validBookingInput(),
      // A caller can put anything in the payload — the action must ignore it
      quoted_fee_zar: 1,
    } as ReturnType<typeof validBookingInput> & { quoted_fee_zar: number });

    const insert = supabaseState.writes.find((w) => w.table === "bookings");
    expect(insert?.payload.quoted_fee_zar).toBe(85000);
  });

  it("rejects an event date in the past", async () => {
    const result = await createBooking({ ...validBookingInput(), event_date: pastDate() });
    expect(result.error).toBe("Event date must be in the future");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("rejects an end date before the start date", async () => {
    const result = await createBooking({
      ...validBookingInput(),
      event_date: futureDate(30),
      event_end_date: futureDate(29),
    });
    expect(result.error).toBe("End date cannot be before the event date");
  });

  it("rejects an out-of-range duration", async () => {
    expect((await createBooking({ ...validBookingInput(), duration_minutes: 0 })).error).toBeTruthy();
    expect((await createBooking({ ...validBookingInput(), duration_minutes: 5000 })).error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("rejects a speaker id that is not a uuid", async () => {
    const result = await createBooking({ ...validBookingInput(), speaker_id: "not-a-uuid" });
    expect(result.error).toBe("Invalid speaker");
  });

  it("refuses to create a booking for a speaker account", async () => {
    supabaseState.responders.profiles = () => ok({ role: "SPEAKER" });
    const result = await createBooking(validBookingInput());
    expect(result.error).toBe("Only clients can create bookings");
  });

  it("refuses to book a speaker whose profile is not 100% complete", async () => {
    // Same rule that hides them from discovery — a stale link must not be a
    // way around it. Each of these is otherwise a valid ACTIVE speaker.
    for (const missing of [
      { bio: null },
      { expertise: [] },
      { languages: [] },
      { location: null },
      { speaking_fee_zar: 0 },
      { photo_urls: [] },
      { profiles: { avatar_url: null } },
    ]) {
      supabaseState.writes = [];
      supabaseState.responders.speaker_profiles = () => ok(completeSpeaker(missing));

      const result = await createBooking(validBookingInput());

      expect(result.error).toBe("This speaker is not currently accepting bookings");
      expect(supabaseState.writes).toHaveLength(0);
    }
  });

  it("refuses when not signed in", async () => {
    supabaseState.user = null;
    const result = await createBooking(validBookingInput());
    expect(result.error).toBe("Not authenticated");
  });
});

describe("updateBookingStatus", () => {
  beforeEach(() => {
    supabaseState.user = { id: SPEAKER_USER_ID };
    supabaseState.responders.speaker_profiles = () => ok({ id: SPEAKER_PROFILE_ID });
  });

  it("accepts a pending booking", async () => {
    let call = 0;
    supabaseState.responders.bookings = () =>
      call++ === 0 ? ok({ status: "PENDING" }) : ok({ id: BOOKING_ID, status: "CONFIRMED" });

    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toBeUndefined();
    expect(supabaseState.writes).toContainEqual(
      expect.objectContaining({ table: "bookings", op: "update", payload: { status: "CONFIRMED" } })
    );
  });

  it("rejects a status string that is not a booking status", async () => {
    supabaseState.responders.bookings = () => ok({ status: "PENDING" });
    const result = await updateBookingStatus(BOOKING_ID, "ADMIN" as never);
    expect(result.error).toBe("Invalid booking status");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("rejects skipping straight from pending to completed", async () => {
    supabaseState.responders.bookings = () => ok({ status: "PENDING" });
    const result = await updateBookingStatus(BOOKING_ID, "COMPLETED");
    expect(result.error).toMatch(/cannot change a pending booking to completed/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("does not let a speaker cancel on the client's behalf", async () => {
    supabaseState.responders.bookings = () => ok({ status: "CONFIRMED" });
    const result = await updateBookingStatus(BOOKING_ID, "CANCELLED");
    expect(result.error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("does not let a speaker re-open a declined request", async () => {
    supabaseState.responders.bookings = () => ok({ status: "DECLINED" });
    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses a caller with no speaker profile", async () => {
    supabaseState.responders.speaker_profiles = () => ok(null);
    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toBe("Only speakers can update booking status");
  });
});

describe("cancelBooking", () => {
  it("cancels a pending booking", async () => {
    let call = 0;
    supabaseState.responders.bookings = () =>
      call++ === 0 ? ok({ status: "PENDING" }) : ok({ id: BOOKING_ID, status: "CANCELLED" });

    const result = await cancelBooking(BOOKING_ID, "Venue fell through");
    expect(result.error).toBeUndefined();
    expect(supabaseState.writes).toContainEqual(
      expect.objectContaining({
        table: "bookings",
        payload: { status: "CANCELLED", cancelled_reason: "Venue fell through" },
      })
    );
  });

  it("refuses to cancel an event that already happened", async () => {
    supabaseState.responders.bookings = () => ok({ status: "COMPLETED" });
    const result = await cancelBooking(BOOKING_ID);
    expect(result.error).toMatch(/completed booking cannot be cancelled/i);
    expect(supabaseState.writes).toHaveLength(0);
  });
});

describe("submitReview", () => {
  beforeEach(() => {
    supabaseState.responders.bookings = () =>
      ok({ status: "COMPLETED", client_id: CLIENT_ID, speaker_id: SPEAKER_PROFILE_ID });
    supabaseState.responders.reviews = (state) => ok({ id: "review-1", ...(state.payload ?? {}) });
  });

  it("attributes the review to the booking's speaker, ignoring the caller's value", async () => {
    await submitReview({
      bookingId: BOOKING_ID,
      speakerId: OTHER_SPEAKER_ID, // a speaker the client never booked
      rating: 1,
    });

    const insert = supabaseState.writes.find((w) => w.table === "reviews");
    expect(insert?.payload.speaker_id).toBe(SPEAKER_PROFILE_ID);
    expect(insert?.payload.speaker_id).not.toBe(OTHER_SPEAKER_ID);
  });

  it("rejects a rating outside 1–5", async () => {
    for (const rating of [0, 6, -1, 2.5]) {
      const result = await submitReview({ bookingId: BOOKING_ID, rating });
      expect(result.error).toBeTruthy();
    }
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("rejects a review on a booking that is not completed", async () => {
    supabaseState.responders.bookings = () =>
      ok({ status: "CONFIRMED", client_id: CLIENT_ID, speaker_id: SPEAKER_PROFILE_ID });

    const result = await submitReview({ bookingId: BOOKING_ID, rating: 5 });
    expect(result.error).toBe("Reviews can only be submitted for completed bookings");
  });

  it("rejects a review on someone else's booking", async () => {
    supabaseState.responders.bookings = () =>
      ok({ status: "COMPLETED", client_id: "someone-else", speaker_id: SPEAKER_PROFILE_ID });

    const result = await submitReview({ bookingId: BOOKING_ID, rating: 5 });
    expect(result.error).toBe("Unauthorized");
  });
});
