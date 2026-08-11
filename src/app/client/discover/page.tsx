import { createClient } from "@/lib/supabase/server";
import { getSpeakers, DEFAULT_SPEAKER_FILTERS } from "@/lib/data/speakers";
import { DiscoverClient } from "./DiscoverClient";

// Server Component: fetches the default speaker list using the
// cookie-authenticated server client. `ClientLayout` (src/app/client/layout.tsx)
// already redirects unauthenticated users before this ever renders, so —
// unlike the old client-side fetch — there is no window where the request
// can go out before the user's JWT is attached and get silently blocked by
// RLS (`auth.uid() IS NOT NULL`). The result is handed to the client
// component as initial state, so first paint shows real data immediately.
export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: initialSpeakers, error } = await getSpeakers(supabase, DEFAULT_SPEAKER_FILTERS);

  if (error) {
    console.error("[discover] initial speaker_profiles fetch failed:", error);
  }

  return <DiscoverClient initialSpeakers={initialSpeakers} />;
}
