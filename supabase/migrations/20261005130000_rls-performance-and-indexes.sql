-- ============================================================
-- RLS performance, missing indexes, admin money totals
-- ============================================================
-- Behaviour-preserving: supabase/tests/20_visibility.test.sql pins who can
-- read and write what, and passes identically before and after this file.
--
-- Why the policies were slow:
--   * `auth.uid()` written bare in a policy is evaluated per row. Wrapped as
--     `(select auth.uid())` Postgres plans it once per statement (InitPlan).
--   * "is this my speaker profile?" was a correlated EXISTS against
--     speaker_profiles for every bookings/payments/payouts/messages row.
--     my_speaker_profile_id() answers it once per statement instead.
--   * shares_booking_with(profiles.id) ran per profiles row, and its OR across
--     a join could not use the bookings indexes. Embedded `profiles(...)`
--     joins and admin user lists paid for it on every row.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Helpers
-- ------------------------------------------------------------
-- SECURITY DEFINER so they do not recurse through speaker_profiles / bookings
-- RLS. Both only ever return rows about the caller. EXECUTE is granted to
-- anon as well: policies are evaluated for anonymous requests too, and a
-- function anon cannot execute turns every anon query into an error (the
-- lesson of 20260907190000).

CREATE OR REPLACE FUNCTION public.my_speaker_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.speaker_profiles WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.my_booking_counterparty_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Clients who booked me (as a speaker)…
  SELECT b.client_id
    FROM public.bookings b
    JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
   WHERE sp.user_id = auth.uid()
  UNION
  -- …and speakers I booked (as a client).
  SELECT sp.user_id
    FROM public.bookings b
    JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
   WHERE b.client_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_speaker_profile_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_booking_counterparty_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_speaker_profile_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_booking_counterparty_ids() TO anon, authenticated, service_role;


-- ------------------------------------------------------------
-- 2. bookings
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Clients view own bookings" ON public.bookings;
CREATE POLICY "Clients view own bookings" ON public.bookings FOR SELECT
  USING (client_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Speakers view their booking requests" ON public.bookings;
CREATE POLICY "Speakers view their booking requests" ON public.bookings FOR SELECT
  USING (speaker_id = (SELECT public.my_speaker_profile_id()));

DROP POLICY IF EXISTS "Clients and speakers can update their bookings" ON public.bookings;
CREATE POLICY "Clients and speakers can update their bookings" ON public.bookings FOR UPDATE
  USING (client_id = (SELECT auth.uid())
         OR speaker_id = (SELECT public.my_speaker_profile_id()));

DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
CREATE POLICY "Clients can create bookings" ON public.bookings FOR INSERT
  WITH CHECK (
    client_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = (SELECT auth.uid()) AND p.role = 'CLIENT')
  );


-- ------------------------------------------------------------
-- 3. messages
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT
  USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
       WHERE b.client_id = (SELECT auth.uid())
          OR b.speaker_id = (SELECT public.my_speaker_profile_id())
    )
  );

DROP POLICY IF EXISTS "Participants can send messages when booking is open" ON public.messages;
CREATE POLICY "Participants can send messages when booking is open" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.id = messages.booking_id
         AND b.status NOT IN ('PENDING', 'DECLINED', 'CANCELLED')
         AND (b.client_id = (SELECT auth.uid())
              OR b.speaker_id = (SELECT public.my_speaker_profile_id()))
    )
  );


-- ------------------------------------------------------------
-- 4. payments / payouts / payout details
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Clients view payments on their bookings" ON public.payments;
CREATE POLICY "Clients view payments on their bookings" ON public.payments FOR SELECT
  USING (booking_id IN (SELECT b.id FROM public.bookings b
                         WHERE b.client_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Speakers view payments on their bookings" ON public.payments;
CREATE POLICY "Speakers view payments on their bookings" ON public.payments FOR SELECT
  USING (booking_id IN (SELECT b.id FROM public.bookings b
                         WHERE b.speaker_id = (SELECT public.my_speaker_profile_id())));

DROP POLICY IF EXISTS "Speakers view own payouts" ON public.payouts;
CREATE POLICY "Speakers view own payouts" ON public.payouts FOR SELECT
  USING (speaker_id = (SELECT public.my_speaker_profile_id()));

DROP POLICY IF EXISTS "Speakers manage own payout details" ON public.speaker_payout_details;
CREATE POLICY "Speakers manage own payout details" ON public.speaker_payout_details FOR ALL
  USING (speaker_id = (SELECT public.my_speaker_profile_id()))
  WITH CHECK (speaker_id = (SELECT public.my_speaker_profile_id()));


-- ------------------------------------------------------------
-- 5. speaker-owned rows
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Speaker can manage own rider" ON public.hospitality_riders;
CREATE POLICY "Speaker can manage own rider" ON public.hospitality_riders FOR ALL
  USING (speaker_id = (SELECT public.my_speaker_profile_id()));

DROP POLICY IF EXISTS "Authenticated users can view rider for active speakers" ON public.hospitality_riders;
CREATE POLICY "Authenticated users can view rider for active speakers" ON public.hospitality_riders FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.speaker_profiles sp
                 WHERE sp.id = hospitality_riders.speaker_id AND sp.status = 'ACTIVE')
  );

DROP POLICY IF EXISTS "Speakers can update own profile" ON public.speaker_profiles;
CREATE POLICY "Speakers can update own profile" ON public.speaker_profiles FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Speakers view own profile" ON public.speaker_profiles;
CREATE POLICY "Speakers view own profile" ON public.speaker_profiles FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anyone authenticated can view active speakers" ON public.speaker_profiles;
CREATE POLICY "Anyone authenticated can view active speakers" ON public.speaker_profiles FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL AND status = 'ACTIVE');


-- ------------------------------------------------------------
-- 6. profiles
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT
  USING (id = (SELECT auth.uid())
         OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'ADMIN');

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE
  USING (id = (SELECT auth.uid())
         OR ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'ADMIN');

-- The set is computed once per statement and probed by hash, instead of
-- shares_booking_with() running a two-way join for every profiles row.
DROP POLICY IF EXISTS "Booking counterparties can view each other" ON public.profiles;
CREATE POLICY "Booking counterparties can view each other" ON public.profiles FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL
         AND id IN (SELECT public.my_booking_counterparty_ids()));


-- ------------------------------------------------------------
-- 7. Indexes
-- ------------------------------------------------------------
-- reviews had no speaker_id index at all, yet Discover reads reviews by
-- speaker and refresh_speaker_stats() AVGs them on every review/booking change.
CREATE INDEX IF NOT EXISTS idx_reviews_speaker_created  ON public.reviews (speaker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer         ON public.reviews (reviewer_id);
-- Lists are "mine, newest first" or "all, newest first".
CREATE INDEX IF NOT EXISTS idx_bookings_client_created  ON public.bookings (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_speaker_created ON public.bookings (speaker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_created         ON public.bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_booking_created ON public.messages (booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_created         ON public.profiles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_created         ON public.payments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_created          ON public.payouts (created_at DESC);
-- Foreign key with no index: the completion/cancel trigger updates payouts by booking_id.
CREATE INDEX IF NOT EXISTS idx_payouts_booking          ON public.payouts (booking_id);
-- Discover: active speakers by rating.
CREATE INDEX IF NOT EXISTS idx_speaker_profiles_active_rating
  ON public.speaker_profiles (avg_rating DESC) WHERE status = 'ACTIVE';

-- Redundant: same column as UNIQUE(provider_checkout_id), or a prefix of a new index.
DROP INDEX IF EXISTS public.idx_payments_checkout;
DROP INDEX IF EXISTS public.idx_bookings_client;
DROP INDEX IF EXISTS public.idx_messages_booking;


-- ------------------------------------------------------------
-- 8. admin_money_totals()
-- ------------------------------------------------------------
-- The admin dashboard, payments and payouts pages summed money in JS over
-- `.limit(200)` / `.limit(300)` lists (or every row), so totals went silently
-- wrong once the platform passed a few hundred payments — the same bug class
-- as the 2026-09-18 "Platform Revenue" incident. One aggregate instead.
-- All figures are integer cents.
--   collected     gross of SUCCEEDED payments
--   commission    platform commission on SUCCEEDED payments
--   refunded      everything refunded, on any payment
--   owed          payouts not yet PAID or CANCELLED (PENDING + DUE + ON_HOLD)
--   payouts_open  payouts payable now: DUE and past the hold
--   payouts_paid  payouts already PAID
-- Service role only: called from admin pages that have already checked the role.

CREATE OR REPLACE FUNCTION public.admin_money_totals()
RETURNS TABLE (
  collected    BIGINT,
  commission   BIGINT,
  refunded     BIGINT,
  owed         BIGINT,
  payouts_open BIGINT,
  payouts_paid BIGINT
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    (SELECT COALESCE(SUM(gross_amount_cents)      FILTER (WHERE status = 'SUCCEEDED'), 0) FROM public.payments)::BIGINT,
    (SELECT COALESCE(SUM(commission_amount_cents) FILTER (WHERE status = 'SUCCEEDED'), 0) FROM public.payments)::BIGINT,
    (SELECT COALESCE(SUM(refunded_amount_cents), 0) FROM public.payments)::BIGINT,
    (SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status IN ('PENDING', 'DUE', 'ON_HOLD')), 0) FROM public.payouts)::BIGINT,
    (SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status = 'DUE' AND available_at <= NOW()), 0) FROM public.payouts)::BIGINT,
    (SELECT COALESCE(SUM(amount_cents) FILTER (WHERE status = 'PAID'), 0) FROM public.payouts)::BIGINT
$$;

REVOKE ALL ON FUNCTION public.admin_money_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_money_totals() TO service_role;
