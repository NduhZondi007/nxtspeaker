-- ============================================================
-- Booking status: add PAID, gate completion on payment
-- ============================================================
-- Under escrow, CONFIRMED means "the speaker accepted, the client owes money"
-- and PAID means "the money is in NxtSpeaker's account". Only the verified
-- webhook may make that transition.
--
-- Why a new value rather than reusing DEPOSIT_PAID:
--   * DEPOSIT_PAID means "part of the money arrived"; escrow means all of it
--     did. Its sibling column deposit_amount_zar has never been read or
--     written anywhere in src/.
--   * Reusing it would not avoid any work. The speaker's ability to
--     self-declare CONFIRMED -> DEPOSIT_PAID has to be removed either way,
--     which already touches this constraint, this trigger and the TypeScript
--     state machine. Reuse buys nothing and leaves a misleading label.
--
-- DEPOSIT_PAID is kept in the CHECK constraint so existing rows stay valid and
-- keep rendering, but it gets no outbound transition for any actor — it is now
-- a dead-end legacy value. Admins can still move such rows via
-- adminUpdateBookingStatus, which runs as the service role and is exempt below.
--
-- No AWAITING_PAYMENT status: CONFIRMED *is* "accepted, awaiting payment", and
-- the state of a checkout in flight belongs on payments.status, not here.
--
-- Chat: the messages INSERT policy (20260907182050) excludes
-- ('PENDING','DECLINED','CANCELLED'), so PAID permits chat automatically and
-- needs no change. This mirrors canChat() in src/lib/utils/booking.ts.
-- ============================================================

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'PENDING', 'CONFIRMED', 'PAID', 'DEPOSIT_PAID',
    'COMPLETED', 'CANCELLED', 'DECLINED'
  ));


-- ------------------------------------------------------------
-- enforce_booking_update_rules — transition block updated
-- ------------------------------------------------------------
-- Body is carried over verbatim from 20260907182050_rls-integrity-fixes.sql;
-- only the status transition rules at the end differ. Keep this function and
-- src/lib/utils/booking.ts in lockstep — they are two encodings of one machine.

CREATE OR REPLACE FUNCTION public.enforce_booking_update_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  acting_client  BOOLEAN;
  acting_speaker BOOLEAN;
BEGIN
  -- Service role (the payment webhook and admin Server Actions) and platform
  -- admins are unrestricted. CONFIRMED -> PAID is reachable ONLY through here.
  IF auth.uid() IS NULL
     OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN' THEN
    RETURN NEW;
  END IF;

  -- Identity columns and the agreed price are immutable after creation.
  IF NEW.id            IS DISTINCT FROM OLD.id
     OR NEW.booking_number IS DISTINCT FROM OLD.booking_number
     OR NEW.client_id  IS DISTINCT FROM OLD.client_id
     OR NEW.speaker_id IS DISTINCT FROM OLD.speaker_id
     OR NEW.quoted_fee_zar IS DISTINCT FROM OLD.quoted_fee_zar
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Booking identity and fee cannot be changed'
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

  -- A speaker responds to a request; they do not rewrite the organiser's
  -- event brief. Only status and internal_notes are theirs to change.
  --
  -- NOTE: this is a deny-list. Any column added to bookings in future is
  -- implicitly speaker-writable until it is listed here. That is why the
  -- escrow feature put every financial column in its own table rather than
  -- on bookings.
  IF acting_speaker AND NOT acting_client THEN
    IF NEW.event_name             IS DISTINCT FROM OLD.event_name
       OR NEW.audience_demographics IS DISTINCT FROM OLD.audience_demographics
       OR NEW.exact_location      IS DISTINCT FROM OLD.exact_location
       OR NEW.event_organiser     IS DISTINCT FROM OLD.event_organiser
       OR NEW.associated_company  IS DISTINCT FROM OLD.associated_company
       OR NEW.event_date          IS DISTINCT FROM OLD.event_date
       OR NEW.event_end_date      IS DISTINCT FROM OLD.event_end_date
       OR NEW.duration_minutes    IS DISTINCT FROM OLD.duration_minutes
       OR NEW.event_format        IS DISTINCT FROM OLD.event_format
       OR NEW.estimated_audience  IS DISTINCT FROM OLD.estimated_audience
       OR NEW.client_notes        IS DISTINCT FROM OLD.client_notes
       OR NEW.hospitality_rider_agreed IS DISTINCT FROM OLD.hospitality_rider_agreed
       OR NEW.hospitality_agreed_at    IS DISTINCT FROM OLD.hospitality_agreed_at THEN
      RAISE EXCEPTION 'A speaker cannot edit the event details of a booking'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Status transitions: mirror canSpeakerTransition / canClientCancel.
  IF acting_speaker THEN
    IF NOT (
      (OLD.status = 'PENDING' AND NEW.status IN ('CONFIRMED', 'DECLINED'))
      -- A speaker marks an event delivered only once the client's money is
      -- actually in the platform's account. CONFIRMED -> COMPLETED and
      -- CONFIRMED -> DEPOSIT_PAID are deliberately gone: under the old rules
      -- a speaker could close out an unpaid booking, and the platform would
      -- then owe them 85% of money it had never collected.
      OR (OLD.status = 'PAID' AND NEW.status = 'COMPLETED')
    ) THEN
      RAISE EXCEPTION 'Invalid booking status transition % -> % for a speaker', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- A client withdraws only before the money moves. Cancelling a PAID
    -- booking means refunding it, which is an admin action with a Yoco call
    -- behind it — not a one-click self-service transition.
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

DROP TRIGGER IF EXISTS enforce_booking_update_rules ON public.bookings;
CREATE TRIGGER enforce_booking_update_rules
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_update_rules();

-- Matches 20260907182321: trigger functions are not callable as RPCs.
REVOKE ALL ON FUNCTION public.enforce_booking_update_rules() FROM PUBLIC, anon, authenticated;
