-- ============================================================
-- Security hardening — findings from the 2026-10-05 audit
-- ============================================================
-- 20260907182050 locked down UPDATE on bookings / speaker_profiles / profiles
-- with BEFORE UPDATE triggers, but every INSERT path and several columns were
-- left open. PostgREST is reachable with the anon key plus any user's session
-- token, so a rule enforced only in a Server Action is not a rule. Each block
-- below closes one hole; supabase/tests/10_security.test.sql proves it.
-- ============================================================


-- ------------------------------------------------------------
-- 1. bookings INSERT: a client could insert status 'PAID' at R1 (C1)
-- ------------------------------------------------------------
-- "Clients can create bookings" checks only client_id and role. A forged
-- CONFIRMED/PAID/COMPLETED row skipped the speaker's acceptance, priced the
-- Yoco checkout at whatever fee the client chose, and unlocked "verified"
-- reviews. The server-side fee and status now come from the database, not the
-- caller. Values are coerced rather than rejected so createBooking keeps
-- working unchanged.

CREATE OR REPLACE FUNCTION public.enforce_booking_insert_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_fee NUMERIC(12,2);
BEGIN
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  SELECT sp.speaking_fee_zar INTO v_fee
    FROM public.speaker_profiles sp
   WHERE sp.id = NEW.speaker_id
     AND sp.status = 'ACTIVE'
     AND sp.user_id <> auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This speaker is not currently accepting bookings'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.client_id          := auth.uid();
  NEW.status             := 'PENDING';
  NEW.quoted_fee_zar     := v_fee;
  NEW.deposit_amount_zar := NULL;
  NEW.internal_notes     := NULL;
  NEW.hospitality_notes  := NULL;
  NEW.cancelled_reason   := NULL;
  NEW.created_at         := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_insert_rules ON public.bookings;
CREATE TRIGGER enforce_booking_insert_rules
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_insert_rules();

REVOKE ALL ON FUNCTION public.enforce_booking_insert_rules() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 2. speaker_profiles: anyone could create (or delete) a speaker (H1)
-- ------------------------------------------------------------
-- "Speakers can insert own profile" only checked p.id = user_id, so a CLIENT
-- could insert an ACTIVE speaker row with avg_rating 5 and appear in
-- discovery. The admin FOR ALL policy's `user_id = auth.uid() OR admin`
-- also handed every owner DELETE. Signup and adminCreateSpeaker both create
-- speaker rows with the service role, so no user-facing INSERT is needed.

DROP POLICY IF EXISTS "Speakers can insert own profile" ON public.speaker_profiles;
DROP POLICY IF EXISTS "Admins can manage all speaker profiles" ON public.speaker_profiles;

CREATE POLICY "Admins manage speaker profiles"
  ON public.speaker_profiles FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN');

-- The dropped FOR ALL policy was also how a deactivated speaker could still
-- read their own row; "Anyone authenticated can view active speakers" only
-- covers ACTIVE ones.
CREATE POLICY "Speakers view own profile"
  ON public.speaker_profiles FOR SELECT
  USING (user_id = auth.uid());


-- ------------------------------------------------------------
-- 3. profiles / speaker_profiles: email and media URLs (L1)
-- ------------------------------------------------------------
-- profiles.email is the address admins search by; it is synced from
-- auth.users by the service role and must not be user-editable. Avatar and
-- portfolio URLs are validated in updateSpeakerProfile, but PostgREST let a
-- user store any URL. Both must point into the caller's own storage folder.

CREATE OR REPLACE FUNCTION public.is_own_storage_url(p_url TEXT, p_bucket TEXT, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_url ~ ('^https://[^/]+/storage/v1/object/public/' || p_bucket || '/'
                  || p_uid::text || '/[^/]+$')
     AND p_url !~ '\.\.'
$$;

REVOKE ALL ON FUNCTION public.is_own_storage_url(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- auth.uid() is NULL for the service role (admin Server Actions), which is
  -- the sanctioned path for changing a role or syncing the email.
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Role cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.base_role IS DISTINCT FROM OLD.base_role THEN
    RAISE EXCEPTION 'Base role cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile id cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email is managed by your account settings'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
     AND NEW.avatar_url IS NOT NULL
     AND NOT public.is_own_storage_url(NEW.avatar_url, 'speaker-avatars', OLD.id) THEN
    RAISE EXCEPTION 'Avatar must be an image you uploaded'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_speaker_profile_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- refresh_speaker_stats() recomputes avg_rating/total_events from a trigger
  -- fired by another user's session; see 20260907182050 for why this flag
  -- exists and why it is safe.
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

  IF NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     AND EXISTS (
       -- Only newly added URLs are checked, so a legacy entry never blocks
       -- the speaker from removing or reordering photos.
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


-- ------------------------------------------------------------
-- 4. speaker_payout_details: a speaker could self-verify (L2)
-- ------------------------------------------------------------
-- saveSpeakerPayoutDetails clears verified_at/verified_by on every save, but
-- the FOR ALL policy let a direct PATCH set them. Any non-admin write now
-- resets verification — an admin confirmed the previous account, not this one.

CREATE OR REPLACE FUNCTION public.enforce_payout_details_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  NEW.verified_at := NULL;
  NEW.verified_by := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_payout_details_rules ON public.speaker_payout_details;
CREATE TRIGGER enforce_payout_details_rules
  BEFORE INSERT OR UPDATE ON public.speaker_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payout_details_rules();

REVOKE ALL ON FUNCTION public.enforce_payout_details_rules() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 5. bookings UPDATE: from a deny-list to an allow-list (L3)
-- ------------------------------------------------------------
-- The old rule pinned identity and fee, and stopped only the SPEAKER from
-- editing the brief. A client could still move the event date or venue of a
-- PAID booking, and both parties could write internal_notes and the other
-- admin columns. Now:
--   * admin-only columns are admin-only;
--   * the event brief is editable by the client while PENDING, by nobody after;
--   * cancelled_reason is set only together with a cancel/decline.

CREATE OR REPLACE FUNCTION public.enforce_booking_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acting_client  BOOLEAN;
  acting_speaker BOOLEAN;
  brief_changed  BOOLEAN;
BEGIN
  -- Service role (the payment webhook and admin Server Actions) and platform
  -- admins are unrestricted. CONFIRMED -> PAID is reachable ONLY through here.
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.booking_number IS DISTINCT FROM OLD.booking_number
     OR NEW.client_id  IS DISTINCT FROM OLD.client_id
     OR NEW.speaker_id IS DISTINCT FROM OLD.speaker_id
     OR NEW.quoted_fee_zar IS DISTINCT FROM OLD.quoted_fee_zar
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Booking identity and fee cannot be changed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.internal_notes        IS DISTINCT FROM OLD.internal_notes
     OR NEW.deposit_amount_zar IS DISTINCT FROM OLD.deposit_amount_zar
     OR NEW.hospitality_notes  IS DISTINCT FROM OLD.hospitality_notes THEN
    RAISE EXCEPTION 'Only the platform can change these booking fields'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  acting_client := OLD.client_id = auth.uid();
  acting_speaker := EXISTS (
    SELECT 1 FROM public.speaker_profiles sp
    WHERE sp.id = OLD.speaker_id AND sp.user_id = auth.uid()
  );

  IF NOT (acting_client OR acting_speaker) THEN
    RAISE EXCEPTION 'Not a party to this booking'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  brief_changed :=
       NEW.event_name               IS DISTINCT FROM OLD.event_name
    OR NEW.audience_demographics    IS DISTINCT FROM OLD.audience_demographics
    OR NEW.exact_location           IS DISTINCT FROM OLD.exact_location
    OR NEW.event_organiser          IS DISTINCT FROM OLD.event_organiser
    OR NEW.associated_company       IS DISTINCT FROM OLD.associated_company
    OR NEW.event_date               IS DISTINCT FROM OLD.event_date
    OR NEW.event_end_date           IS DISTINCT FROM OLD.event_end_date
    OR NEW.duration_minutes         IS DISTINCT FROM OLD.duration_minutes
    OR NEW.event_format             IS DISTINCT FROM OLD.event_format
    OR NEW.estimated_audience       IS DISTINCT FROM OLD.estimated_audience
    OR NEW.client_notes             IS DISTINCT FROM OLD.client_notes
    OR NEW.hospitality_rider_agreed IS DISTINCT FROM OLD.hospitality_rider_agreed
    OR NEW.hospitality_agreed_at    IS DISTINCT FROM OLD.hospitality_agreed_at;

  IF brief_changed THEN
    IF NOT acting_client THEN
      RAISE EXCEPTION 'A speaker cannot edit the event details of a booking'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    -- Once the speaker has accepted, the brief is what they agreed to.
    IF OLD.status <> 'PENDING' THEN
      RAISE EXCEPTION 'Event details are locked once the speaker has responded'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.cancelled_reason IS DISTINCT FROM OLD.cancelled_reason
     AND NOT (NEW.status IN ('CANCELLED', 'DECLINED')
              AND NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'A reason can only be given when cancelling or declining'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Status transitions: mirror canSpeakerTransition / canClientCancel.
  IF acting_speaker THEN
    IF NOT (
      (OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'DECLINED'))
      OR (OLD.status = 'PAID' AND NEW.status = 'COMPLETED')
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition % -> % for a speaker', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    IF NOT (
      NEW.status = 'CANCELLED'
      AND OLD.status IN ('PENDING', 'CONFIRMED')
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition % -> % for a client', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- 6. payouts: only a DUE payout past its hold can be paid (M1)
-- ------------------------------------------------------------
-- markPayoutPaid refused only PAID and CANCELLED, so a PENDING payout (event
-- not delivered) or an ON_HOLD one (dispute open) could be marked paid. This
-- applies to the service role too: it is a money invariant, not a permission.

CREATE OR REPLACE FUNCTION public.guard_payout_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'PAID' AND OLD.status IS DISTINCT FROM 'PAID'
     AND (OLD.status <> 'DUE' OR OLD.available_at IS NULL OR OLD.available_at > NOW()) THEN
    RAISE EXCEPTION 'Payout is not payable yet (status %, available %)', OLD.status, OLD.available_at
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_payout_paid ON public.payouts;
CREATE TRIGGER guard_payout_paid
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.guard_payout_paid();

REVOKE ALL ON FUNCTION public.guard_payout_paid() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- 7. record_successful_payment: only open payments, only open bookings (M1)
-- ------------------------------------------------------------
-- Two gaps in 20260918120300:
--   * any non-SUCCEEDED payment advanced, so a later success event could turn
--     a REFUNDED or FAILED payment back into SUCCEEDED;
--   * the payout was inserted even when the booking did not advance (client
--     cancelled while the checkout was open), creating an obligation to pay a
--     speaker for a cancelled event that nothing would ever close.
-- Money that arrives where it should not is parked as NEEDS_REVIEW — it is
-- real money and must be refunded or reconciled by a human, never dropped.

CREATE OR REPLACE FUNCTION public.record_successful_payment(
  p_payment_id          UUID,
  p_provider_payment_id TEXT,
  p_event_id            UUID,
  p_amount_cents        BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
    FROM public.payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'payment_not_found');
  END IF;

  -- Idempotent redelivery.
  IF v_payment.status = 'SUCCEEDED' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_succeeded');
  END IF;

  -- Already resolved by a human or a refund: never resurrect.
  IF v_payment.status IN ('REFUNDED', 'NEEDS_REVIEW') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_open:' || v_payment.status);
  END IF;

  -- We gave up on this checkout (timeout, abandoned) but the client paid it
  -- anyway. Real money: flag it.
  IF v_payment.status IN ('FAILED', 'CANCELLED') THEN
    UPDATE public.payments
       SET status = 'NEEDS_REVIEW',
           provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
           failure_reason = format('success reported for a %s payment', v_payment.status),
           last_webhook_event_id = p_event_id
     WHERE id = p_payment_id;
    RETURN jsonb_build_object('applied', false, 'reason', 'late_success');
  END IF;

  IF p_amount_cents IS DISTINCT FROM v_payment.gross_amount_cents THEN
    UPDATE public.payments
       SET status = 'NEEDS_REVIEW',
           failure_reason = format(
             'amount mismatch: provider %s, expected %s',
             p_amount_cents, v_payment.gross_amount_cents
           ),
           last_webhook_event_id = p_event_id
     WHERE id = p_payment_id;

    RETURN jsonb_build_object('applied', false, 'reason', 'amount_mismatch');
  END IF;

  -- Lock the booking and advance it only from CONFIRMED.
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = v_payment.booking_id
     FOR UPDATE;

  IF v_booking.status IS DISTINCT FROM 'CONFIRMED' THEN
    UPDATE public.payments
       SET status = 'NEEDS_REVIEW',
           provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
           failure_reason = format('payment arrived for a %s booking — refund or reconcile',
                                   COALESCE(v_booking.status, 'missing')),
           last_webhook_event_id = p_event_id
     WHERE id = p_payment_id;
    RETURN jsonb_build_object('applied', false, 'reason', 'booking_not_confirmed');
  END IF;

  UPDATE public.payments
     SET status = 'SUCCEEDED',
         provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
         succeeded_at = NOW(),
         last_webhook_event_id = p_event_id
   WHERE id = p_payment_id;

  UPDATE public.bookings SET status = 'PAID' WHERE id = v_booking.id;

  INSERT INTO public.payouts (
    speaker_id, booking_id, payment_id, amount_cents, status, bank_snapshot
  )
  VALUES (
    v_booking.speaker_id,
    v_booking.id,
    v_payment.id,
    v_payment.speaker_amount_cents,
    'PENDING',
    (SELECT to_jsonb(d) - 'created_at' - 'updated_at'
       FROM public.speaker_payout_details d
      WHERE d.speaker_id = v_booking.speaker_id)
  )
  ON CONFLICT (payment_id) DO NOTHING;

  RETURN jsonb_build_object('applied', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_successful_payment(UUID, TEXT, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;
