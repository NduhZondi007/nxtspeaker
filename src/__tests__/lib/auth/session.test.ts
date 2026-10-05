import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
const single = vi.fn();
const maybeSingle = vi.fn();
const redirect = vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); });

vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T,>(fn: T) => fn }));
vi.mock("next/navigation", () => ({ redirect: (p: string) => redirect(p) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({ eq: () => ({ single, maybeSingle }) }),
    }),
  }),
}));

import { getMyProfile, requireRole } from "@/lib/auth/session";

beforeEach(() => {
  getUser.mockReset(); single.mockReset(); maybeSingle.mockReset(); redirect.mockClear();
});

describe("getMyProfile", () => {
  it("returns null when nobody is signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getMyProfile()).toBeNull();
  });

  it("throws on a query error instead of reporting 'no profile'", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    maybeSingle.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } });
    await expect(getMyProfile()).rejects.toThrow(/profile/i);
  });
});

describe("requireRole", () => {
  it("redirects to /login when signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(requireRole("ADMIN")).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("sends a non-admin to their own dashboard", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    maybeSingle.mockResolvedValue({ data: { id: "u1", role: "CLIENT", full_name: "C", avatar_url: null }, error: null });
    await expect(requireRole("ADMIN")).rejects.toThrow("NEXT_REDIRECT:/client/dashboard");
  });

  it("returns the profile for the right role", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    maybeSingle.mockResolvedValue({ data: { id: "u1", role: "ADMIN", full_name: "A", avatar_url: null }, error: null });
    await expect(requireRole("ADMIN")).resolves.toMatchObject({ role: "ADMIN" });
  });

  it("does not redirect-loop when the profile read fails — it throws to the error boundary", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    maybeSingle.mockResolvedValue({ data: null, error: { code: "57014", message: "timeout" } });
    await expect(requireRole("CLIENT")).rejects.toThrow(/profile/i);
    expect(redirect).not.toHaveBeenCalled();
  });
});
