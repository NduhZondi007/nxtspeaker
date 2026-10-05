-- ============================================================
-- Speaker public identity — step 1 of 2 (audit H2)
-- ============================================================
-- Discovery needs a speaker's name and photo. It got them by embedding the
-- speaker's `profiles` row, which only worked because
-- "Authenticated users can view speaker profiles" lets ANY signed-in user
-- read every active speaker's full profiles row — email, phone, company.
-- One signup was enough to harvest every speaker's contact details and take
-- the booking off-platform.
--
-- The public part of a speaker's identity now lives on speaker_profiles
-- itself, copied from profiles and kept in sync by trigger. The app reads it
-- from there. Step 2 (20261005150000) drops the broad policy once the app no
-- longer embeds profiles for public display.
--
-- This step is additive and safe to apply before the app deploys.
-- ============================================================

ALTER TABLE public.speaker_profiles
  ADD COLUMN IF NOT EXISTS display_name       TEXT,
  ADD COLUMN IF NOT EXISTS display_avatar_url TEXT;

COMMENT ON COLUMN public.speaker_profiles.display_name IS
  'Public copy of profiles.full_name, maintained by sync_speaker_public_identity(). Do not write directly.';
COMMENT ON COLUMN public.speaker_profiles.display_avatar_url IS
  'Public copy of profiles.avatar_url, maintained by sync_speaker_public_identity(). Do not write directly.';

-- Backfill. Runs as the migration owner (auth.uid() IS NULL), so the update
-- guard lets it through.
UPDATE public.speaker_profiles sp
   SET display_name = p.full_name,
       display_avatar_url = p.avatar_url
  FROM public.profiles p
 WHERE p.id = sp.user_id;


-- New speaker rows start with the owner's current name and photo.
CREATE OR REPLACE FUNCTION public.fill_speaker_public_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT p.full_name, p.avatar_url
    INTO NEW.display_name, NEW.display_avatar_url
    FROM public.profiles p
   WHERE p.id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fill_speaker_public_identity ON public.speaker_profiles;
CREATE TRIGGER fill_speaker_public_identity
  BEFORE INSERT ON public.speaker_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fill_speaker_public_identity();


-- A rename or new avatar propagates. The transaction-local flag tells the
-- speaker_profiles guard below that this write is the platform's, not the
-- user's — the same pattern refresh_speaker_stats() uses.
CREATE OR REPLACE FUNCTION public.sync_speaker_public_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    PERFORM set_config('app.platform_identity_sync', 'on', true);
    UPDATE public.speaker_profiles
       SET display_name = NEW.full_name,
           display_avatar_url = NEW.avatar_url
     WHERE user_id = NEW.id;
    PERFORM set_config('app.platform_identity_sync', 'off', true);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_speaker_public_identity ON public.profiles;
CREATE TRIGGER sync_speaker_public_identity
  AFTER UPDATE OF full_name, avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_speaker_public_identity();

REVOKE ALL ON FUNCTION public.fill_speaker_public_identity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_speaker_public_identity() FROM PUBLIC, anon, authenticated;


-- The copies are derived data: users change their name or photo on
-- profiles, never here. Same guard as 20261005120000 plus the new columns.
CREATE OR REPLACE FUNCTION public.enforce_speaker_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.platform_stats_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.avg_rating IS DISTINCT FROM OLD.avg_rating
     OR NEW.total_events IS DISTINCT FROM OLD.total_events THEN
    RAISE EXCEPTION 'Speaker status and reputation are managed by the platform'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF (NEW.display_name IS DISTINCT FROM OLD.display_name
      OR NEW.display_avatar_url IS DISTINCT FROM OLD.display_avatar_url)
     AND current_setting('app.platform_identity_sync', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Change your name or photo on your profile, not here'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     AND EXISTS (
       SELECT 1 FROM unnest(COALESCE(NEW.photo_urls, '{}')) AS u(url)
        WHERE u.url <> ALL (COALESCE(OLD.photo_urls, '{}'))
          AND NOT public.is_own_storage_url(u.url, 'speaker-photos', OLD.user_id)
     ) THEN
    RAISE EXCEPTION 'Portfolio photos must be images you uploaded'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;
