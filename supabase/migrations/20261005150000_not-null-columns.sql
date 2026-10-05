-- ============================================================
-- Columns that always have a value are now NOT NULL
-- ============================================================
-- Every column below has a DEFAULT but no NOT NULL, while the app's types
-- (src/lib/types/database.ts) treat it as always present. A NULL that slipped
-- in through PostgREST or an old row crashed the UI — e.g. the admin speakers
-- list called speaker.expertise.slice() on NULL. Backfill, then enforce, so
-- the types are true.
--
-- Arrays are backfilled with an empty array, not their DEFAULT: a NULL
-- `languages` must not silently become '{English}' — that would invent data
-- and could make an incomplete speaker listable.
-- ============================================================

UPDATE public.speaker_profiles SET expertise   = '{}'  WHERE expertise   IS NULL;
UPDATE public.speaker_profiles SET languages   = '{}'  WHERE languages   IS NULL;
UPDATE public.speaker_profiles SET tags        = '{}'  WHERE tags        IS NULL;
UPDATE public.speaker_profiles SET photo_urls  = '{}'  WHERE photo_urls  IS NULL;
UPDATE public.speaker_profiles SET available         = true    WHERE available         IS NULL;
UPDATE public.speaker_profiles SET virtual_available = true    WHERE virtual_available IS NULL;
UPDATE public.speaker_profiles SET hybrid_available  = false   WHERE hybrid_available  IS NULL;
UPDATE public.speaker_profiles SET level        = 1       WHERE level        IS NULL;
UPDATE public.speaker_profiles SET total_events = 0       WHERE total_events IS NULL;
UPDATE public.speaker_profiles SET avg_rating   = 0       WHERE avg_rating   IS NULL;
UPDATE public.speaker_profiles SET fee_currency = 'ZAR'   WHERE fee_currency IS NULL;
UPDATE public.speaker_profiles SET created_at   = NOW()   WHERE created_at   IS NULL;
UPDATE public.speaker_profiles SET updated_at   = NOW()   WHERE updated_at   IS NULL;
-- A speaker with no status is treated as not yet reviewed, never as ACTIVE.
UPDATE public.speaker_profiles SET status = 'PENDING_REVIEW' WHERE status IS NULL;

ALTER TABLE public.speaker_profiles
  ALTER COLUMN expertise         SET NOT NULL,
  ALTER COLUMN languages         SET NOT NULL,
  ALTER COLUMN tags              SET NOT NULL,
  ALTER COLUMN photo_urls        SET NOT NULL,
  ALTER COLUMN available         SET NOT NULL,
  ALTER COLUMN virtual_available SET NOT NULL,
  ALTER COLUMN hybrid_available  SET NOT NULL,
  ALTER COLUMN level             SET NOT NULL,
  ALTER COLUMN total_events      SET NOT NULL,
  ALTER COLUMN avg_rating        SET NOT NULL,
  ALTER COLUMN fee_currency      SET NOT NULL,
  ALTER COLUMN status            SET NOT NULL,
  ALTER COLUMN created_at        SET NOT NULL,
  ALTER COLUMN updated_at        SET NOT NULL;

UPDATE public.bookings SET duration_minutes         = 60      WHERE duration_minutes         IS NULL;
UPDATE public.bookings SET hospitality_rider_agreed = false   WHERE hospitality_rider_agreed IS NULL;
UPDATE public.bookings SET created_at               = NOW()   WHERE created_at               IS NULL;
UPDATE public.bookings SET status                   = 'PENDING' WHERE status                 IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN status                   SET NOT NULL,
  ALTER COLUMN duration_minutes         SET NOT NULL,
  ALTER COLUMN hospitality_rider_agreed SET NOT NULL,
  ALTER COLUMN created_at               SET NOT NULL;

UPDATE public.profiles SET created_at = NOW() WHERE created_at IS NULL;
UPDATE public.profiles SET updated_at = NOW() WHERE updated_at IS NULL;
ALTER TABLE public.profiles
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

UPDATE public.messages SET created_at = NOW() WHERE created_at IS NULL;
ALTER TABLE public.messages ALTER COLUMN created_at SET NOT NULL;

UPDATE public.reviews SET verified = true WHERE verified IS NULL;
ALTER TABLE public.reviews ALTER COLUMN verified SET NOT NULL;
