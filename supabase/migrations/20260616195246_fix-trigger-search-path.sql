-- ============================================================
-- Fix: SECURITY DEFINER trigger functions missing explicit search_path
-- ============================================================
-- supabase_auth_admin has search_path=auth. Because handle_new_user()
-- had no explicit search_path set (proconfig=NULL), it inherited the
-- calling session's search_path and resolved 'profiles' as 'auth.profiles'
-- (which does not exist), causing every new-user signup to fail with
-- "Database error saving new user".
--
-- Fix: set search_path = '' on both trigger functions and use fully-
-- qualified schema.table names throughout. This makes the functions
-- immune to whatever search_path the caller session has.
-- ============================================================

-- Fix handle_new_user: explicit search_path + public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'role', 'CLIENT')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Fix handle_new_speaker_profile: explicit search_path (table refs already
-- used public. prefix, but search_path was still inherited)
CREATE OR REPLACE FUNCTION public.handle_new_speaker_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_speaker_id UUID;
BEGIN
  IF NEW.role = 'SPEAKER' THEN
    INSERT INTO public.speaker_profiles (user_id, title, speaking_fee_zar)
    VALUES (NEW.id, 'Professional Speaker', 0)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO new_speaker_id;

    IF new_speaker_id IS NOT NULL THEN
      INSERT INTO public.hospitality_riders (speaker_id)
      VALUES (new_speaker_id)
      ON CONFLICT (speaker_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- Backfill: create profiles for any auth.users that have no profile row
-- (users created before the trigger was in place or before this fix)
INSERT INTO public.profiles (id, full_name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  COALESCE(u.raw_app_meta_data->>'role', 'CLIENT')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
