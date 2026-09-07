-- ============================================================
-- Regression fix: profiles reads hard-errored for anonymous callers
-- ============================================================
-- Introduced by 20260907182321, which revoked EXECUTE on
-- shares_booking_with() from anon on the reasoning that anonymous callers have
-- no use for it. But that function is called from the "Booking counterparties
-- can view each other" RLS policy on profiles:
--
--   USING (auth.uid() IS NOT NULL AND public.shares_booking_with(profiles.id))
--
-- Postgres does NOT guarantee left-to-right short-circuiting of AND in a policy
-- expression — the planner may evaluate the function first. For an anon caller
-- that raises "permission denied for function shares_booking_with", which fails
-- the ENTIRE SELECT on profiles instead of returning zero rows.
--
-- Effect: any profiles read issued before the JWT is attached went from
-- "returns nothing" to "hard error". AuthProvider discards the error from its
-- own profiles fetch (`const { data: profile }`), so the app saw a null profile
-- with no trace of why — and the booking wizard, which was gated on that
-- profile, silently refused to open while the speaker card closed behind it.
--
-- The revoke was also verified only against authenticated sessions, which is
-- why the original check passed. Any function referenced from an RLS policy
-- must be exercised as BOTH anon and authenticated.
-- ============================================================

-- Safe to grant: the body compares against auth.uid(), which is NULL for anon,
-- so it can only ever return false for an anonymous caller. Discloses nothing.
GRANT EXECUTE ON FUNCTION public.shares_booking_with(UUID) TO anon;

-- Belt and braces: short-circuit inside the function so it never touches a
-- table for a caller who cannot possibly match, regardless of planner choices.
CREATE OR REPLACE FUNCTION public.shares_booking_with(target_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
    WHERE
      (sp.user_id = auth.uid() AND b.client_id = target_profile_id)
      OR (b.client_id = auth.uid() AND sp.user_id = target_profile_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.shares_booking_with(UUID) TO anon, authenticated;

-- Verified after applying: anon reads return 0 rows with no error; an
-- authenticated user still reads their own profile; a speaker still sees the
-- profile of a client who booked them and still cannot see an unrelated user.
