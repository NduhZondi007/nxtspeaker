-- Test helpers and a fixed cast of users. Runs as the superuser after the
-- migrations; every test file then impersonates one of these users.

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO anon, authenticated, service_role;

-- Impersonate a user the way PostgREST does: claims in request.jwt.claims,
-- then drop to the `authenticated` role so RLS applies. Transaction-local.
CREATE FUNCTION tests.login(p_user TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_id UUID; v_role TEXT;
BEGIN
  SELECT u.id, u.raw_app_meta_data->>'role' INTO v_id, v_role
  FROM auth.users u WHERE u.email = p_user || '@test.local';
  IF v_id IS NULL THEN RAISE EXCEPTION 'tests.login: unknown user %', p_user; END IF;
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated',
                      'app_metadata', json_build_object('role', v_role))::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

CREATE FUNCTION tests.uid(p_user TEXT) RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT id FROM auth.users WHERE email = p_user || '@test.local'
$$;

CREATE FUNCTION tests.speaker_profile_id(p_user TEXT) RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = '' AS $$
  SELECT sp.id FROM public.speaker_profiles sp
  JOIN auth.users u ON u.id = sp.user_id WHERE u.email = p_user || '@test.local'
$$;

-- Passes when the statement raises; fails the run if it succeeds.
CREATE FUNCTION tests.denied(p_name TEXT, p_sql TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ok   - %  (%)', p_name, SQLERRM;
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL - % : statement was allowed', p_name;
END $$;

-- Passes when the statement succeeds and (optionally) affects/returns rows.
CREATE FUNCTION tests.allowed(p_name TEXT, p_sql TEXT, p_min_rows INT DEFAULT 0)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  EXECUTE p_sql;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n < p_min_rows THEN
    RAISE EXCEPTION 'FAIL - % : expected >= % rows, got %', p_name, p_min_rows, n;
  END IF;
  RAISE NOTICE 'ok   - %', p_name;
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE 'FAIL - %' THEN RAISE; END IF;
  RAISE EXCEPTION 'FAIL - % : %', p_name, SQLERRM;
END $$;

-- Passes when a query returns exactly p_expected (as text).
CREATE FUNCTION tests.equals(p_name TEXT, p_sql TEXT, p_expected TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE v TEXT;
BEGIN
  EXECUTE p_sql INTO v;
  IF v IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION 'FAIL - % : expected %, got %', p_name, p_expected, v;
  END IF;
  RAISE NOTICE 'ok   - %', p_name;
END $$;

-- One helper per (user, query, expected count).
CREATE FUNCTION tests.sees(p_user TEXT, p_what TEXT, p_sql TEXT, p_expected INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  PERFORM tests.login(p_user);
  EXECUTE 'SELECT count(*) FROM (' || p_sql || ') q' INTO n;
  EXECUTE 'RESET ROLE';
  IF n <> p_expected THEN
    RAISE EXCEPTION 'FAIL - % sees % : expected %, got %', p_user, p_what, p_expected, n;
  END IF;
  RAISE NOTICE 'ok   - % sees % = %', p_user, p_what, n;
END $$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;

-- Cast: two clients, two speakers, one admin.
INSERT INTO auth.users (email, raw_user_meta_data, raw_app_meta_data) VALUES
  ('client@test.local',   '{"full_name":"Cara Client"}',   '{"role":"CLIENT"}'),
  ('client2@test.local',  '{"full_name":"Colin Client"}',  '{"role":"CLIENT"}'),
  ('speaker@test.local',  '{"full_name":"Sipho Speaker"}', '{"role":"SPEAKER"}'),
  ('speaker2@test.local', '{"full_name":"Sara Speaker"}',  '{"role":"SPEAKER"}'),
  ('admin@test.local',    '{"full_name":"Ada Admin"}',     '{"role":"ADMIN"}');

UPDATE public.profiles SET phone = '+27 82 000 0000', company = 'Private Co';

-- Signup may already have created the speaker rows; make them bookable either way.
INSERT INTO public.speaker_profiles (user_id, title, bio, speaking_fee_zar, status, location)
SELECT id, 'Keynote', 'Bio', 50000, 'ACTIVE', 'Cape Town' FROM auth.users
WHERE email IN ('speaker@test.local', 'speaker2@test.local')
ON CONFLICT (user_id) DO UPDATE SET title = EXCLUDED.title, bio = EXCLUDED.bio,
  speaking_fee_zar = EXCLUDED.speaking_fee_zar, status = 'ACTIVE', location = EXCLUDED.location;

INSERT INTO public.bookings (client_id, speaker_id, event_name, audience_demographics,
  exact_location, event_organiser, associated_company, event_date, event_format,
  quoted_fee_zar, status)
VALUES (tests.uid('client'), tests.speaker_profile_id('speaker'), 'Summit', 'Execs',
  'Sandton', 'Cara', 'Acme', CURRENT_DATE + 30, 'in-person', 50000, 'PENDING');
