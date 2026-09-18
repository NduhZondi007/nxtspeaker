-- ============================================================
-- Escrow payments — row level security
-- ============================================================
-- Posture: the payment tables are READ-ONLY to every human role. There are
-- deliberately NO INSERT/UPDATE/DELETE policies on payments, payouts or
-- webhook_events. RLS enabled with no write policy means only the service
-- role can write, which is exactly right — every write to these tables comes
-- from the verified webhook handler or an admin Server Action, both of which
-- use createServiceClient().
--
-- If a Supabase advisor later flags "table has RLS enabled but no policies"
-- for writes, that is the intended design. Do not "fix" it by adding one.
--
-- Admin checks read the JWT claim (auth.jwt() -> 'app_metadata' ->> 'role'),
-- never a subquery against profiles. 20260622194851 rewrote the policies that
-- way to break an infinite recursion and dropped the is_admin() helper; a
-- profiles subquery here would reintroduce it.
--
-- Note the WITH CHECK on the one writable policy below. 20260907182050 exists
-- because USING-only UPDATE policies let a row be rewritten into a state the
-- policy would never have permitted to be read.
-- ============================================================

ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_payout_details ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- payments — both parties to the booking may read; nobody may write
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Clients view payments on their bookings" ON public.payments;
CREATE POLICY "Clients view payments on their bookings"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id
        AND b.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Speakers view payments on their bookings" ON public.payments;
CREATE POLICY "Speakers view payments on their bookings"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.speaker_profiles sp ON sp.id = b.speaker_id
      WHERE b.id = payments.booking_id
        AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;
CREATE POLICY "Admins view all payments"
  ON public.payments FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');


-- ------------------------------------------------------------
-- payouts — a speaker sees what they are owed; admins see everything
-- ------------------------------------------------------------
-- Clients get no access at all: what the platform pays a speaker is not part
-- of the client's transaction.

DROP POLICY IF EXISTS "Speakers view own payouts" ON public.payouts;
CREATE POLICY "Speakers view own payouts"
  ON public.payouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.speaker_profiles sp
      WHERE sp.id = payouts.speaker_id
        AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view all payouts" ON public.payouts;
CREATE POLICY "Admins view all payouts"
  ON public.payouts FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');


-- ------------------------------------------------------------
-- webhook_events — admin diagnostics only
-- ------------------------------------------------------------
-- Raw provider payloads. No speaker or client has any reason to read these.

DROP POLICY IF EXISTS "Admins view webhook events" ON public.webhook_events;
CREATE POLICY "Admins view webhook events"
  ON public.webhook_events FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');


-- ------------------------------------------------------------
-- speaker_payout_details — owner writes, owner and admin read
-- ------------------------------------------------------------
-- The only table in this migration a non-service role may write, because a
-- speaker maintains their own banking details. Note there is no policy giving
-- a CLIENT any access, and no anon grant.

DROP POLICY IF EXISTS "Speakers manage own payout details" ON public.speaker_payout_details;
CREATE POLICY "Speakers manage own payout details"
  ON public.speaker_payout_details FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.speaker_profiles sp
      WHERE sp.id = speaker_payout_details.speaker_id
        AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.speaker_profiles sp
      WHERE sp.id = speaker_payout_details.speaker_id
        AND sp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins view payout details" ON public.speaker_payout_details;
CREATE POLICY "Admins view payout details"
  ON public.speaker_payout_details FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');


-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
-- 20260907190000 showed that a missing/blanket grant is its own bug class.
-- Be explicit: authenticated users get SELECT (RLS then narrows it to their
-- own rows), and only speaker_payout_details is writable by them.

REVOKE ALL ON public.payments               FROM anon, authenticated;
REVOKE ALL ON public.payouts                FROM anon, authenticated;
REVOKE ALL ON public.webhook_events         FROM anon, authenticated;
REVOKE ALL ON public.speaker_payout_details FROM anon, authenticated;

GRANT SELECT ON public.payments       TO authenticated;
GRANT SELECT ON public.payouts        TO authenticated;
GRANT SELECT ON public.webhook_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.speaker_payout_details TO authenticated;
