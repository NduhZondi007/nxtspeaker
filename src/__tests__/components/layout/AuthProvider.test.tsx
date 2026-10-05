import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

type Callback = (event: string, session: unknown) => unknown;

const { client } = vi.hoisted(() => ({
  client: {
    callback: null as Callback | null,
    selects: [] as string[],
    result: { data: null as unknown, error: null as unknown },
    getSession: vi.fn(),
    unsubscribe: vi.fn(),
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: client.getSession,
      onAuthStateChange: (cb: Callback) => {
        client.callback = cb;
        return { data: { subscription: { unsubscribe: client.unsubscribe } } };
      },
    },
    from: () => ({
      select: (columns: string) => {
        client.selects.push(columns);
        const b = { eq: () => b, maybeSingle: async () => client.result, single: async () => client.result };
        return b;
      },
    }),
  }),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { AuthProvider, useAuth } from "@/components/layout/AuthProvider";

function Probe() {
  const { user, profile, loading, error } = useAuth();
  return (
    <p data-testid="probe">
      {JSON.stringify({ user: user?.id ?? null, profile: profile?.full_name ?? null, loading, error })}
    </p>
  );
}

const read = () => JSON.parse(screen.getByTestId("probe").textContent!);
const session = { user: { id: "u1" } };

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  client.callback = null;
  client.selects = [];
  client.result = { data: { id: "u1", full_name: "Ann" }, error: null };
  client.getSession.mockReset();
  client.unsubscribe.mockReset();
});

describe("AuthProvider", () => {
  it("does not run a Supabase query inside the onAuthStateChange callback", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);

    let returned: unknown;
    act(() => {
      returned = client.callback!("INITIAL_SESSION", session);
    });

    // Awaiting a query inside the callback can deadlock supabase-js's auth lock.
    expect(returned).toBeUndefined();
    expect(client.selects).toHaveLength(0);

    await flush();
    expect(client.selects).toHaveLength(1);
    expect(read()).toMatchObject({ user: "u1", profile: "Ann", loading: false, error: null });
  });

  it("loads once from INITIAL_SESSION, with no separate getSession bootstrap", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();

    expect(client.getSession).not.toHaveBeenCalled();
    expect(client.selects).toHaveLength(1);
  });

  it("selects explicit columns, never *", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();

    expect(client.selects[0]).not.toContain("*");
    expect(client.selects[0]).toContain("full_name");
  });

  it("does not refetch the profile on TOKEN_REFRESHED", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();
    act(() => void client.callback!("TOKEN_REFRESHED", session));
    await flush();

    expect(client.selects).toHaveLength(1);
  });

  it("refetches on USER_UPDATED", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();
    client.result = { data: { id: "u1", full_name: "Ann Renamed" }, error: null };
    act(() => void client.callback!("USER_UPDATED", session));
    await flush();

    expect(read().profile).toBe("Ann Renamed");
  });

  it("exposes a profile read failure instead of swallowing it", async () => {
    client.result = { data: null, error: { message: "boom" } };
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();

    expect(read()).toMatchObject({ user: "u1", profile: null, loading: false });
    expect(read().error).toBeTruthy();
  });

  it("clears everything on sign-out", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    act(() => void client.callback!("INITIAL_SESSION", session));
    await flush();
    act(() => void client.callback!("SIGNED_OUT", null));
    await flush();

    expect(read()).toMatchObject({ user: null, profile: null, loading: false, error: null });
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = render(<AuthProvider><Probe /></AuthProvider>);
    unmount();
    expect(client.unsubscribe).toHaveBeenCalled();
  });
});
