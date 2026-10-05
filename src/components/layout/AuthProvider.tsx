"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createLogger } from "@/lib/logger";
import type { Profile } from "@/lib/types/database";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

const log = createLogger("auth-provider");

const PROFILE_COLUMNS =
  "id, role, base_role, full_name, email, phone, company, avatar_url, created_at, updated_at";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** Set when the signed-in user's profile could not be read. */
  error: string | null;
}

const SIGNED_OUT: AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  loading: false,
  error: null,
};

const AuthContext = createContext<AuthContextValue>({ ...SIGNED_OUT, loading: true });

/** Events after which the profile row may differ from what we hold. */
const PROFILE_EVENTS: ReadonlySet<AuthChangeEvent> = new Set(["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED"]);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({ ...SIGNED_OUT, loading: true });

  useEffect(() => {
    const supabase = createClient();
    // Only the newest profile request may write state; an older one that
    // lands after a sign-out or a user switch is discarded.
    let latestRequest = 0;
    let disposed = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    async function loadProfile(session: Session, requestId: number) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("id", session.user.id)
          .maybeSingle();
        if (disposed || requestId !== latestRequest) return;
        if (error) log.error("profile read failed", { cause: error });
        setState({
          user: session.user,
          session,
          profile: (data as Profile | null) ?? null,
          loading: false,
          error: error ? "Could not load your profile." : null,
        });
      } catch (err) {
        if (disposed || requestId !== latestRequest) return;
        log.error("profile read threw", { cause: err });
        setState({
          user: session.user,
          session,
          profile: null,
          loading: false,
          error: "Could not load your profile.",
        });
      }
    }

    // onAuthStateChange fires INITIAL_SESSION on subscribe, so there is no
    // separate getSession() bootstrap — that used to fetch the profile twice.
    //
    // The callback must stay synchronous: supabase-js runs it while holding
    // its auth lock, and awaiting another Supabase call in there can deadlock
    // (documented in the supabase-js onAuthStateChange reference). The fetch
    // is deferred to a fresh task instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        latestRequest++;
        setState(SIGNED_OUT);
        return;
      }

      if (!PROFILE_EVENTS.has(event)) {
        // TOKEN_REFRESHED and friends: same user, same profile — just keep
        // the fresh session object.
        setState((prev) => ({ ...prev, user: session.user, session }));
        return;
      }

      const requestId = ++latestRequest;
      const timer = setTimeout(() => {
        timers.delete(timer);
        void loadProfile(session, requestId);
      }, 0);
      timers.add(timer);
    });

    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
