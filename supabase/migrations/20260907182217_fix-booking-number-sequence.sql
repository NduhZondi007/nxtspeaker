-- ============================================================
-- Fix: booking creation failing with a duplicate booking_number
-- ============================================================
-- Discovered while verifying 20260907182050 against the live database: any
-- attempt to create a booking failed with
--   duplicate key value violates unique constraint "bookings_booking_number_key"
--
-- 20260524000001 replaced the racy COUNT(*)+1 booking-number generator with
-- `booking_number_seq`, but created that sequence with START 1 and never
-- advanced it past the numbers the old implementation had already issued.
-- Three bookings already held NXT-2026-00001..00003 while the sequence sat at
-- 1, so nextval() handed back 2, then 3 — both already taken. Every new
-- booking was rejected until the sequence happened to climb past the highest
-- existing number.
--
-- This is exactly the failure the sequence was introduced to prevent, moved
-- from a race to an off-by-N: the migration changed the generator without
-- backfilling the state the old generator had produced.
-- ============================================================

-- 1. Advance the sequence past the highest number ever issued.
SELECT setval(
  'public.booking_number_seq',
  GREATEST(
    (SELECT COALESCE(MAX(substring(booking_number from '(\d+)$')::bigint), 0)
       FROM public.bookings
      WHERE booking_number ~ '^NXT-\d{4}-\d+$'),
    1
  ),
  true
);

-- 2. Make a collision non-fatal in future: retry rather than reject the
--    insert. SECURITY DEFINER because under RLS the inserting client can only
--    see their own bookings, so an invoker-rights probe would miss a clash
--    with someone else's row and re-raise the same unique violation. Also
--    pins search_path, which the original function lacked (lint 0011).
CREATE OR REPLACE FUNCTION public.generate_booking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate TEXT;
  attempts  INT := 0;
BEGIN
  LOOP
    candidate := 'NXT-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                 LPAD(nextval('public.booking_number_seq')::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.bookings WHERE booking_number = candidate
    );
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not allocate a unique booking number after % attempts', attempts;
    END IF;
  END LOOP;

  NEW.booking_number := candidate;
  RETURN NEW;
END;
$$;

-- Note: the sequence is global rather than per-year, so numbering continues
-- across a year boundary (NXT-2027-00006 follows NXT-2026-00005) instead of
-- restarting. Uniqueness holds either way; left as-is deliberately.
