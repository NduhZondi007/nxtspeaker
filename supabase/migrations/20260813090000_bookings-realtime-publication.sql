-- Ensure the bookings table streams UPDATE/INSERT/DELETE events over Supabase
-- Realtime. The client app now subscribes to booking status changes
-- (useRealtimeBookingStatus) so organisers learn live when a speaker
-- accepts/declines a request instead of having to manually reload.
--
-- Guarded with an existence check because ALTER PUBLICATION ... ADD TABLE
-- errors if the table is already a publication member (e.g. on projects
-- where supabase_realtime already covers all public tables by default).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
