-- ============================================================
-- NxtSpeaker — Complete Supabase Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- 1. profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('SPEAKER', 'CLIENT', 'ADMIN')) DEFAULT 'CLIENT',
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. speaker_profiles
CREATE TABLE IF NOT EXISTS speaker_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Professional Speaker',
  bio TEXT,
  expertise TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{English}',
  location TEXT,
  speaking_fee_zar NUMERIC(12,2) NOT NULL DEFAULT 0,
  fee_currency TEXT DEFAULT 'ZAR',
  level INTEGER CHECK (level BETWEEN 1 AND 5) DEFAULT 1,
  available BOOLEAN DEFAULT TRUE,
  virtual_available BOOLEAN DEFAULT TRUE,
  hybrid_available BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  total_events INTEGER DEFAULT 0,
  avg_rating NUMERIC(3,2) DEFAULT 0.00,
  profile_video_url TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. hospitality_riders
CREATE TABLE IF NOT EXISTS hospitality_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID UNIQUE NOT NULL REFERENCES speaker_profiles(id) ON DELETE CASCADE,
  -- Water
  water_still BOOLEAN DEFAULT TRUE,
  water_sparkling BOOLEAN DEFAULT FALSE,
  water_room_temp BOOLEAN DEFAULT FALSE,
  -- Catering
  dietary_restrictions TEXT[] DEFAULT '{}',
  dietary_notes TEXT,
  meal_required BOOLEAN DEFAULT TRUE,
  meal_timing TEXT DEFAULT 'no preference',
  -- Green Room
  green_room_required BOOLEAN DEFAULT TRUE,
  green_room_notes TEXT,
  -- Technical
  av_requirements TEXT,
  presentation_clicker BOOLEAN DEFAULT TRUE,
  confidence_monitor BOOLEAN DEFAULT FALSE,
  -- Travel & Accommodation
  flights_required BOOLEAN DEFAULT FALSE,
  accommodation_required BOOLEAN DEFAULT FALSE,
  accommodation_standard TEXT DEFAULT 'four_star' CHECK (accommodation_standard IN ('three_star', 'four_star', 'five_star')),
  -- Additional
  additional_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL DEFAULT '',
  client_id UUID NOT NULL REFERENCES profiles(id),
  speaker_id UUID NOT NULL REFERENCES speaker_profiles(id),
  -- Mandatory booking fields
  event_name TEXT NOT NULL,
  audience_demographics TEXT NOT NULL,
  exact_location TEXT NOT NULL,
  event_organiser TEXT NOT NULL,
  associated_company TEXT NOT NULL,
  -- Event details
  event_date DATE NOT NULL,
  event_end_date DATE,
  duration_minutes INTEGER DEFAULT 60,
  event_format TEXT NOT NULL CHECK (event_format IN ('in-person', 'virtual', 'hybrid')),
  estimated_audience INTEGER,
  -- Financials (always ZAR)
  quoted_fee_zar NUMERIC(12,2) NOT NULL,
  deposit_amount_zar NUMERIC(12,2),
  -- Status
  status TEXT DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'CONFIRMED', 'DEPOSIT_PAID', 'COMPLETED', 'CANCELLED', 'DECLINED'
  )),
  -- Hospitality
  hospitality_rider_agreed BOOLEAN DEFAULT FALSE,
  hospitality_agreed_at TIMESTAMPTZ,
  hospitality_notes TEXT,
  -- Metadata
  client_notes TEXT,
  internal_notes TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  speaker_id UUID NOT NULL REFERENCES speaker_profiles(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  headline TEXT,
  body TEXT,
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_speaker ON bookings(speaker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_speaker_profiles_available ON speaker_profiles(available, status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at to all tables
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_speaker_profiles_updated_at
  BEFORE UPDATE ON speaker_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_hospitality_riders_updated_at
  BEFORE UPDATE ON hospitality_riders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_hospitality_riders_updated_at2
  BEFORE UPDATE ON hospitality_riders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-generate booking number: NXT-YYYY-NNNNN
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num
  FROM bookings
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  new_number := 'NXT-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  NEW.booking_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_booking_number
  BEFORE INSERT ON bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_number();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-create speaker_profiles + hospitality_riders when role = SPEAKER
CREATE OR REPLACE FUNCTION handle_new_speaker_profile()
RETURNS TRIGGER AS $$
DECLARE
  new_speaker_id UUID;
BEGIN
  IF NEW.role = 'SPEAKER' THEN
    INSERT INTO speaker_profiles (user_id, title, speaking_fee_zar)
    VALUES (NEW.id, 'Professional Speaker', 0)
    RETURNING id INTO new_speaker_id;

    INSERT INTO hospitality_riders (speaker_id)
    VALUES (new_speaker_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_speaker_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_speaker_profile();

-- Update speaker avg_rating and total_events when review inserted
CREATE OR REPLACE FUNCTION update_speaker_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE speaker_profiles
  SET
    avg_rating = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM reviews
      WHERE speaker_id = NEW.speaker_id
    ),
    total_events = (
      SELECT COUNT(*)
      FROM reviews
      WHERE speaker_id = NEW.speaker_id
    )
  WHERE id = NEW.speaker_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_speaker_rating();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitality_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- ---- profiles ----
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can view speaker profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM speaker_profiles sp WHERE sp.user_id = profiles.id AND sp.status = 'ACTIVE'
      )
    )
  );

-- ---- speaker_profiles ----
CREATE POLICY "Anyone authenticated can view active speakers"
  ON speaker_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'ACTIVE');

CREATE POLICY "Speakers can update own profile"
  ON speaker_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.id = speaker_profiles.user_id
    )
  );

CREATE POLICY "Only admins can delete speaker profiles"
  ON speaker_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

CREATE POLICY "Speakers can insert own profile"
  ON speaker_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.id = user_id
    )
  );

-- ---- hospitality_riders ----
CREATE POLICY "Speaker can manage own rider"
  ON hospitality_riders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM speaker_profiles sp
      JOIN profiles p ON p.id = sp.user_id
      WHERE sp.id = hospitality_riders.speaker_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Clients can view rider if they have a booking"
  ON hospitality_riders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN profiles p ON p.id = auth.uid()
      WHERE b.speaker_id = hospitality_riders.speaker_id
        AND b.client_id = auth.uid()
        AND p.role = 'CLIENT'
    )
  );

-- ---- bookings ----
CREATE POLICY "Clients view own bookings"
  ON bookings FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Speakers view their booking requests"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM speaker_profiles sp
      WHERE sp.id = bookings.speaker_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    client_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'CLIENT'
    )
  );

CREATE POLICY "Clients and speakers can update their bookings"
  ON bookings FOR UPDATE
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM speaker_profiles sp
      WHERE sp.id = bookings.speaker_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN'
    )
  );

-- ---- messages ----
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id AND (
        b.client_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM speaker_profiles sp
          WHERE sp.id = b.speaker_id AND sp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Participants can send messages when booking is not pending"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
        AND b.status NOT IN ('PENDING', 'DECLINED')
        AND (
          b.client_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM speaker_profiles sp
            WHERE sp.id = b.speaker_id AND sp.user_id = auth.uid()
          )
        )
    )
  );

-- ---- reviews ----
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Clients can submit reviews for completed bookings"
  ON reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = reviews.booking_id
        AND b.client_id = auth.uid()
        AND b.status = 'COMPLETED'
        AND EXISTS (
          SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'CLIENT'
        )
    )
  );
