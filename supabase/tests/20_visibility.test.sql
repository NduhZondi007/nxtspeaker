-- Visibility matrix: who can read and write what. These pin CURRENT behaviour
-- so that performance rewrites of the policies (20261005130000) are provably
-- behaviour-preserving. Fixture: client <-> speaker share one CONFIRMED
-- booking with one message, one payment and one payout; client2 and speaker2
-- are strangers to it.

-- Shared fixture for this file, committed once (rolled-back blocks below
-- never touch it destructively).
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
INSERT INTO public.messages (booking_id, sender_id, content)
SELECT id, tests.uid('client'), 'Hello' FROM public.bookings WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000b1', id, 5000000, 1500, 750000, 4250000, 'PENDING', 'vis1'
FROM public.bookings WHERE event_name = 'Summit';
SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000b1', 'pv1', NULL, 5000000);
INSERT INTO public.speaker_payout_details (speaker_id, account_holder, bank_name, account_number,
  branch_code, account_type)
VALUES (tests.speaker_profile_id('speaker'), 'Sipho', 'FNB', '62000000000', '250655', 'CHEQUE');
INSERT INTO public.hospitality_riders (speaker_id)
SELECT tests.speaker_profile_id('speaker')
WHERE NOT EXISTS (SELECT 1 FROM public.hospitality_riders WHERE speaker_id = tests.speaker_profile_id('speaker'));

-- One helper per (user, query, expected count).
CREATE OR REPLACE FUNCTION tests.sees(p_user TEXT, p_what TEXT, p_sql TEXT, p_expected INT)
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

-- ── bookings ─────────────────────────────────────────────────────────────────
BEGIN;
SELECT tests.sees('client',   'the shared booking', $$SELECT 1 FROM public.bookings WHERE event_name = 'Summit'$$, 1);
SELECT tests.sees('speaker',  'the shared booking', $$SELECT 1 FROM public.bookings WHERE event_name = 'Summit'$$, 1);
SELECT tests.sees('admin',    'the shared booking', $$SELECT 1 FROM public.bookings WHERE event_name = 'Summit'$$, 1);
SELECT tests.sees('client2',  'the shared booking', $$SELECT 1 FROM public.bookings WHERE event_name = 'Summit'$$, 0);
SELECT tests.sees('speaker2', 'the shared booking', $$SELECT 1 FROM public.bookings WHERE event_name = 'Summit'$$, 0);
ROLLBACK;

-- ── messages ─────────────────────────────────────────────────────────────────
BEGIN;
SELECT tests.sees('client',   'the thread', $$SELECT 1 FROM public.messages$$, 1);
SELECT tests.sees('speaker',  'the thread', $$SELECT 1 FROM public.messages$$, 1);
SELECT tests.sees('admin',    'the thread', $$SELECT 1 FROM public.messages$$, 1);
SELECT tests.sees('client2',  'the thread', $$SELECT 1 FROM public.messages$$, 0);
SELECT tests.sees('speaker2', 'the thread', $$SELECT 1 FROM public.messages$$, 0);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.allowed('the speaker can reply on a paid booking',
  $q$INSERT INTO public.messages (booking_id, sender_id, content)
     SELECT id, auth.uid(), 'Hi' FROM public.bookings WHERE event_name = 'Summit'$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker2');
SELECT tests.denied('a stranger cannot post into the thread',
  $q$INSERT INTO public.messages (booking_id, sender_id, content)
     VALUES ((SELECT b.id FROM public.bookings b LIMIT 0), auth.uid(), 'x')$q$);
ROLLBACK;

BEGIN;
-- speaker2 cannot read the booking id, so feed it in as the superuser would know it.
SELECT set_config('tests.booking', (SELECT id::text FROM public.bookings WHERE event_name = 'Summit'), true);
SELECT tests.login('speaker2');
SELECT tests.denied('a stranger cannot post into a thread by id',
  $q$INSERT INTO public.messages (booking_id, sender_id, content)
     VALUES (current_setting('tests.booking')::uuid, auth.uid(), 'x')$q$);
ROLLBACK;

BEGIN;
SELECT set_config('tests.booking', (SELECT id::text FROM public.bookings WHERE event_name = 'Summit'), true);
SELECT tests.login('client');
SELECT tests.denied('nobody can post as someone else',
  $q$INSERT INTO public.messages (booking_id, sender_id, content)
     VALUES (current_setting('tests.booking')::uuid, tests.uid('speaker'), 'spoof')$q$);
ROLLBACK;

-- ── profiles ─────────────────────────────────────────────────────────────────
BEGIN;
SELECT tests.sees('speaker',  'the client who booked them', $$SELECT 1 FROM public.profiles WHERE email = 'client@test.local'$$, 1);
SELECT tests.sees('client',   'their speaker',              $$SELECT 1 FROM public.profiles WHERE email = 'speaker@test.local'$$, 1);
SELECT tests.sees('speaker2', 'an unrelated client',        $$SELECT 1 FROM public.profiles WHERE email = 'client@test.local'$$, 0);
SELECT tests.sees('client2',  'another client',             $$SELECT 1 FROM public.profiles WHERE email = 'client@test.local'$$, 0);
SELECT tests.sees('admin',    'every profile',              $$SELECT 1 FROM public.profiles$$, 5);
SELECT tests.sees('client2',  'their own profile',          $$SELECT 1 FROM public.profiles WHERE email = 'client2@test.local'$$, 1);
ROLLBACK;

-- ── payments / payouts / payout details ─────────────────────────────────────
BEGIN;
SELECT tests.sees('client',   'the payment', $$SELECT 1 FROM public.payments$$, 1);
SELECT tests.sees('speaker',  'the payment', $$SELECT 1 FROM public.payments$$, 1);
SELECT tests.sees('admin',    'the payment', $$SELECT 1 FROM public.payments$$, 1);
SELECT tests.sees('client2',  'the payment', $$SELECT 1 FROM public.payments$$, 0);
SELECT tests.sees('speaker2', 'the payment', $$SELECT 1 FROM public.payments$$, 0);
SELECT tests.sees('speaker',  'their payout', $$SELECT 1 FROM public.payouts$$, 1);
SELECT tests.sees('admin',    'the payout',   $$SELECT 1 FROM public.payouts$$, 1);
SELECT tests.sees('client',   'the payout',   $$SELECT 1 FROM public.payouts$$, 0);
SELECT tests.sees('speaker2', 'the payout',   $$SELECT 1 FROM public.payouts$$, 0);
SELECT tests.sees('speaker',  'their bank details', $$SELECT 1 FROM public.speaker_payout_details$$, 1);
SELECT tests.sees('speaker2', 'another speaker''s bank details', $$SELECT 1 FROM public.speaker_payout_details$$, 0);
SELECT tests.sees('admin',    'bank details', $$SELECT 1 FROM public.speaker_payout_details$$, 1);
SELECT tests.sees('client',   'bank details', $$SELECT 1 FROM public.speaker_payout_details$$, 0);
ROLLBACK;

-- ── speaker-owned rows: own yes, others no ───────────────────────────────────
BEGIN;
SELECT tests.login('speaker');
SELECT tests.allowed('a speaker edits their own rider',
  $q$UPDATE public.hospitality_riders SET additional_requests = 'Water'
     WHERE speaker_id = tests.speaker_profile_id('speaker')$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker2');
SELECT tests.equals('a speaker cannot edit another speaker''s rider',
  $q$WITH u AS (UPDATE public.hospitality_riders SET additional_requests = 'x'
       WHERE speaker_id = tests.speaker_profile_id('speaker') RETURNING 1)
     SELECT count(*)::text FROM u$q$, '0');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker2');
SELECT tests.equals('a speaker cannot edit another speaker''s profile',
  $q$WITH u AS (UPDATE public.speaker_profiles SET bio = 'x'
       WHERE id = tests.speaker_profile_id('speaker') RETURNING 1)
     SELECT count(*)::text FROM u$q$, '0');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker2');
SELECT tests.equals('a speaker cannot change another speaker''s bank details',
  $q$WITH u AS (UPDATE public.speaker_payout_details SET bank_name = 'x'
       WHERE speaker_id = tests.speaker_profile_id('speaker') RETURNING 1)
     SELECT count(*)::text FROM u$q$, '0');
ROLLBACK;

BEGIN;
SELECT tests.login('client2');
SELECT tests.equals('a stranger cannot update someone else''s booking',
  $q$WITH u AS (UPDATE public.bookings SET client_notes = 'x'
       WHERE event_name = 'Summit' RETURNING 1)
     SELECT count(*)::text FROM u$q$, '0');
ROLLBACK;

-- ── anonymous callers see nothing private and do not error ──────────────────
BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
SELECT tests.equals('anon sees no bookings',  $q$SELECT count(*)::text FROM public.bookings$q$, '0');
SELECT tests.equals('anon sees no profiles',  $q$SELECT count(*)::text FROM public.profiles$q$, '0');
SELECT tests.equals('anon sees no messages',  $q$SELECT count(*)::text FROM public.messages$q$, '0');
SELECT tests.denied('anon cannot query payments at all', $q$SELECT count(*) FROM public.payments$q$);
ROLLBACK;

-- ── admin_money_totals() ─────────────────────────────────────────────────────
BEGIN;
SELECT tests.equals('admin_money_totals sums the paid booking',
  $q$SELECT concat_ws('/', collected, commission, refunded, owed, payouts_open, payouts_paid)
     FROM public.admin_money_totals()$q$, '5000000/750000/0/4250000/0/0');
ROLLBACK;

BEGIN;
SELECT tests.login('admin');
SELECT tests.denied('admin_money_totals is not callable with a user session',
  $q$SELECT * FROM public.admin_money_totals()$q$);
ROLLBACK;
