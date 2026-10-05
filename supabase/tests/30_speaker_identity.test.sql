-- Speaker public identity (audit H2): name/photo are public on
-- speaker_profiles; contact details on profiles are not.

BEGIN;
SELECT tests.login('client2');
SELECT tests.equals('a stranger reads a speaker''s public name from speaker_profiles',
  $q$SELECT display_name FROM public.speaker_profiles WHERE id = tests.speaker_profile_id('speaker')$q$,
  'Sipho Speaker');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.allowed('a speaker renames themselves on profiles',
  $q$UPDATE public.profiles SET full_name = 'Sipho M. Speaker' WHERE id = auth.uid()$q$, 1);
SELECT tests.equals('…and the public copy follows',
  $q$SELECT display_name FROM public.speaker_profiles WHERE user_id = auth.uid()$q$,
  'Sipho M. Speaker');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.denied('a speaker cannot write the public copy directly',
  $q$UPDATE public.speaker_profiles SET display_name = 'Famous Person' WHERE user_id = auth.uid()$q$);
ROLLBACK;

BEGIN;
INSERT INTO auth.users (email, raw_user_meta_data, raw_app_meta_data)
VALUES ('speaker3@test.local', '{"full_name":"Thabo Three"}', '{"role":"SPEAKER"}');
INSERT INTO public.speaker_profiles (user_id, title) VALUES (tests.uid('speaker3'), 'New')
  ON CONFLICT (user_id) DO NOTHING;
SELECT tests.equals('a new speaker row starts with the owner''s name',
  $q$SELECT display_name FROM public.speaker_profiles WHERE user_id = tests.uid('speaker3')$q$,
  'Thabo Three');
ROLLBACK;

-- ── Step 2: the broad profiles policy is gone (20261005160000) ────────────────

BEGIN;
SELECT tests.sees('client2', 'an unrelated speaker''s contact row',
  $$SELECT 1 FROM public.profiles WHERE email = 'speaker@test.local'$$, 0);
ROLLBACK;

BEGIN;
SELECT tests.login('client2');
SELECT tests.equals('…so a stranger cannot harvest speaker emails or phones',
  $q$SELECT count(*)::text FROM public.profiles WHERE phone IS NOT NULL AND id <> auth.uid()$q$, '0');
ROLLBACK;

BEGIN;
SELECT tests.sees('client2', 'the speaker''s public card (name via speaker_profiles)',
  $$SELECT 1 FROM public.speaker_profiles WHERE display_name = 'Sipho Speaker'$$, 1);
ROLLBACK;

BEGIN;
SELECT tests.sees('speaker', 'their own profile', $$SELECT 1 FROM public.profiles WHERE email = 'speaker@test.local'$$, 1);
SELECT tests.sees('admin',   'the speaker''s profile', $$SELECT 1 FROM public.profiles WHERE email = 'speaker@test.local'$$, 1);
ROLLBACK;

-- ── NOT NULL columns (20261005150000) ────────────────────────────────────────

BEGIN;
SELECT tests.denied('speaker_profiles.expertise can no longer be NULL',
  $q$UPDATE public.speaker_profiles SET expertise = NULL WHERE user_id = tests.uid('speaker')$q$);
ROLLBACK;

BEGIN;
SELECT tests.denied('bookings.status can no longer be NULL',
  $q$UPDATE public.bookings SET status = NULL WHERE event_name = 'Summit'$q$);
ROLLBACK;
