import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * registerUser / loginUser.
 *
 * A local fake rather than the shared helper: these actions use auth methods
 * (admin.createUser, signInWithPassword) and upsert options the shared mock
 * does not model.
 */

const { state } = vi.hoisted(() => ({
  state: {
    createUserResult: { data: { user: null as { id: string } | null }, error: null as unknown },
    signInError: null as unknown,
    user: null as Record<string, unknown> | null,
    profileReads: [] as { data: unknown; error: unknown }[],
    upserts: [] as { table: string; payload: unknown; options: unknown }[],
    tableResults: {} as Record<string, { data: unknown; error: unknown }>,
  },
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const logged = vi.hoisted(() => ({ errors: [] as unknown[][] }));
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: (...args: unknown[]) => logged.errors.push(args),
  }),
}));

function builder(table: string) {
  let isWrite = false;
  const b: Record<string, unknown> = {
    select: () => b,
    eq: () => b,
    insert: () => b,
    upsert: (payload: unknown, options: unknown) => {
      state.upserts.push({ table, payload, options });
      isWrite = true;
      return b;
    },
    single: async () => resolve(),
    maybeSingle: async () => resolve(),
    then: (ok: (r: unknown) => unknown) => Promise.resolve(resolve()).then(ok),
  };
  function resolve() {
    if (isWrite) return { data: null, error: null };
    if (table === "profiles") {
      return state.profileReads.shift() ?? { data: null, error: null };
    }
    return state.tableResults[table] ?? { data: null, error: null };
  }
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: async () => ({ error: state.signInError }),
      getUser: async () => ({ data: { user: state.user }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: (table: string) => builder(table),
  }),
  createServiceClient: () => ({
    auth: { admin: { createUser: async () => state.createUserResult } },
    from: (table: string) => builder(table),
  }),
}));

import { registerUser, loginUser } from "@/app/actions/auth";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const validRegistration = {
  full_name: "Jane Doe",
  email: "jane@example.com",
  password: "supersecret",
  role: "CLIENT",
};

beforeEach(() => {
  state.createUserResult = { data: { user: null }, error: null };
  state.signInError = null;
  state.user = null;
  state.profileReads = [];
  state.upserts = [];
  state.tableResults = {};
  logged.errors = [];
});

describe("registerUser", () => {
  it("does not reveal whether an email is already registered", async () => {
    state.createUserResult = {
      data: { user: null },
      error: { message: "A user with this email address has already been registered", status: 422 },
    };

    const result = await registerUser(form(validRegistration));

    expect(result).toEqual({
      error: "Could not create account. If you already have an account, sign in.",
    });
    expect(JSON.stringify(result)).not.toMatch(/already been registered/);
  });

  it("logs the real provider error server-side", async () => {
    state.createUserResult = {
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    };

    await registerUser(form(validRegistration));

    expect(JSON.stringify(logged.errors)).toMatch(/already been registered/);
  });

  it("rejects an attempt to self-register as ADMIN", async () => {
    const result = await registerUser(form({ ...validRegistration, role: "ADMIN" }));
    expect(result?.error).toBeTruthy();
  });
});

describe("loginUser", () => {
  const user = {
    id: "user-1",
    email: "jane@example.com",
    app_metadata: { role: "CLIENT" },
    user_metadata: { full_name: "Stale Registration Name" },
  };

  it("returns a generic error and never echoes the provider message on bad credentials", async () => {
    state.signInError = { message: "Invalid login credentials", code: "invalid_credentials" };

    const result = await loginUser(form({ email: "jane@example.com", password: "nope" }));

    expect(result).toEqual({ error: "Incorrect email or password." });
  });

  it("does NOT overwrite the profile when the profile read errors", async () => {
    state.user = user;
    state.profileReads = [{ data: null, error: { code: "57014", message: "statement timeout" } }];

    const result = await loginUser(form({ email: "jane@example.com", password: "pw" }));

    expect(state.upserts).toEqual([]);
    expect(result?.error).toBe("Could not load your profile. Please try again.");
  });

  it("recreates a genuinely missing profile without clobbering an existing row", async () => {
    state.user = user;
    state.profileReads = [
      { data: null, error: null },
      { data: { role: "CLIENT" }, error: null },
    ];

    await expect(loginUser(form({ email: "jane@example.com", password: "pw" }))).rejects.toThrow(
      "NEXT_REDIRECT:/client/dashboard"
    );

    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].options).toEqual({ onConflict: "id", ignoreDuplicates: true });
  });

  it("treats PGRST116 (no rows) as a missing profile", async () => {
    state.user = user;
    state.profileReads = [
      { data: null, error: { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned" } },
      { data: { role: "SPEAKER" }, error: null },
    ];

    await expect(loginUser(form({ email: "jane@example.com", password: "pw" }))).rejects.toThrow(
      "NEXT_REDIRECT:/speaker/dashboard"
    );
    expect(state.upserts).toHaveLength(1);
  });

  it("routes an existing ADMIN to the admin dashboard without any upsert", async () => {
    state.user = user;
    state.profileReads = [{ data: { role: "ADMIN" }, error: null }];

    await expect(loginUser(form({ email: "jane@example.com", password: "pw" }))).rejects.toThrow(
      "NEXT_REDIRECT:/admin/dashboard"
    );
    expect(state.upserts).toEqual([]);
  });
});
