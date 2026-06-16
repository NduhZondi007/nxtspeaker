-- ============================================================
-- Admin Role Migration
-- ============================================================
-- Adds base_role column and admin-level RLS policies.
-- The ADMIN value is already allowed in profiles.role CHECK constraint.
-- Existing "Admins have full access to bookings" and
-- "Only admins can delete speaker profiles" RLS policies remain unchanged.
-- ============================================================

-- 1. Preserve the user's original CLIENT/SPEAKER role when promoted to ADMIN
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS base_role TEXT CHECK (base_role IN ('SPEAKER', 'CLIENT'));

-- 2. Admins can view all profiles (existing policy only allows own row)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- 3. Admins can update any profile (for role changes and promotions)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- 4. Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- 5. Admins can send messages to any booking chat
CREATE POLICY "Admins can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- 6. Replace the narrow delete-only admin speaker policy with full access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'speaker_profiles'
      AND policyname = 'Only admins can delete speaker profiles'
  ) THEN
    DROP POLICY "Only admins can delete speaker profiles" ON public.speaker_profiles;
  END IF;
END $$;

CREATE POLICY "Admins can manage all speaker profiles"
  ON public.speaker_profiles FOR ALL
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- ============================================================
-- To set the initial admin (run manually in Supabase Studio):
--
--   UPDATE public.profiles
--   SET role = 'ADMIN', base_role = 'CLIENT'   -- or 'SPEAKER'
--   WHERE id = '<user-uuid>';
--
-- After that, admins can promote others through the admin UI.
-- ============================================================
