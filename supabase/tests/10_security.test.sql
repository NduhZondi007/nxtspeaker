-- Security regression tests: each block is one attack (or one legitimate
-- path that must keep working), run as the user PostgREST would see.
-- Every block is its own transaction and rolls back, so they are independent.

-- ── Bookings: INSERT cannot forge status, fee or parties (audit C1) ──────────

BEGIN;
SELECT tests.login('client');
SELECT tests.equals('client booking insert: forged status and fee are overridden',
  $q$WITH b AS (
       INSERT INTO public.bookings (client_id, speaker_id, event_name, audience_demographics,
         exact_location, event_organiser, associated_company, event_date, event_format,
         quoted_fee_zar, status, internal_notes)
       VALUES (auth.uid(), tests.speaker_profile_id('speaker'), 'Gala', 'All', 'Durban', 'Cara',
         'Acme', CURRENT_DATE + 40, 'in-person', 1, 'PAID', 'forged')
       RETURNING status || '/' || quoted_fee_zar || '/' || COALESCE(internal_notes, '-'))
     SELECT * FROM b$q$,
  'PENDING/50000.00/-');
ROLLBACK;

BEGIN;
UPDATE public.speaker_profiles SET status = 'INACTIVE' WHERE id = tests.speaker_profile_id('speaker2');
SELECT tests.login('client');
SELECT tests.denied('client cannot book an inactive speaker',
  $q$INSERT INTO public.bookings (client_id, speaker_id, event_name, audience_demographics,
       exact_location, event_organiser, associated_company, event_date, event_format, quoted_fee_zar)
     VALUES (auth.uid(), tests.speaker_profile_id('speaker2'), 'Gala', 'All', 'Durban', 'Cara',
       'Acme', CURRENT_DATE + 40, 'in-person', 50000)$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.equals('a booking always lands in the caller''s own name',
  $q$WITH b AS (
       INSERT INTO public.bookings (client_id, speaker_id, event_name, audience_demographics,
         exact_location, event_organiser, associated_company, event_date, event_format, quoted_fee_zar)
       VALUES (tests.uid('client2'), tests.speaker_profile_id('speaker'), 'Gala', 'All', 'Durban',
         'Cara', 'Acme', CURRENT_DATE + 40, 'in-person', 50000)
       RETURNING (client_id = tests.uid('client'))::text)
     SELECT * FROM b$q$, 'true');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.denied('a speaker cannot create bookings',
  $q$INSERT INTO public.bookings (client_id, speaker_id, event_name, audience_demographics,
       exact_location, event_organiser, associated_company, event_date, event_format, quoted_fee_zar)
     VALUES (auth.uid(), tests.speaker_profile_id('speaker2'), 'Gala', 'All', 'Durban', 'Sipho',
       'Acme', CURRENT_DATE + 40, 'in-person', 50000)$q$);
ROLLBACK;

-- ── Speaker profiles: no self-created or self-deleted speakers (audit H1) ────

BEGIN;
SELECT tests.login('client');
SELECT tests.denied('a client cannot create a speaker profile for themselves',
  $q$INSERT INTO public.speaker_profiles (user_id, title, status, avg_rating, total_events)
     VALUES (auth.uid(), 'Fake', 'ACTIVE', 5, 500)$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker2');
SELECT tests.equals('a speaker cannot delete their own speaker profile',
  $q$WITH d AS (DELETE FROM public.speaker_profiles WHERE user_id = auth.uid() RETURNING 1)
     SELECT count(*)::text FROM d$q$,
  '0');
ROLLBACK;

BEGIN;
UPDATE public.speaker_profiles SET status = 'INACTIVE' WHERE id = tests.speaker_profile_id('speaker');
SELECT tests.login('speaker');
SELECT tests.equals('a deactivated speaker can still read their own profile',
  $q$SELECT count(*)::text FROM public.speaker_profiles WHERE user_id = auth.uid()$q$, '1');
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.allowed('a speaker can still edit their own bio',
  $q$UPDATE public.speaker_profiles SET bio = 'New bio' WHERE user_id = auth.uid()$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.denied('a speaker cannot inflate their own rating',
  $q$UPDATE public.speaker_profiles SET avg_rating = 5 WHERE user_id = auth.uid()$q$);
ROLLBACK;

-- ── Profiles: identity and media fields (audit L1) ───────────────────────────

BEGIN;
SELECT tests.login('client');
SELECT tests.denied('a user cannot change their profile email directly',
  $q$UPDATE public.profiles SET email = 'ceo@victim.co.za' WHERE id = auth.uid()$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.denied('avatar_url must point into the user''s own storage folder',
  $q$UPDATE public.profiles SET avatar_url = 'https://evil.example/x.png' WHERE id = auth.uid()$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.allowed('avatar_url in the user''s own folder is accepted',
  format($q$UPDATE public.profiles SET avatar_url =
    'https://abc.supabase.co/storage/v1/object/public/speaker-avatars/%s/a.png' WHERE id = auth.uid()$q$,
    tests.uid('client')), 1);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.allowed('a user can still change their name and phone',
  $q$UPDATE public.profiles SET full_name = 'Cara C', phone = '+27 82 111 1111' WHERE id = auth.uid()$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.denied('speaker photo_urls must point into the speaker''s own folder',
  $q$UPDATE public.speaker_profiles SET photo_urls = ARRAY['https://evil.example/x.png']
     WHERE user_id = auth.uid()$q$);
ROLLBACK;

BEGIN;
UPDATE public.speaker_profiles SET photo_urls = ARRAY['https://legacy.example/old.png',
  format('https://abc.supabase.co/storage/v1/object/public/speaker-photos/%s/a.png', tests.uid('speaker'))]
  WHERE user_id = tests.uid('speaker');
SELECT tests.login('speaker');
SELECT tests.allowed('a legacy photo URL does not block removing another photo',
  $q$UPDATE public.speaker_profiles SET photo_urls = ARRAY['https://legacy.example/old.png']
     WHERE user_id = auth.uid()$q$, 1);
ROLLBACK;

-- ── Payout details: a speaker cannot self-verify (audit L2) ──────────────────

BEGIN;
SELECT tests.login('speaker');
SELECT tests.equals('a speaker cannot mark their own bank details verified',
  $q$WITH d AS (
       INSERT INTO public.speaker_payout_details (speaker_id, account_holder, bank_name,
         account_number, branch_code, account_type, verified_at, verified_by)
       VALUES (tests.speaker_profile_id('speaker'), 'Sipho', 'FNB', '62000000000', '250655',
         'CHEQUE', NOW(), auth.uid())
       RETURNING COALESCE(verified_at::text, 'unverified'))
     SELECT * FROM d$q$,
  'unverified');
ROLLBACK;

-- ── Bookings: UPDATE column allow-list (audit L3) ────────────────────────────

BEGIN;
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
SELECT tests.login('client');
SELECT tests.denied('a client cannot move the event date once the speaker has accepted',
  $q$UPDATE public.bookings SET event_date = CURRENT_DATE + 90 WHERE event_name = 'Summit'$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.allowed('a client can still edit a PENDING request',
  $q$UPDATE public.bookings SET client_notes = 'Parking at gate 3' WHERE event_name = 'Summit'$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.denied('a client cannot write admin-only internal notes',
  $q$UPDATE public.bookings SET internal_notes = 'x' WHERE event_name = 'Summit'$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.denied('a speaker cannot write admin-only internal notes',
  $q$UPDATE public.bookings SET internal_notes = 'x' WHERE event_name = 'Summit'$q$);
ROLLBACK;

BEGIN;
SELECT tests.login('client');
SELECT tests.allowed('a client can cancel a PENDING request with a reason',
  $q$UPDATE public.bookings SET status = 'CANCELLED', cancelled_reason = 'Budget'
     WHERE event_name = 'Summit'$q$, 1);
ROLLBACK;

BEGIN;
SELECT tests.login('speaker');
SELECT tests.allowed('a speaker can still accept a request',
  $q$UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit'$q$, 1);
ROLLBACK;

-- ── Payouts and payment recording (audit M1) ─────────────────────────────────
-- Run as the superuser with no JWT: the same position as the service role.

BEGIN;
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000a1', id, 5000000, 1500, 750000, 4250000, 'PENDING', 'k1'
FROM public.bookings WHERE event_name = 'Summit';
SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000a1', 'p1', NULL, 5000000);
SELECT tests.denied('a PENDING payout cannot be marked paid',
  $q$UPDATE public.payouts SET status = 'PAID', marked_paid_by = tests.uid('admin'),
       marked_paid_at = NOW(), eft_reference = 'EFT1'
     WHERE payment_id = '00000000-0000-0000-0000-0000000000a1'$q$);
ROLLBACK;

BEGIN;
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000a2', id, 5000000, 1500, 750000, 4250000, 'PENDING', 'k2'
FROM public.bookings WHERE event_name = 'Summit';
SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000a2', 'p2', NULL, 5000000);
UPDATE public.payouts SET status = 'DUE', available_at = NOW() - INTERVAL '1 day'
  WHERE payment_id = '00000000-0000-0000-0000-0000000000a2';
SELECT tests.allowed('a DUE payout past its hold can be marked paid',
  $q$UPDATE public.payouts SET status = 'PAID', marked_paid_by = tests.uid('admin'),
       marked_paid_at = NOW(), eft_reference = 'EFT2'
     WHERE payment_id = '00000000-0000-0000-0000-0000000000a2'$q$, 1);
ROLLBACK;

BEGIN;
-- The client cancelled while a checkout was still open, then paid anyway.
UPDATE public.bookings SET status = 'CANCELLED' WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000a3', id, 5000000, 1500, 750000, 4250000, 'PENDING', 'k3'
FROM public.bookings WHERE event_name = 'Summit';
SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000a3', 'p3', NULL, 5000000);
SELECT tests.equals('money landing on a cancelled booking creates no payout',
  $q$SELECT count(*)::text FROM public.payouts
     WHERE payment_id = '00000000-0000-0000-0000-0000000000a3'$q$, '0');
SELECT tests.equals('…and is parked for review rather than marked a clean success',
  $q$SELECT status FROM public.payments WHERE id = '00000000-0000-0000-0000-0000000000a3'$q$,
  'NEEDS_REVIEW');
ROLLBACK;

BEGIN;
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000a4', id, 5000000, 1500, 750000, 4250000, 'REFUNDED', 'k4'
FROM public.bookings WHERE event_name = 'Summit';
SELECT tests.equals('a late success event cannot resurrect a refunded payment',
  $q$SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000a4', 'p4', NULL,
       5000000)->>'applied'$q$, 'false');
ROLLBACK;

BEGIN;
UPDATE public.bookings SET status = 'CONFIRMED' WHERE event_name = 'Summit';
INSERT INTO public.payments (id, booking_id, gross_amount_cents, commission_rate_bps,
  commission_amount_cents, speaker_amount_cents, status, idempotency_key)
SELECT '00000000-0000-0000-0000-0000000000a5', id, 5000000, 1500, 750000, 4250000, 'PENDING', 'k5'
FROM public.bookings WHERE event_name = 'Summit';
SELECT tests.equals('the happy path still applies the payment',
  $q$SELECT public.record_successful_payment('00000000-0000-0000-0000-0000000000a5', 'p5', NULL,
       5000000)->>'applied'$q$, 'true');
SELECT tests.equals('…moves the booking to PAID and opens a PENDING payout',
  $q$SELECT (SELECT status FROM public.bookings WHERE event_name = 'Summit') || '/' ||
       (SELECT status FROM public.payouts WHERE payment_id = '00000000-0000-0000-0000-0000000000a5')$q$,
  'PAID/PENDING');
ROLLBACK;
