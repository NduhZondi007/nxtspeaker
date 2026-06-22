-- ============================================================
-- Fix infinite recursion in profiles RLS policies
-- ============================================================
-- The "Admins can view all profiles" and "Admins can update any profile"
-- policies added in 20260616210049_admin-role.sql use an EXISTS subquery
-- that queries public.profiles from inside a profiles RLS policy.
-- This causes PostgreSQL error 42P17 (infinite recursion) for every
-- authenticated user, breaking the entire auth flow.
--
-- Fix: check the role from the JWT app_metadata claim instead of querying
-- the profiles table. auth.jwt() reads the current request's JWT without
-- any table access, so recursion is impossible.
-- ============================================================

-- Drop old recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate using JWT claim — no table query, no recursion
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- Also fix speaker_profiles: "Admins can manage all speaker profiles" is FOR ALL
-- (includes SELECT) and queries profiles. A profiles SELECT policy queries
-- speaker_profiles, completing a second circular chain.
DROP POLICY IF EXISTS "Admins can manage all speaker profiles" ON public.speaker_profiles;

CREATE POLICY "Admins can manage all speaker profiles"
  ON public.speaker_profiles FOR ALL
  USING (
    user_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'
  );

-- Also drop the is_admin() function if it was created by a previous
-- attempt (it is no longer needed for these policies)
DROP FUNCTION IF EXISTS public.is_admin();
