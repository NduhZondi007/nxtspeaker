-- ============================================================
-- Harden: trigger functions were published as callable RPC endpoints
-- ============================================================
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and PostgREST
-- exposes everything executable in the `public` schema at
-- /rest/v1/rpc/<name>. Every trigger function in this schema was therefore
-- callable by anyone holding the anon key — flagged by the Supabase database
-- linter as 0028 (anon) and 0029 (authenticated).
--
-- Trigger functions are invoked by the table operation itself and are not
-- privilege-checked against the calling role, so revoking EXECUTE removes the
-- endpoint with no effect on trigger firing. Verified after applying: inserts,
-- status transitions and the updated_at trigger all still behave correctly.
-- ============================================================

REVOKE ALL ON FUNCTION public.enforce_profile_update_rules()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_booking_update_rules()          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_speaker_profile_update_rules()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_speaker_rating()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_speaker_events()                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_booking_number()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_speaker_profile()            FROM PUBLIC, anon, authenticated;

-- Helper called only from the two stats trigger functions above.
REVOKE ALL ON FUNCTION public.refresh_speaker_stats(UUID)             FROM PUBLIC, anon, authenticated;

-- shares_booking_with IS referenced from an RLS policy on profiles, so signed-in
-- users must retain EXECUTE — but anonymous callers have no use for it.
REVOKE ALL ON FUNCTION public.shares_booking_with(UUID)               FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_booking_with(UUID)            TO authenticated;

-- Pre-existing lint 0011: handle_updated_at still inherited the caller's
-- search_path, unlike the two trigger functions pinned in 20260616195246.
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
