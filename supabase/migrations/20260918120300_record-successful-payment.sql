-- ============================================================
-- Escrow payments — atomic ledger write and payout release
-- ============================================================
-- supabase-js cannot run a multi-statement transaction. Recording a payment
-- touches three tables (payments, bookings, payouts) and must be all-or-
-- nothing, so the webhook handler calls one SECURITY DEFINER function.
--
-- The function is also the amount re-verification point: the provider's
-- figure is compared against the amount we priced, inside the same locked
-- transaction that would advance the booking. A mismatch parks the payment
-- for human review instead of moving anything.
-- ============================================================


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
  v_speaker UUID;
BEGIN
  -- Lock the row. Concurrent redeliveries of the same event serialise here,
  -- which is what makes the already-succeeded short-circuit below reliable
  -- rather than a race.
  SELECT * INTO v_payment
    FROM public.payments
   WHERE id = p_payment_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'payment_not_found');
  END IF;

  -- Idempotent: a redelivery of an already-applied event is a no-op success,
  -- not an error. Yoco retries 8 times; this is the path most of them take.
  IF v_payment.status = 'SUCCEEDED' THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_succeeded');
  END IF;

  -- Never trust the provider's amount. It must match what we priced from the
  -- booking, or nothing moves.
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

  UPDATE public.payments
     SET status = 'SUCCEEDED',
         provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
         succeeded_at = NOW(),
         last_webhook_event_id = p_event_id
   WHERE id = p_payment_id;

  -- Advance the booking only from CONFIRMED. If it was cancelled or declined
  -- in the window between redirect and webhook, it stays where it is: the
  -- money genuinely arrived and the payment is still recorded, which leaves a
  -- SUCCEEDED payment on a non-CONFIRMED booking — precisely the "owes a
  -- refund" state the admin reconciliation view filters for.
  --
  -- This UPDATE still fires enforce_booking_update_rules(), but auth.uid() is
  -- NULL under the service role so it early-returns unrestricted. That is the
  -- sanctioned path, the same one adminUpdateBookingStatus uses.
  UPDATE public.bookings
     SET status = 'PAID'
   WHERE id = v_payment.booking_id
     AND status = 'CONFIRMED';

  SELECT speaker_id INTO v_speaker
    FROM public.bookings
   WHERE id = v_payment.booking_id;

  -- The payout obligation. PENDING until the event is delivered; the trigger
  -- below moves it on. bank_snapshot freezes where the money should go, so a
  -- later edit by the speaker cannot rewrite history. A speaker with no
  -- banking details still gets a payout row — the client's money is never
  -- blocked on the speaker's admin; the row simply is not payable.
  INSERT INTO public.payouts (
    speaker_id, booking_id, payment_id, amount_cents, status, bank_snapshot
  )
  VALUES (
    v_speaker,
    v_payment.booking_id,
    v_payment.id,
    v_payment.speaker_amount_cents,
    'PENDING',
    (SELECT to_jsonb(d) - 'created_at' - 'updated_at'
       FROM public.speaker_payout_details d
      WHERE d.speaker_id = v_speaker)
  )
  ON CONFLICT (payment_id) DO NOTHING;

  RETURN jsonb_build_object('applied', true);
END;
$$;

-- Service role only. Matches 20260907182321, which revoked EXECUTE on every
-- function that had been unintentionally callable as a PostgREST RPC.
REVOKE ALL ON FUNCTION public.record_successful_payment(UUID, TEXT, UUID, BIGINT)
  FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- Payout release — COMPLETED starts a 7 day hold
-- ------------------------------------------------------------
-- A delivered event does not make the payout immediately payable. The hold is
-- a dispute window: if the client raises a problem, an admin can move the
-- payout to ON_HOLD before any money has left the business.

CREATE OR REPLACE FUNCTION public.release_payout_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status IS DISTINCT FROM 'COMPLETED' THEN
    UPDATE public.payouts
       SET status = 'DUE',
           available_at = NOW() + INTERVAL '7 days'
     WHERE booking_id = NEW.id
       AND status = 'PENDING';
  END IF;

  -- A cancelled booking cannot owe a speaker anything. The refund path
  -- handles returning the client's money; this just closes the obligation.
  IF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' THEN
    UPDATE public.payouts
       SET status = 'CANCELLED'
     WHERE booking_id = NEW.id
       AND status IN ('PENDING', 'DUE');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_payout_on_completion ON public.bookings;
CREATE TRIGGER release_payout_on_completion
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.release_payout_on_completion();

REVOKE ALL ON FUNCTION public.release_payout_on_completion() FROM PUBLIC, anon, authenticated;


-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
-- bookings is already published (20260813090000), so the CONFIRMED -> PAID
-- flip reaches the client's open tab for free via useRealtimeBookingStatus.
-- Publishing payments additionally lets the checkout page react to a FAILED
-- payment without polling.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
END
$$;
