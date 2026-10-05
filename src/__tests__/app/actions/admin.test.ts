import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  supabaseState,
  resetSupabaseState,
  makeFakeClient,
  type QueryState,
} from "@/__tests__/helpers/supabase-mock";

const { revalidatePath, updateUserById } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  updateUserById: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => makeFakeClient()),
  createServiceClient: vi.fn(() => ({
    ...makeFakeClient(),
    auth: { admin: { updateUserById } },
  })),
}));

const ADMIN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
vi.mock("@/lib/auth/assert-admin", () => ({
  assertAdmin: vi.fn(async () => ({ error: null, user: { id: ADMIN_ID }, supabase: null })),
}));

import {
  adminCreateSpeaker,
  adminSendMessage,
  adminToggleSpeakerStatus,
  adminUpdateBookingStatus,
  promoteToAdmin,
  revokeAdmin,
} from "@/app/actions/admin";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const SPEAKER_PROFILE_ID = "33333333-3333-4333-8333-333333333333";
const BOOKING_ID = "55555555-5555-4555-8555-555555555555";
const ok = (data: unknown) => ({ data, error: null });
const RAW_PG = { code: "XX000", message: 'violates "secret_constraint"' };

beforeEach(() => {
  resetSupabaseState();
  revalidatePath.mockClear();
  updateUserById.mockReset();
  updateUserById.mockResolvedValue({ data: {}, error: null });
});

function bookingIn(status: string, updated: unknown = { id: BOOKING_ID }) {
  supabaseState.responders.bookings = (s: QueryState) =>
    s.op === "select" ? ok({ status }) : ok(updated);
  supabaseState.responders.payments = () => ok([]);
}

describe("adminUpdateBookingStatus", () => {
  it("never sets PAID — only the verified webhook may", async () => {
    bookingIn("CONFIRMED");
    const result = await adminUpdateBookingStatus(BOOKING_ID, "PAID");
    expect(result.error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses to cancel a PAID booking — that must go through a refund", async () => {
    bookingIn("PAID");
    const result = await adminUpdateBookingStatus(BOOKING_ID, "CANCELLED");
    expect(result.error).toMatch(/refund/i);
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("refuses to complete an unpaid CONFIRMED booking", async () => {
    bookingIn("CONFIRMED");
    const result = await adminUpdateBookingStatus(BOOKING_ID, "COMPLETED");
    expect(result.error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("completes a PAID booking conditionally on its current status", async () => {
    bookingIn("PAID");
    const result = await adminUpdateBookingStatus(BOOKING_ID, "COMPLETED");
    expect(result.error).toBeUndefined();
    const write = supabaseState.writes.find((w) => w.table === "bookings");
    expect(write?.payload).toEqual({ status: "COMPLETED" });
    expect(write?.filters.status).toBe("PAID");
  });

  it("reports a conflict when no row matched the conditional update", async () => {
    bookingIn("PENDING", null);
    const result = await adminUpdateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).toMatch(/changed/i);
  });

  it("closes open checkouts when cancelling an unpaid booking", async () => {
    bookingIn("CONFIRMED");
    await adminUpdateBookingStatus(BOOKING_ID, "CANCELLED", "Venue closed");
    const paymentWrite = supabaseState.writes.find((w) => w.table === "payments");
    expect(paymentWrite?.payload).toEqual({ status: "CANCELLED" });
    expect(paymentWrite?.filters["status:in"]).toEqual(["CREATED", "PENDING"]);
  });

  it("does not leak a raw database error", async () => {
    supabaseState.responders.bookings = (s: QueryState) =>
      s.op === "select" ? ok({ status: "PENDING" }) : { data: null, error: RAW_PG };
    const result = await adminUpdateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.error).not.toContain("secret_constraint");
  });
});

describe("promoteToAdmin / revokeAdmin validation", () => {
  it("rejects a user id that is not a uuid before touching the database", async () => {
    expect((await promoteToAdmin("x,role.eq.ADMIN")).error).toBe("Invalid user");
    expect((await revokeAdmin("nope")).error).toBe("Invalid user");
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("does not echo the auth API's error text when the claim sync fails", async () => {
    supabaseState.responders.profiles = () => ok({ role: "CLIENT", base_role: null });
    updateUserById.mockResolvedValue({ data: null, error: { message: "internal: jwt secret xyz" } });
    const result = await promoteToAdmin(USER_ID);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("jwt secret");
  });
});

describe("adminToggleSpeakerStatus validation", () => {
  it("rejects a non-uuid id and a non-boolean flag", async () => {
    expect((await adminToggleSpeakerStatus("bad", true)).error).toBeTruthy();
    expect((await adminToggleSpeakerStatus(SPEAKER_PROFILE_ID, "yes" as never)).error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });
});

describe("adminCreateSpeaker", () => {
  const valid = () => ({
    title: "Keynote Speaker",
    bio: "",
    speaking_fee_zar: 25000,
    expertise: ["Leadership"],
    languages: ["English"],
    location: "Johannesburg",
    level: 1,
    available: true,
    virtual_available: false,
    hybrid_available: false,
    tags: [],
  });

  it("rejects a negative fee, a bad level and a non-uuid user", async () => {
    expect((await adminCreateSpeaker(USER_ID, { ...valid(), speaking_fee_zar: -1 })).error).toBeTruthy();
    expect((await adminCreateSpeaker(USER_ID, { ...valid(), level: 9 })).error).toBeTruthy();
    expect((await adminCreateSpeaker("bad", valid())).error).toBeTruthy();
    expect(supabaseState.writes).toHaveLength(0);
  });

  it("reports a partial failure when a later step errors", async () => {
    supabaseState.responders.profiles = (s: QueryState) =>
      s.op === "select" ? ok({ role: "CLIENT" }) : ok(null);
    supabaseState.responders.speaker_profiles = (s: QueryState) =>
      s.op === "select" ? ok(null) : ok({ id: SPEAKER_PROFILE_ID });
    supabaseState.responders.hospitality_riders = () => ({ data: null, error: RAW_PG });

    const result = await adminCreateSpeaker(USER_ID, valid());
    expect(result.error).toMatch(/created/i);
    expect(result.error).toMatch(/rider/i);
    expect(result.error).not.toContain("secret_constraint");
  });
});

describe("adminSendMessage", () => {
  it("does not revalidate the booking page on every message", async () => {
    supabaseState.responders.messages = () => ok({ id: "m1", content: "hi" });
    const result = await adminSendMessage(BOOKING_ID, "hi");
    expect(result.error).toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
