import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AssertAdminResult =
  | { error: "Not authenticated" | "Admin access required"; user: null; supabase: null }
  | { error: null; user: { id: string }; supabase: SupabaseServerClient };

/**
 * Gate for admin-only Server Actions.
 *
 * Lives here, in a plain module, rather than being exported from
 * `src/app/actions/admin.ts`. Every export of a `"use server"` file becomes a
 * callable endpoint, so exporting this would publish an admin check that
 * returns a Supabase client — neither serialisable nor something that should
 * have a client-reachable entry point.
 *
 * The role is read from the `profiles` table rather than `raw_user_meta_data`,
 * which is user-writable. RLS policies separately authorise off the
 * `app_metadata.role` JWT claim; both are kept in sync by `promoteToAdmin`.
 */
export async function assertAdmin(): Promise<AssertAdminResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", user: null, supabase: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") {
    return { error: "Admin access required", user: null, supabase: null };
  }

  return { error: null, user, supabase };
}
