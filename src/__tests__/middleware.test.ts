// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { auth } = vi.hoisted(() => ({
  auth: {
    claims: null as Record<string, unknown> | null,
    throws: false,
    getClaims: vi.fn(),
    getUser: vi.fn(),
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: auth.getClaims,
      getUser: auth.getUser,
    },
  }),
}));

import { middleware, config } from "../../middleware";

function req(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  auth.claims = null;
  auth.throws = false;
  auth.getClaims.mockReset().mockImplementation(async () => {
    if (auth.throws) throw new Error("network down");
    return auth.claims
      ? { data: { claims: auth.claims }, error: null }
      : { data: null, error: null };
  });
  auth.getUser.mockReset().mockRejectedValue(new Error("getUser must not be called: it is a network round trip"));
});

describe("middleware / matcher", () => {
  it("runs only where a session matters, not on every asset, metadata route or webhook", () => {
    expect(config.matcher).toEqual([
      "/",
      "/login",
      "/register",
      "/client/:path*",
      "/speaker/:path*",
      "/admin/:path*",
    ]);
  });
});

describe("middleware / routing", () => {
  it("verifies the session with getClaims (local JWT check), not getUser", async () => {
    auth.claims = { sub: "user-1" };
    await middleware(req("/client/dashboard"));
    expect(auth.getClaims).toHaveBeenCalled();
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("redirects a signed-out visitor away from a portal to /login", async () => {
    const res = await middleware(req("/speaker/profile"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets a signed-in user through to a portal", async () => {
    auth.claims = { sub: "user-1" };
    const res = await middleware(req("/admin/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends a signed-in user on /login to / for role routing", async () => {
    auth.claims = { sub: "user-1" };
    const res = await middleware(req("/login"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("treats a failed verification as signed out instead of crashing the edge function", async () => {
    auth.throws = true;
    const res = await middleware(req("/client/dashboard"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
  });

  it("passes through without crashing when Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const res = await middleware(req("/login"));
    expect(res.headers.get("location")).toBeNull();
  });
});
