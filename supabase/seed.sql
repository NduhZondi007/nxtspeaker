-- ============================================================
-- NxtSpeaker — Seed Data
-- Run AFTER schema.sql
-- Note: Auth users must be created via Supabase Dashboard or Auth API first.
-- Replace the UUIDs below with real auth.users UUIDs after creation.
-- ============================================================

-- ============================================================
-- STEP 1: Insert profiles for speakers
-- (These UUIDs must match auth.users IDs — replace after creating users)
-- ============================================================

-- Speaker 1: Naledi Dlamini
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('11111111-0000-0000-0000-000000000001', 'SPEAKER', 'Naledi Dlamini', 'naledi@nxtspeaker.co.za', '+27 82 111 0001', NULL);

-- Speaker 2: Dr. Sipho Ndlovu
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('11111111-0000-0000-0000-000000000002', 'SPEAKER', 'Dr. Sipho Ndlovu', 'sipho@nxtspeaker.co.za', '+27 82 111 0002', NULL);

-- Speaker 3: Zanele Mokoena
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('11111111-0000-0000-0000-000000000003', 'SPEAKER', 'Zanele Mokoena', 'zanele@nxtspeaker.co.za', '+27 82 111 0003', NULL);

-- Speaker 4: Marcus van der Berg
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('11111111-0000-0000-0000-000000000004', 'SPEAKER', 'Marcus van der Berg', 'marcus@nxtspeaker.co.za', '+27 82 111 0004', NULL);

-- Speaker 5: Dr. Amara Osei
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('11111111-0000-0000-0000-000000000005', 'SPEAKER', 'Dr. Amara Osei', 'amara@nxtspeaker.co.za', '+27 82 111 0005', NULL);

-- Client 1: Nomsa Khumalo
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('22222222-0000-0000-0000-000000000001', 'CLIENT', 'Nomsa Khumalo', 'nomsa@discovery.co.za', '+27 83 222 0001', 'Discovery Holdings');

-- Client 2: Ruan Steyn
INSERT INTO profiles (id, role, full_name, email, phone, company) VALUES
  ('22222222-0000-0000-0000-000000000002', 'CLIENT', 'Ruan Steyn', 'ruan@standardbank.co.za', '+27 83 222 0002', 'Standard Bank');

-- ============================================================
-- STEP 2: Insert speaker_profiles
-- ============================================================

INSERT INTO speaker_profiles (id, user_id, title, bio, expertise, languages, location, speaking_fee_zar, level, available, virtual_available, hybrid_available, tags, avg_rating, total_events, status) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'Leadership & African Business Strategy',
  'Naledi Dlamini is one of South Africa''s most sought-after leadership strategists, drawing on 20 years of executive coaching and boardroom advisory experience across the continent. Her talks blend rich cultural insight with practical frameworks that have transformed leadership teams at major JSE-listed companies.',
  ARRAY['Leadership', 'African Business', 'Strategy', 'Executive Coaching', 'Organisational Culture'],
  ARRAY['English', 'Zulu', 'Sotho'],
  'Johannesburg, South Africa',
  85000.00,
  4,
  TRUE,
  TRUE,
  TRUE,
  ARRAY['TEDx', 'Forbes Africa 50 Women', 'Davos Panellist'],
  4.92,
  47,
  'ACTIVE'
),
(
  'aaaaaaaa-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000002',
  'AI & Digital Transformation for African Enterprises',
  'Dr. Sipho Ndlovu holds a PhD in Computer Science from UCT and serves as Chief AI Officer at one of Africa''s fastest-growing tech companies. He demystifies artificial intelligence for business leaders, showing how African organisations can leapfrog traditional development paths through strategic AI adoption.',
  ARRAY['Artificial Intelligence', 'Digital Transformation', 'Machine Learning', 'Tech Strategy', 'Innovation'],
  ARRAY['English', 'Zulu'],
  'Cape Town, South Africa',
  120000.00,
  5,
  TRUE,
  TRUE,
  TRUE,
  ARRAY['TEDx', 'MIT Technology Review', 'Forbes 30 Under 30 Africa'],
  4.97,
  63,
  'ACTIVE'
),
(
  'aaaaaaaa-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000003',
  'Sustainability & ESG for African Markets',
  'Zanele Mokoena advises multinationals and government bodies on embedding sustainability into African business models. She chairs the Green Economy Alliance of Southern Africa and has led ESG transformations at a combined portfolio of over R500 billion in assets.',
  ARRAY['Sustainability', 'ESG', 'Green Economy', 'Climate Finance', 'Corporate Governance'],
  ARRAY['English', 'Afrikaans', 'Xhosa'],
  'Durban, South Africa',
  45000.00,
  3,
  TRUE,
  FALSE,
  TRUE,
  ARRAY['UN Global Compact', 'B Corp Certified', 'World Economic Forum Young Global Leader'],
  4.83,
  31,
  'ACTIVE'
),
(
  'aaaaaaaa-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000004',
  'Innovation & the Future of Work',
  'Marcus van der Berg is a serial entrepreneur and innovation consultant who has helped over 200 companies across Africa and Europe prepare their workforces for the digital future. His high-energy presentations combine design thinking, behavioural economics, and real-world case studies.',
  ARRAY['Innovation', 'Future of Work', 'Design Thinking', 'Entrepreneurship', 'Change Management'],
  ARRAY['English', 'Afrikaans'],
  'Pretoria, South Africa',
  35000.00,
  2,
  TRUE,
  TRUE,
  FALSE,
  ARRAY['Disrupt Africa Top 40', 'GSMA Mobile Innovation Award'],
  4.78,
  22,
  'ACTIVE'
),
(
  'aaaaaaaa-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000005',
  'Neuroscience of High Performance',
  'Dr. Amara Osei is a clinical neuroscientist and performance psychologist whose research at the University of Ghana and Oxford has been cited in over 80 peer-reviewed publications. She translates cutting-edge brain science into actionable strategies for elite performance, resilience, and peak mental fitness.',
  ARRAY['Neuroscience', 'High Performance', 'Mental Fitness', 'Resilience', 'Peak Performance'],
  ARRAY['English', 'French', 'Twi'],
  'Accra, Ghana',
  60000.00,
  4,
  TRUE,
  TRUE,
  TRUE,
  ARRAY['TEDx', 'Oxford Research Fellow', 'BBC Africa Expert'],
  4.89,
  38,
  'ACTIVE'
);

-- ============================================================
-- STEP 3: Insert hospitality_riders (varied preferences)
-- ============================================================

-- Naledi: full premium rider
INSERT INTO hospitality_riders (speaker_id, water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000001',
  TRUE, TRUE, FALSE,
  ARRAY['halal'],
  'Strictly halal meals only. No pork products or alcohol in the green room.',
  TRUE, 'before',
  TRUE, 'Quiet space required 45 minutes before. No visitors or media access.',
  'Full HD projector minimum 5000 lumens, dual screens for presenter view',
  TRUE, TRUE,
  TRUE, TRUE, 'five_star',
  'Fresh flowers (no lilies). Rooibos tea available. Printed speaker notes if possible.'
);

-- Dr. Sipho: tech-forward, minimal food requirements
INSERT INTO hospitality_riders (speaker_id, water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000002',
  TRUE, FALSE, FALSE,
  ARRAY[]::TEXT[],
  NULL,
  TRUE, 'no preference',
  TRUE, 'WiFi access required in green room. Setup time needed 90 minutes before for tech demo.',
  'HDMI + USB-C adapters, 4K-capable display minimum, live internet connection for demos',
  TRUE, TRUE,
  TRUE, TRUE, 'five_star',
  'Dedicated tech support person on standby during presentation. Backup laptop connection available.'
);

-- Zanele: plant-based, local travel
INSERT INTO hospitality_riders (speaker_id, water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000003',
  TRUE, TRUE, TRUE,
  ARRAY['vegan', 'gluten-free'],
  'Fully plant-based and gluten-free. Please verify all catering with supplier.',
  TRUE, 'after',
  TRUE, '20 minutes before is sufficient. Natural lighting preferred.',
  'Standard AV setup sufficient. Wireless lapel mic preferred over handheld.',
  TRUE, FALSE,
  FALSE, FALSE, 'four_star',
  'Sustainable/eco-friendly catering preferred. Recyclable cups and cutlery only.'
);

-- Marcus: casual, flexible
INSERT INTO hospitality_riders (speaker_id, water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000004',
  TRUE, FALSE, FALSE,
  ARRAY[]::TEXT[],
  'No dietary restrictions. Happy with any catering.',
  FALSE, 'no preference',
  FALSE, NULL,
  'Standard projector and clicker. Good audio system important — I move around a lot.',
  TRUE, FALSE,
  FALSE, FALSE, 'three_star',
  'Energy! Good venue acoustics are more important than green room setup.'
);

-- Dr. Amara: wellness-focused
INSERT INTO hospitality_riders (speaker_id, water_still, water_sparkling, water_room_temp, dietary_restrictions, dietary_notes, meal_required, meal_timing, green_room_required, green_room_notes, av_requirements, presentation_clicker, confidence_monitor, flights_required, accommodation_required, accommodation_standard, additional_requests) VALUES
(
  'aaaaaaaa-0000-0000-0000-000000000005',
  TRUE, FALSE, TRUE,
  ARRAY['vegetarian'],
  'Vegetarian. No red meat. Prefer whole foods and fresh fruit.',
  TRUE, 'before',
  TRUE, 'Quiet, calm environment. No bright overhead lighting. 30 minutes minimum.',
  'Large display screen. Wireless clicker. Confidence monitor critical for data-heavy slides.',
  TRUE, TRUE,
  TRUE, TRUE, 'four_star',
  'Room temperature kept comfortable (not too cold). Herbal teas available.'
);

-- ============================================================
-- STEP 4: Insert bookings
-- ============================================================

INSERT INTO bookings (id, client_id, speaker_id, event_name, audience_demographics, exact_location, event_organiser, associated_company, event_date, duration_minutes, event_format, estimated_audience, quoted_fee_zar, status, hospitality_rider_agreed, hospitality_agreed_at, client_notes) VALUES
(
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'Discovery Innovation Summit 2025',
  'C-suite executives, VPs, and senior managers from the financial services sector. Approximately 350 attendees across Discovery Health, Life, and Invest divisions.',
  'The Forum, 150 Rivonia Road, Sandton, Johannesburg',
  'Nomsa Khumalo',
  'Discovery Holdings',
  '2025-09-15',
  90,
  'in-person',
  350,
  120000.00,
  'CONFIRMED',
  TRUE,
  NOW() - INTERVAL '5 days',
  'Please arrive by 08:00. Keynote is at 09:30. Full AV run-through at 08:30.'
),
(
  'bbbbbbbb-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Women in Leadership Breakfast',
  'Senior female executives and emerging leaders from JSE-listed companies. 120 attendees from banking, retail, and mining sectors.',
  'Saxon Hotel, 36 Saxon Road, Sandhurst, Johannesburg',
  'Nomsa Khumalo',
  'Discovery Holdings',
  '2025-11-20',
  60,
  'in-person',
  120,
  85000.00,
  'PENDING',
  TRUE,
  NOW() - INTERVAL '1 day',
  'Breakfast event. Please plan for morning energy. Q&A session to follow keynote.'
),
(
  'bbbbbbbb-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000005',
  'Standard Bank Performance Culture Series',
  'Branch managers, regional directors, and HR business partners. 200 middle-to-senior management across Standard Bank Africa footprint.',
  'Standard Bank Rosebank Campus, 3 Merchant Place, Johannesburg',
  'Ruan Steyn',
  'Standard Bank',
  '2025-07-10',
  75,
  'hybrid',
  200,
  60000.00,
  'COMPLETED',
  TRUE,
  NOW() - INTERVAL '30 days',
  'Hybrid event. 100 in-person, 100 virtual via Teams. Recording approved.'
);

-- ============================================================
-- STEP 5: Insert reviews (for completed bookings)
-- ============================================================

INSERT INTO reviews (booking_id, reviewer_id, speaker_id, rating, headline, body, verified) VALUES
(
  'bbbbbbbb-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000005',
  5,
  'Transformative session — our teams are still talking about it',
  'Dr. Amara delivered an extraordinary keynote that connected neuroscience directly to our leadership challenges. The practical tools she shared for managing cognitive load under pressure have already been adopted by three of our regional teams. An absolute 5-star experience from engagement to execution.',
  TRUE
);

-- Additional reviews for seed speakers (from past bookings not in this seed set)
INSERT INTO reviews (booking_id, reviewer_id, speaker_id, rating, headline, body, verified)
SELECT
  'bbbbbbbb-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000002',
  5,
  'Best tech keynote we have ever hosted',
  'Dr. Sipho made AI genuinely accessible for our entire executive team. The demos were flawless and the Q&A ran 30 minutes over because no one wanted to stop. Bookings already in progress for our 2026 series.',
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM reviews WHERE booking_id = 'bbbbbbbb-0000-0000-0000-000000000001'
);
