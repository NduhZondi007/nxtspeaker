import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types/database";

/**
 * Request-scoped auth reads.
 *
 * React `cache` dedupes these across the layout, the page and
 * `generateMetadata` of one request, which previously each called
 * `auth.getUser()` (a network round trip) and re-read the same profile.
 */

export interface SessionProfile {
  id: string;
  role: UserRole;
  full_name: string;
  avatar_url: string | null;
}

export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The signed-in user's profile, or null when signed out.
 *
 * A failed read THROWS rather than returning null. Treating "the query
 * errored" as "no profile" sent signed-in users to /login, which middleware
 * bounces back to the dashboard — the redirect loop recorded in ERRORS.md.
 */
export const getMyProfile = cache(async (): Promise<SessionProfile | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw new Error("Could not load your profile. Please try again.");
  if (!data) throw new Error("Your account has no profile. Please contact support.");
  return data as SessionProfile;
});

/** The signed-in speaker's speaker_profiles.id, or null for non-speakers. */
export const getMySpeakerProfileId = cache(async (): Promise<string | null> => {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("speaker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Could not load your speaker profile. Please try again.");
  return data?.id ?? null;
});

const HOME: Record<UserRole, string> = {
  ADMIN: "/admin/dashboard",
  SPEAKER: "/speaker/dashboard",
  CLIENT: "/client/dashboard",
};

/**
 * Page-level role gate. Call it at the top of every page in a role-scoped
 * segment, not only in the layout: with partial rendering, a navigation can
 * render a page segment without re-running its layout, so a layout-only
 * check does not protect pages that read with the service-role key.
 */
export async function requireRole(role: UserRole): Promise<SessionProfile> {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(HOME[profile.role] ?? "/login");
  return profile;
}
