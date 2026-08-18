-- Clients could only SELECT a speaker's hospitality_riders row once a
-- bookings row for that exact client+speaker pair already existed — circular,
-- since the rider is meant to be reviewed and agreed to *during* booking
-- creation (see BookingForm's hospitality agreement step). On a client's
-- first-ever attempt to book a given speaker, RLS silently blocked the read,
-- the client-side .single() call turned the resulting 0 rows into an error,
-- and that error was discarded — so BookingForm fell back to "no rider
-- configured" even when the speaker had real hospitality requirements set.
--
-- Mirrors the existing "Anyone authenticated can view active speakers"
-- policy on speaker_profiles (20260309221803_new-migration.sql) — hospitality
-- rider content isn't sensitive, it's meant to be disclosed to any client
-- considering a booking, the same way the speaker's profile itself is.
DROP POLICY IF EXISTS "Clients can view rider if they have a booking" ON hospitality_riders;

CREATE POLICY "Authenticated users can view rider for active speakers"
  ON hospitality_riders FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM speaker_profiles sp
      WHERE sp.id = hospitality_riders.speaker_id AND sp.status = 'ACTIVE'
    )
  );
