-- ============================================================
-- Security & correctness fixes
-- ============================================================

-- Fix 1: Read role from raw_app_meta_data instead of raw_user_meta_data.
-- raw_user_meta_data is user-controlled and can be set by anyone registering
-- directly via the Supabase Auth API. raw_app_meta_data is only writable by
-- the service role, so it is safe to use for role assignment.
-- The ON CONFLICT clause makes the trigger idempotent — our server action
-- also upserts the profile immediately after, so there is no conflict in practice.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'role', 'CLIENT')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Drop the duplicate trigger that fired handle_updated_at() twice
-- on every UPDATE to hospitality_riders, wasting one function call per row.
DROP TRIGGER IF EXISTS set_hospitality_riders_updated_at2 ON hospitality_riders;

-- Fix 3: Replace COUNT(*)+1 booking number generation with a sequence.
-- The original implementation had a race condition: two concurrent inserts
-- could read the same COUNT and receive duplicate booking numbers.
-- A sequence is atomic and guaranteed unique under any concurrency.
CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_number :=
    'NXT-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('booking_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
