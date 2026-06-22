-- Change the default status for new speaker profiles from ACTIVE to PENDING_REVIEW.
-- New speakers are now invisible to clients until an admin activates them.
-- The PENDING_REVIEW value already exists in the status CHECK constraint;
-- this migration only changes the column DEFAULT — no data migration needed.

ALTER TABLE public.speaker_profiles
  ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW';
