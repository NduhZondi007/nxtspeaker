import { describe, it, expect, vi, beforeEach } from "vitest";

const { session } = vi.hoisted(() => ({
  session: {
    profile: null as null | { id: string; role: string; full_name: string; avatar_url: string | null },
    error: null as Error | null,
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

vi.mock("@/lib/auth/session", () => ({
  getMyProfile: async () => {
    if (session.error) throw session.error;
    return session.profile;
  },
  requireRole: async (role: string) => {
    if (session.error) throw session.error;
    if (!session.profile) throw new RedirectError("/login");
    if (session.profile.role !== role) throw new RedirectError("/elsewhere");
    return session.profile;
  },
}));

// Layout chrome is irrelevant here; only the gate is under test.
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => null }));
vi.mock("@/components/layout/SidebarContext", () => ({
  SidebarProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/bookings/BookingStatusWatcher", () => ({ BookingStatusWatcher: () => null }));

import ClientLayout from "@/app/client/layout";
import SpeakerLayout from "@/app/speaker/layout";
import AdminLayout from "@/app/admin/layout";

const child = <p>child</p>;

beforeEach(() => {
  session.profile = null;
  session.error = null;
});

describe.each([
  ["ClientLayout", ClientLayout],
  ["SpeakerLayout", SpeakerLayout],
  ["AdminLayout", AdminLayout],
] as const)("%s", (_name, Layout) => {
  it("propagates a profile read failure to the error boundary instead of redirecting to /login", async () => {
    session.error = new Error("Could not load your profile. Please try again.");
    await expect(Layout({ children: child })).rejects.toThrow("Could not load your profile");
  });

  it("redirects a signed-out visitor to /login", async () => {
    await expect(Layout({ children: child })).rejects.toThrow("NEXT_REDIRECT:/login");
  });
});

describe("role routing", () => {
  it("sends a speaker away from the client portal", async () => {
    session.profile = { id: "u", role: "SPEAKER", full_name: "S", avatar_url: null };
    await expect(ClientLayout({ children: child })).rejects.toThrow("NEXT_REDIRECT:/speaker/dashboard");
  });

  it("sends a client away from the speaker portal", async () => {
    session.profile = { id: "u", role: "CLIENT", full_name: "C", avatar_url: null };
    await expect(SpeakerLayout({ children: child })).rejects.toThrow("NEXT_REDIRECT:/client/dashboard");
  });

  it("lets an admin into the client and speaker portals", async () => {
    session.profile = { id: "u", role: "ADMIN", full_name: "A", avatar_url: null };
    await expect(ClientLayout({ children: child })).resolves.toBeTruthy();
    await expect(SpeakerLayout({ children: child })).resolves.toBeTruthy();
  });

  it("admits only admins to the admin portal", async () => {
    session.profile = { id: "u", role: "CLIENT", full_name: "C", avatar_url: null };
    await expect(AdminLayout({ children: child })).rejects.toThrow("NEXT_REDIRECT");
  });
});
