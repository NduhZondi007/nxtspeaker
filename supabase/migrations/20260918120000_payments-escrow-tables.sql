-- ============================================================
-- Escrow payments — tables
-- ============================================================
-- NxtSpeaker collects 100% of a booking's fee into its own Yoco merchant
-- account when the speaker accepts, retains a 15% commission, and owes the
-- speaker the remaining 85% once the event is delivered.
--
-- Yoco exposes NO transfer, split or payout API — it settles only to the
-- merchant's own bank account. Nothing in this schema moves money to a
-- speaker. `payouts` records an OBLIGATION that an admin settles by EFT
-- outside the system and then records back into it. That is a deliberate
-- design constraint, not an omission.
--
-- All amounts here are integer CENTS (BIGINT):
--   * Yoco's API speaks cents, so the value we send, store and compare
--     against the webhook is the same integer — the amount re-verification
--     in the webhook handler is an exact integer comparison.
--   * bookings.quoted_fee_zar is NUMERIC(12,2), which PostgREST serialises
--     as a *string*; once that becomes a JS float the 15/85 split stops
--     being provably exact.
--
-- bookings.quoted_fee_zar is deliberately NOT migrated. It is the contract
-- price, pinned immutable by enforce_booking_update_rules(). Cents are
-- derived from it once, at checkout creation, and snapshotted onto the
-- payment row. From that moment the payment row is the financial record.
-- ============================================================


-- ------------------------------------------------------------
-- 1. webhook_events — provider event log and the dedupe primitive
-- ------------------------------------------------------------
-- Created first because payments references it.
--
-- Yoco retries a failed delivery 8 times with escalating backoff, so the same
-- event WILL arrive more than once. Dedupe has to live in the database: a
-- serverless function has no memory shared across invocations.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           TEXT NOT NULL DEFAULT 'yoco' CHECK (provider IN ('yoco')),
  -- The `webhook-id` header. Unique per event, stable across redeliveries.
  provider_event_id  TEXT NOT NULL,
  event_type         TEXT,
  payload            JSONB NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NULL = accepted but not yet applied. A row stuck here means a handler
  -- crashed mid-processing and the event should be re-applied on redelivery.
  processed_at       TIMESTAMPTZ,
  processing_error   TEXT,
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
  ON public.webhook_events (received_at) WHERE processed_at IS NULL;


-- ------------------------------------------------------------
-- 2. payments — one row per checkout attempt
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  provider                TEXT NOT NULL DEFAULT 'yoco' CHECK (provider IN ('yoco')),

  -- Provider identifiers
  provider_checkout_id    TEXT UNIQUE,   -- checkout.id; NULL until Yoco responds
  provider_payment_id     TEXT,          -- checkout.paymentId; NULL until completed
  processing_mode         TEXT CHECK (processing_mode IN ('live', 'test')),
  redirect_url            TEXT,

  -- The row's own identity is the idempotency key sent to Yoco. Deriving it
  -- from the BOOKING would be wrong: after a genuinely failed payment the
  -- client must retry, and reusing the key returns 409/422 from Yoco forever.
  -- "Only one attempt in flight per booking" is enforced by the partial
  -- unique index below instead, which gives both properties without conflict.
  idempotency_key         TEXT NOT NULL UNIQUE,

  -- Money, in cents
  currency                TEXT NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  gross_amount_cents      BIGINT  NOT NULL CHECK (gross_amount_cents > 0),
  commission_rate_bps     INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 0 AND 10000),
  commission_amount_cents BIGINT  NOT NULL CHECK (commission_amount_cents >= 0),
  speaker_amount_cents    BIGINT  NOT NULL CHECK (speaker_amount_cents >= 0),
  -- Yoco's ~2.95% + VAT. The platform absorbs this out of its own commission,
  -- so it never affects speaker_amount_cents — it is a reporting figure only,
  -- backfilled from Yoco settlement data.
  processing_fee_cents    BIGINT  NOT NULL DEFAULT 0 CHECK (processing_fee_cents >= 0),
  refunded_amount_cents   BIGINT  NOT NULL DEFAULT 0 CHECK (refunded_amount_cents >= 0),

  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
    'CREATED',      -- row exists, Yoco not yet called
    'PENDING',      -- checkout open at Yoco
    'SUCCEEDED',    -- webhook verified, money received
    'FAILED',
    'CANCELLED',    -- abandoned or swept
    'REFUNDED',
    'NEEDS_REVIEW'  -- e.g. provider amount != our amount; never auto-advances
  )),
  failure_reason          TEXT,
  succeeded_at            TIMESTAMPTZ,
  failed_at               TIMESTAMPTZ,
  refunded_at             TIMESTAMPTZ,
  last_webhook_event_id   UUID REFERENCES public.webhook_events(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The split must reconstitute the gross exactly. The application derives
  -- the speaker's share by subtraction so this holds by construction; the
  -- constraint stops a hand-written SQL fix from ever breaking it.
  CONSTRAINT payments_split_balances
    CHECK (commission_amount_cents + speaker_amount_cents = gross_amount_cents),
  CONSTRAINT payments_refund_within_gross
    CHECK (refunded_amount_cents <= gross_amount_cents)
);

CREATE INDEX IF NOT EXISTS idx_payments_booking  ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status   ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_checkout ON public.payments(provider_checkout_id);

-- At most one OPEN attempt per booking: a double-tap on "Pay now" cannot
-- open two Yoco checkouts for the same event. The resulting 23505 is the
-- signal to resume the existing attempt, not an error to surface.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_open_per_booking
  ON public.payments(booking_id) WHERE status IN ('CREATED', 'PENDING');

-- At most one CAPTURED payment per booking: the escrow guarantee. A booking
-- can never be paid twice, however many webhooks arrive.
CREATE UNIQUE INDEX IF NOT EXISTS payments_one_success_per_booking
  ON public.payments(booking_id) WHERE status IN ('SUCCEEDED', 'REFUNDED');


-- ------------------------------------------------------------
-- 3. payouts — what NxtSpeaker owes a speaker
-- ------------------------------------------------------------
-- Settled by EFT from the business bank account. There is no API call behind
-- any of this; the app computes, queues and records.

CREATE TABLE IF NOT EXISTS public.payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id      UUID NOT NULL REFERENCES public.speaker_profiles(id),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id),
  payment_id      UUID NOT NULL UNIQUE REFERENCES public.payments(id),
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',    -- client has paid, event not yet delivered
    'DUE',        -- event COMPLETED and the hold has elapsed
    'PAID',
    'ON_HOLD',    -- dispute, no-show, missing bank details
    'CANCELLED'   -- booking refunded before delivery
  )),
  -- Set when the booking completes: COMPLETED + 7 days. Until then the payout
  -- is visible to the speaker but not payable, giving a dispute window.
  available_at    TIMESTAMPTZ,
  eft_reference   TEXT,
  -- Bank details as at the moment of payment, so a later edit by the speaker
  -- cannot rewrite the record of where money was actually sent.
  bank_snapshot   JSONB,
  notes           TEXT,
  marked_paid_by  UUID REFERENCES public.profiles(id),
  marked_paid_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A payout cannot be marked PAID without an auditable who / when / reference.
  -- The payout leg is manual, which concentrates fraud risk on a single admin
  -- account; making the audit trail a database constraint rather than a
  -- convention is the cheapest available control.
  CONSTRAINT payouts_paid_requires_audit CHECK (
    status <> 'PAID' OR (
      marked_paid_by IS NOT NULL
      AND marked_paid_at IS NOT NULL
      AND eft_reference IS NOT NULL
      AND length(btrim(eft_reference)) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_payouts_speaker ON public.payouts(speaker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status  ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_due     ON public.payouts(available_at)
  WHERE status IN ('PENDING', 'DUE');


-- ------------------------------------------------------------
-- 4. speaker_payout_details — bank details
-- ------------------------------------------------------------
-- A SEPARATE TABLE, not columns on speaker_profiles. This is a security
-- decision, not an aesthetic one:
--
-- speaker_profiles carries the policy "Anyone authenticated can view active
-- speakers", and the codebase reads it with select("*") in discovery, booking
-- detail and admin surfaces. A bank account number added as a column there
-- would be readable by every authenticated user on the platform the moment
-- the migration landed, and closing that would mean rewriting every select("*")
-- into a column allowlist.
--
-- A separate table simply has no public-read policy.

CREATE TABLE IF NOT EXISTS public.speaker_payout_details (
  speaker_id        UUID PRIMARY KEY REFERENCES public.speaker_profiles(id) ON DELETE CASCADE,
  account_holder    TEXT NOT NULL,
  bank_name         TEXT NOT NULL,
  account_number    TEXT NOT NULL,
  branch_code       TEXT NOT NULL,
  account_type      TEXT NOT NULL CHECK (account_type IN ('CHEQUE', 'SAVINGS', 'TRANSMISSION')),
  tax_number        TEXT,
  is_vat_registered BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ------------------------------------------------------------
-- 5. updated_at triggers — reuse the existing shared function
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS set_payments_updated_at ON public.payments;
CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_payouts_updated_at ON public.payouts;
CREATE TRIGGER set_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_speaker_payout_details_updated_at ON public.speaker_payout_details;
CREATE TRIGGER set_speaker_payout_details_updated_at
  BEFORE UPDATE ON public.speaker_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
